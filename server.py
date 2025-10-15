from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image as RLImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image
from playwright.async_api import async_playwright
import io
import asyncio
import base64
import razorpay
import hmac
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# JWT settings
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 1440))

# Razorpay client
razorpay_client = razorpay.Client(auth=(os.environ.get('RAZORPAY_KEY_ID', ''), os.environ.get('RAZORPAY_KEY_SECRET', '')))

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    mobile: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    mobile: Optional[str] = None  # Mobile number for transactions
    role: str = "user"  # user or admin
    is_active: bool = True  # User account status
    free_papers_used: int = 0
    free_papers_limit: int = 1  # Changed from 5 to 1
    total_papers_generated: int = 0  # Track total including deleted
    subscription_plan: Optional[str] = None
    subscription_expiry: Optional[str] = None
    papers_limit: int = 1  # Papers limit based on plan
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class QuestionPaperGenerate(BaseModel):
    exam_type: str
    stream: Optional[str] = None
    subject: str
    topics: List[str] = []
    question_types: Dict[str, int]  # {"mcq": 10, "short_answer": 5, ...}
    paper_format: str = "standard"  # standard or custom
    marks_per_question: Optional[Dict[str, int]] = None
    total_marks: int
    duration_minutes: int
    paper_title: str
    instructions: Optional[str] = None
    language: str = "English"
    # Paper header customization
    school_name: Optional[str] = None
    exam_date: Optional[str] = None
    max_marks: Optional[int] = None
    time_allowed: Optional[str] = None

class QuestionPaper(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    exam_type: str
    subject: str
    topics: List[str]
    paper_title: str
    total_marks: int
    duration_minutes: int
    language: str
    questions: List[Dict[str, Any]]
    answer_key: List[Dict[str, Any]]
    school_name: Optional[str] = None
    exam_date: Optional[str] = None
    max_marks: Optional[int] = None
    time_allowed: Optional[str] = None
    instructions: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class QuizAttempt(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    paper_id: str
    answers: Dict[str, Any]
    score: float
    total_questions: int
    correct_answers: int
    percentage: float
    completed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SubscriptionPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    currency: str = "INR"  # Currency for the plan
    papers_limit: int  # -1 for unlimited
    duration_days: int
    features: List[str]
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SubscriptionPlanCreate(BaseModel):
    name: str
    price: float
    currency: str = "INR"
    papers_limit: int
    duration_days: int
    features: List[str]

class PaymentOrder(BaseModel):
    plan_id: str
    
class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_id: str

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_number: str = Field(default_factory=lambda: f"TXN{datetime.now().strftime('%Y%m%d')}{str(uuid.uuid4())[:8].upper()}")
    user_id: str
    user_name: str
    user_email: str
    user_mobile: str
    plan_id: str
    plan_name: str
    amount: float
    currency: str = "INR"
    payment_method: str = "Razorpay"  # Razorpay, Manual, etc.
    payment_id: Optional[str] = None  # Razorpay payment ID
    status: str = "completed"  # completed, pending, failed
    validity_start: str  # ISO format date
    validity_end: str    # ISO format date
    receipt_url: Optional[str] = None  # Path to receipt PDF
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_by: str = "user"  # user or admin

class TransactionCreate(BaseModel):
    user_id: str
    plan_id: str
    amount: float
    payment_id: Optional[str] = None
    payment_method: str = "Manual"
    notes: Optional[str] = None


# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        # Check if user is active
        if not user.get('is_active', True):
            raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact support.")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def generate_pdf_from_screenshot(paper: Dict[str, Any], include_answers: bool = False) -> bytes:
    """Generate PDF from screenshot for non-English languages (Hindi, Marathi, etc.)"""
    
    # Create HTML content
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&family=Noto+Sans+Tamil:wght@400;700&family=Noto+Sans+Telugu:wght@400;700&display=swap" rel="stylesheet">
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            body {{
                font-family: 'Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Telugu', Arial, sans-serif;
                padding: 40px;
                background: white;
                color: black;
                line-height: 1.6;
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid black;
                padding-bottom: 20px;
            }}
            .school-name {{
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 10px;
            }}
            .paper-title {{
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 8px;
            }}
            .exam-info {{
                font-size: 14px;
                margin-bottom: 15px;
            }}
            .info-box {{
                border: 1px solid black;
                padding: 15px;
                margin-bottom: 20px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }}
            .info-item {{
                font-size: 13px;
            }}
            .info-label {{
                font-weight: bold;
            }}
            .instructions {{
                margin-bottom: 20px;
                padding: 15px;
                background: #f9f9f9;
                border-left: 3px solid black;
            }}
            .instructions-title {{
                font-weight: bold;
                font-size: 15px;
                margin-bottom: 10px;
            }}
            .instruction-item {{
                margin-left: 20px;
                margin-bottom: 5px;
                font-size: 12px;
            }}
            .question {{
                margin-bottom: 25px;
                page-break-inside: avoid;
            }}
            .question-text {{
                font-size: 14px;
                margin-bottom: 10px;
                font-weight: 500;
            }}
            .option {{
                margin-left: 30px;
                margin-bottom: 8px;
                font-size: 13px;
            }}
            .answer-space {{
                margin-left: 30px;
                margin-top: 10px;
            }}
            .answer-line {{
                border-bottom: 1px solid #ccc;
                margin-bottom: 15px;
                height: 20px;
            }}
            .page-break {{
                page-break-after: always;
            }}
            .answer-key {{
                margin-top: 40px;
            }}
            .answer-key-title {{
                text-align: center;
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 20px;
                text-decoration: underline;
            }}
            .answer-item {{
                margin-bottom: 20px;
            }}
            .answer-text {{
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 5px;
            }}
            .explanation {{
                font-size: 12px;
                margin-left: 20px;
                color: #333;
                font-style: italic;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            {f'<div class="school-name">{paper.get("school_name", "")}</div>' if paper.get("school_name") else ""}
            <div class="paper-title">{paper['paper_title']}</div>
            <div class="exam-info">{paper['exam_type']} - {paper['subject']}</div>
        </div>
        
        <div class="info-box">
            <div class="info-item">
                <span class="info-label">अधिकतम अंक / Maximum Marks:</span> {paper.get('max_marks') or paper['total_marks']}
            </div>
            <div class="info-item">
                <span class="info-label">समय / Time:</span> {paper.get('time_allowed') or f"{paper['duration_minutes']} minutes"}
            </div>
            <div class="info-item">
                <span class="info-label">दिनांक / Date:</span> {paper.get('exam_date', '___________')}
            </div>
            <div class="info-item">
                <span class="info-label">भाषा / Language:</span> {paper['language']}
            </div>
        </div>
        
    """
    
    # Add instructions if present
    if paper.get('instructions'):
        instructions = paper['instructions'].split('\n')
        instructions_html = '<div class="instructions"><div class="instructions-title">सामान्य निर्देश / General Instructions:</div>'
        for inst in instructions:
            if inst.strip():
                instructions_html += f'<div class="instruction-item">• {inst.strip()}</div>'
        instructions_html += '</div>'
        html_content += instructions_html
    
    html_content += """
        
        <hr style="margin: 20px 0; border: 1px solid black;">
        
        <div class="questions">
    """
    
    # Add questions
    for idx, question in enumerate(paper['questions'], 1):
        marks = f"[{question.get('marks', '')} अंक / marks]" if question.get('marks') else ""
        html_content += f"""
        <div class="question">
            <div class="question-text">
                <strong>प्रश्न / Q.{idx}</strong> {question['question']} {marks}
            </div>
        """
        
        if question['type'] == 'mcq' and question.get('options'):
            for option in question['options']:
                html_content += f'<div class="option">{option}</div>'
        elif question['type'] == 'true_false':
            html_content += '<div class="option">(a) सत्य / True</div>'
            html_content += '<div class="option">(b) असत्य / False</div>'
        elif question['type'] in ['short_answer', 'essay']:
            lines = 6 if question['type'] == 'short_answer' else 12
            html_content += '<div class="answer-space">'
            for _ in range(lines):
                html_content += '<div class="answer-line"></div>'
            html_content += '</div>'
        
        html_content += '</div>'
    
    # Add answer key if requested
    if include_answers and paper.get('answer_key'):
        html_content += '<div class="page-break"></div>'
        html_content += '<div class="answer-key">'
        html_content += '<div class="answer-key-title">उत्तर कुंजी / ANSWER KEY</div>'
        
        for idx, answer in enumerate(paper['answer_key'], 1):
            html_content += f"""
            <div class="answer-item">
                <div class="answer-text">प्रश्न / Q.{idx} उत्तर / Answer: {answer.get('correct_answer', 'N/A')}</div>
                {f'<div class="explanation">स्पष्टीकरण / Explanation: {answer.get("explanation", "")}</div>' if answer.get('explanation') else ''}
            </div>
            """
        
        html_content += '</div>'
    
    html_content += """
        </div>
    </body>
    </html>
    """
    
    # Generate screenshot using Playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 794, 'height': 1123})  # A4 size in pixels at 96 DPI
        
        await page.set_content(html_content)
        await page.wait_for_load_state('networkidle')
        
        # Take screenshot
        screenshot_bytes = await page.screenshot(full_page=True, type='png')
        await browser.close()
    
    # Convert screenshot to PDF using simpler method
    img = Image.open(io.BytesIO(screenshot_bytes))
    
    # Convert to RGB if needed
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Save as PDF directly
    buffer = io.BytesIO()
    img.save(buffer, format='PDF', resolution=100.0)
    buffer.seek(0)
    return buffer.getvalue()

def generate_pdf(paper: Dict[str, Any], include_answers: bool = False) -> bytes:
    """Generate a professional PDF from question paper like standard board exams with multi-language support"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=50, 
        leftMargin=50, 
        topMargin=40, 
        bottomMargin=40
    )
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles with better fonts
    styles = getSampleStyleSheet()
    
    # Get language and set appropriate font
    language = paper.get('language', 'English').lower()
    
    # Use font that supports Unicode and Indian languages
    # For Hindi, Marathi and other Devanagari scripts, we use a font that supports it
    base_font = 'Helvetica'
    bold_font = 'Helvetica-Bold'
    
    # For non-English languages, ensure proper encoding
    if language in ['hindi', 'marathi', 'sanskrit']:
        # Use fonts that support Devanagari script
        # Note: Helvetica supports basic Latin only, for production use NotoSans or similar
        base_font = 'Helvetica'
        bold_font = 'Helvetica-Bold'
    
    # Title style - Board exam like
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.black,
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName=bold_font,
        encoding='utf-8'
    )
    
    # Header style
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.black,
        spaceAfter=3,
        alignment=TA_CENTER,
        fontName=base_font,
        encoding='utf-8'
    )
    
    # Info style
    info_style = ParagraphStyle(
        'InfoStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.black,
        spaceAfter=4,
        fontName=base_font,
        encoding='utf-8'
    )
    
    # Question style
    question_style = ParagraphStyle(
        'QuestionStyle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.black,
        spaceAfter=8,
        leading=16,
        fontName=base_font,
        encoding='utf-8'
    )
    
    # Option style
    option_style = ParagraphStyle(
        'OptionStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.black,
        leftIndent=30,
        spaceAfter=6,
        leading=14,
        fontName=base_font,
        encoding='utf-8'
    )
    
    # Instruction style
    instruction_style = ParagraphStyle(
        'InstructionStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.black,
        spaceAfter=6,
        leading=14,
        fontName=base_font,
        encoding='utf-8'
    )
    
    # Helper function to ensure proper text encoding
    def encode_text(text):
        """Ensure text is properly encoded for PDF"""
        if not text:
            return ""
        # Convert to string and ensure proper encoding
        text = str(text)
        # For reportlab, we need to ensure the text is properly formatted
        # Replace problematic characters
        return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    
    # ===== HEADER SECTION - Like Board Exams =====
    
    # School/Institution name if provided
    if paper.get('school_name'):
        school_text = encode_text(paper['school_name']).upper()
        elements.append(Paragraph(school_text, title_style))
        elements.append(Spacer(1, 4))
    
    # Paper title
    title_text = encode_text(paper['paper_title']).upper()
    elements.append(Paragraph(title_text, title_style))
    elements.append(Spacer(1, 3))
    
    # Exam type and subject
    exam_info = f"{encode_text(paper['exam_type'])} - {encode_text(paper['subject'])}"
    if paper.get('topics'):
        topics_str = ', '.join([encode_text(t) for t in paper['topics']])
        exam_info += f" ({topics_str})"
    elements.append(Paragraph(exam_info, header_style))
    elements.append(Spacer(1, 10))
    
    # Create info box with border
    info_data = []
    
    # Row 1: Max Marks and Time
    max_marks = paper.get('max_marks') or paper['total_marks']
    time_allowed = paper.get('time_allowed') or f"{paper['duration_minutes']} minutes"
    info_data.append([
        Paragraph('<b>Maximum Marks:</b>', info_style),
        Paragraph(str(max_marks), info_style),
        Paragraph('<b>Time Allowed:</b>', info_style),
        Paragraph(time_allowed, info_style)
    ])
    
    # Row 2: Date and Language
    exam_date = paper.get('exam_date') or '___________'
    info_data.append([
        Paragraph('<b>Date:</b>', info_style),
        Paragraph(exam_date, info_style),
        Paragraph('<b>Language:</b>', info_style),
        Paragraph(paper['language'], info_style)
    ])
    
    info_table = Table(info_data, colWidths=[1.8*inch, 1.8*inch, 1.8*inch, 1.8*inch])
    info_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ]))
    
    elements.append(info_table)
    elements.append(Spacer(1, 15))
    
    # Instructions section - BEFORE questions
    if paper.get('instructions'):
        elements.append(Paragraph('<b><u>General Instructions:</u></b>', question_style))
        elements.append(Spacer(1, 6))
        
        # Split instructions by newline or period
        instructions_text = paper['instructions']
        if '\n' in instructions_text:
            instructions = instructions_text.split('\n')
        else:
            instructions = instructions_text.split('.')
        
        for instruction in instructions:
            instruction = instruction.strip()
            if instruction:
                # Remove bullet if already present
                instruction = instruction.lstrip('•').lstrip('-').strip()
                if instruction:
                    elements.append(Paragraph(f"• {encode_text(instruction)}", instruction_style))
        
        elements.append(Spacer(1, 15))
    
    # Divider line
    elements.append(Table([['']], colWidths=[7*inch], rowHeights=[1], style=[
        ('LINEBELOW', (0, 0), (-1, -1), 1.5, colors.black)
    ]))
    elements.append(Spacer(1, 15))
    
    # Questions section
    for idx, question in enumerate(paper['questions'], 1):
        # Question number and text with marks
        marks_text = f"[{question.get('marks', '')} marks]" if question.get('marks') else ""
        q_text = f"<b>Q.{idx}</b> {encode_text(question['question'])} {marks_text}"
        
        elements.append(Paragraph(q_text, question_style))
        elements.append(Spacer(1, 8))
        
        # Options for MCQ
        if question['type'] == 'mcq' and question.get('options'):
            for option in question['options']:
                # Clean up and encode option text
                option_text = encode_text(option.strip())
                elements.append(Paragraph(f"    {option_text}", option_style))
        
        # True/False
        elif question['type'] == 'true_false':
            elements.append(Paragraph('    (a) True', option_style))
            elements.append(Paragraph('    (b) False', option_style))
        
        # Answer space for short answer and essay
        elif question['type'] in ['short_answer', 'essay']:
            lines = 6 if question['type'] == 'short_answer' else 12
            elements.append(Spacer(1, 8))
            for _ in range(lines):
                elements.append(Table([['']], colWidths=[6.5*inch], rowHeights=[0.5], style=[
                    ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.grey)
                ]))
                elements.append(Spacer(1, 10))
        
        elements.append(Spacer(1, 12))
    
    # Only include answer key if requested
    if include_answers and paper.get('answer_key'):
        elements.append(PageBreak())
        elements.append(Spacer(1, 20))
        elements.append(Paragraph('<b><u>ANSWER KEY</u></b>', title_style))
        elements.append(Spacer(1, 20))
        
        for idx, answer in enumerate(paper['answer_key'], 1):
            ans_text = f"<b>Q.{idx}</b> <b>Answer:</b> {encode_text(answer.get('correct_answer', 'N/A'))}"
            elements.append(Paragraph(ans_text, question_style))
            
            if answer.get('explanation'):
                exp_text = f"<b>Explanation:</b> {encode_text(answer['explanation'])}"
                elements.append(Paragraph(exp_text, instruction_style))
            
            elements.append(Spacer(1, 10))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


def generate_receipt_pdf(transaction: Dict[str, Any]) -> bytes:
    """Generate a professional receipt PDF for transactions"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=50,
        leftMargin=50,
        topMargin=40,
        bottomMargin=40
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title style
    title_style = ParagraphStyle(
        'ReceiptTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#2563eb'),
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    # Receipt title
    elements.append(Paragraph("PAYMENT RECEIPT", title_style))
    elements.append(Spacer(1, 0.3 * inch))
    
    # Company/App info
    company_style = ParagraphStyle(
        'Company',
        parent=styles['Normal'],
        fontSize=14,
        textColor=colors.black,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    elements.append(Paragraph("SOS-Tools - Exam Question Paper Generator", company_style))
    elements.append(Spacer(1, 0.3 * inch))
    
    # Transaction details table
    transaction_data = [
        ['Receipt Number:', transaction['transaction_number']],
        ['Transaction ID:', transaction['id']],
        ['Date:', datetime.fromisoformat(transaction['created_at']).strftime('%d-%b-%Y %I:%M %p')],
        ['Payment Status:', transaction['status'].upper()],
    ]
    
    transaction_table = Table(transaction_data, colWidths=[2.5*inch, 4*inch])
    transaction_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#475569')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(transaction_table)
    elements.append(Spacer(1, 0.3 * inch))
    
    # Divider
    elements.append(Paragraph("<hr width='100%' color='#e2e8f0'/>", styles['Normal']))
    elements.append(Spacer(1, 0.2 * inch))
    
    # Customer details
    customer_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=8,
        fontName='Helvetica-Bold'
    )
    elements.append(Paragraph("Customer Details", customer_heading))
    
    customer_data = [
        ['Name:', transaction['user_name']],
        ['Email:', transaction['user_email']],
        ['Mobile:', transaction.get('user_mobile', 'N/A')],
    ]
    
    customer_table = Table(customer_data, colWidths=[2.5*inch, 4*inch])
    customer_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#475569')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(customer_table)
    elements.append(Spacer(1, 0.3 * inch))
    
    # Divider
    elements.append(Paragraph("<hr width='100%' color='#e2e8f0'/>", styles['Normal']))
    elements.append(Spacer(1, 0.2 * inch))
    
    # Subscription details
    elements.append(Paragraph("Subscription Details", customer_heading))
    
    subscription_data = [
        ['Plan:', transaction['plan_name']],
        ['Validity:', f"{datetime.fromisoformat(transaction['validity_start']).strftime('%d-%b-%Y')} to {datetime.fromisoformat(transaction['validity_end']).strftime('%d-%b-%Y')}"],
        ['Duration:', f"{(datetime.fromisoformat(transaction['validity_end']) - datetime.fromisoformat(transaction['validity_start'])).days} days"],
    ]
    
    subscription_table = Table(subscription_data, colWidths=[2.5*inch, 4*inch])
    subscription_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#475569')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(subscription_table)
    elements.append(Spacer(1, 0.3 * inch))
    
    # Divider
    elements.append(Paragraph("<hr width='100%' color='#e2e8f0'/>", styles['Normal']))
    elements.append(Spacer(1, 0.2 * inch))
    
    # Payment details
    elements.append(Paragraph("Payment Details", customer_heading))
    
    payment_data = [
        ['Amount:', f"₹{transaction['amount']:.2f}"],
        ['Currency:', transaction['currency']],
        ['Payment Method:', transaction['payment_method']],
    ]
    
    if transaction.get('payment_id'):
        payment_data.append(['Payment ID:', transaction['payment_id']])
    
    payment_table = Table(payment_data, colWidths=[2.5*inch, 4*inch])
    payment_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#475569')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(payment_table)
    elements.append(Spacer(1, 0.5 * inch))
    
    # Total amount box
    total_data = [['TOTAL AMOUNT PAID', f"₹{transaction['amount']:.2f}"]]
    total_table = Table(total_data, colWidths=[4*inch, 2.5*inch])
    total_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#dbeafe')),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 14),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1e40af')),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('BOX', (0, 0), (-1, -1), 2, colors.HexColor('#3b82f6')),
    ]))
    elements.append(total_table)
    elements.append(Spacer(1, 0.5 * inch))
    
    # Footer note
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#64748b'),
        alignment=TA_CENTER,
        fontName='Helvetica'
    )
    elements.append(Paragraph("Thank you for your subscription!", footer_style))
    elements.append(Spacer(1, 0.1 * inch))
    elements.append(Paragraph("This is a computer-generated receipt and does not require a signature.", footer_style))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


async def generate_questions_with_ai(paper_config: QuestionPaperGenerate) -> tuple:
    """Generate questions using OpenAI GPT-4o via Emergent LLM Key - Optimized for speed"""
    try:
        # Initialize LLM Chat with faster model
        # Use GPT-4o for better language support, especially for non-English languages
        model_to_use = "gpt-4o" if paper_config.language.lower() != 'english' else "gpt-4o-mini"
        
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=str(uuid.uuid4()),
            system_message=f"Expert educator for {paper_config.exam_type}. Generate accurate exam questions in {paper_config.language} language in JSON format."
        ).with_model("openai", model_to_use)
        
        # Concise prompt for faster generation
        q_types = [f"{count} {q_type}" for q_type, count in paper_config.question_types.items() if count > 0]
        topics_str = ', '.join(paper_config.topics[:3]) if paper_config.topics else 'general'
        
        # Language instruction
        language_instruction = ""
        if paper_config.language.lower() != 'english':
            language_instruction = f"\n\n**CRITICAL: Generate ALL questions, options, and explanations in {paper_config.language} language only. Do NOT use English.**"
        
        prompt = f"""Generate {sum(paper_config.question_types.values())} {paper_config.subject} questions for {paper_config.exam_type} - Topics: {topics_str}

Language: {paper_config.language}{language_instruction}
Types: {', '.join(q_types)}
Marks: {paper_config.total_marks // sum(paper_config.question_types.values())} per question

Return ONLY valid JSON:
{{
  "questions": [
    {{"id": "q1", "type": "mcq", "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "difficulty": "medium", "marks": 4}}
  ],
  "answer_key": [
    {{"question_id": "q1", "correct_answer": "B) ...", "explanation": "..."}}
  ]
}}

Generate standard {paper_config.exam_type} level questions in {paper_config.language} language."""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse AI response
        response_text = response.strip()
        
        # Extract JSON from response
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        
        result = json.loads(response_text)
        return result.get('questions', []), result.get('answer_key', [])
        
    except Exception as e:
        logging.error(f"Error generating questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/signup")
async def signup(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        mobile=user_data.mobile,
        role="user"
    )
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    
    # Create token
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    
    return {
        "message": "User created successfully",
        "token": token,
        "user": {"id": user.id, "email": user.email, "name": user.name, "role": user.role}
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user account is active
    if not user.get('is_active', True):
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact support.")
    
    token = create_access_token({"sub": user['id'], "email": user['email'], "role": user['role']})
    
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "name": user['name'],
            "role": user['role'],
            "free_papers_used": user.get('free_papers_used', 0),
            "free_papers_limit": user.get('free_papers_limit', 5)
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: Dict = Depends(get_current_user)):
    return {
        "id": current_user['id'],
        "email": current_user['email'],
        "name": current_user['name'],
        "role": current_user['role'],
        "free_papers_used": current_user.get('free_papers_used', 0),
        "free_papers_limit": current_user.get('free_papers_limit', 1),
        "total_papers_generated": current_user.get('total_papers_generated', 0),
        "papers_limit": current_user.get('papers_limit', 1),
        "subscription_plan": current_user.get('subscription_plan'),
        "subscription_expiry": current_user.get('subscription_expiry')
    }

@api_router.put("/auth/profile")
async def update_profile(name: str, current_user: Dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user['id']},
        {"$set": {"name": name}}
    )
    return {"message": "Profile updated successfully"}

# ==================== QUESTION PAPER ROUTES ====================

@api_router.post("/papers/generate")
async def generate_paper(paper_config: QuestionPaperGenerate, current_user: Dict = Depends(get_current_user)):
    # Check if user has reached their limit (including deleted papers)
    total_generated = current_user.get('total_papers_generated', 0)
    papers_limit = current_user.get('papers_limit', 1)
    
    # If no subscription, check against free tier limit
    if not current_user.get('subscription_plan'):
        if total_generated >= current_user.get('free_papers_limit', 1):
            raise HTTPException(
                status_code=403,
                detail="Free tier limit reached (1 paper). Please upgrade to generate more papers."
            )
    else:
        # If has subscription but limit is not unlimited (-1)
        if papers_limit != -1 and total_generated >= papers_limit:
            raise HTTPException(
                status_code=403,
                detail=f"Subscription limit reached ({papers_limit} papers). Please upgrade your plan."
            )
    
    # Generate questions using AI
    questions, answer_key = await generate_questions_with_ai(paper_config)
    
    # Create question paper
    paper = QuestionPaper(
        user_id=current_user['id'],
        exam_type=paper_config.exam_type,
        subject=paper_config.subject,
        topics=paper_config.topics,
        paper_title=paper_config.paper_title,
        total_marks=paper_config.total_marks,
        duration_minutes=paper_config.duration_minutes,
        language=paper_config.language,
        questions=questions,
        answer_key=answer_key,
        school_name=paper_config.school_name,
        exam_date=paper_config.exam_date,
        max_marks=paper_config.max_marks,
        time_allowed=paper_config.time_allowed,
        instructions=paper_config.instructions
    )
    
    paper_dict = paper.model_dump()
    # Make a copy for MongoDB insertion (to avoid _id pollution)
    paper_dict_for_db = paper_dict.copy()
    await db.question_papers.insert_one(paper_dict_for_db)
    
    # Update user's paper counts - ALWAYS increment total_papers_generated
    update_fields = {"$inc": {"total_papers_generated": 1}}
    if not current_user.get('subscription_plan'):
        update_fields["$inc"]["free_papers_used"] = 1
    
    await db.users.update_one(
        {"id": current_user['id']},
        update_fields
    )
    
    return {
        "message": "Question paper generated successfully",
        "paper": paper_dict
    }

@api_router.get("/papers")
async def get_papers(current_user: Dict = Depends(get_current_user)):
    papers = await db.question_papers.find(
        {"user_id": current_user['id']},
        {"_id": 0, "questions": 0, "answer_key": 0}
    ).sort("created_at", -1).to_list(100)
    return {"papers": papers}

@api_router.get("/papers/{paper_id}")
async def get_paper(paper_id: str, current_user: Dict = Depends(get_current_user)):
    paper = await db.question_papers.find_one(
        {"id": paper_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper

@api_router.get("/papers/{paper_id}/download")
async def download_paper(paper_id: str, include_answers: bool = False, current_user: Dict = Depends(get_current_user)):
    paper = await db.question_papers.find_one(
        {"id": paper_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    # Check language and use appropriate PDF generation method
    language = paper.get('language', 'English').lower()
    
    if language == 'english':
        # Use text-based PDF for English
        pdf_bytes = generate_pdf(paper, include_answers=include_answers)
    else:
        # Use screenshot-based PDF for non-English languages (Hindi, Marathi, etc.)
        pdf_bytes = await generate_pdf_from_screenshot(paper, include_answers=include_answers)
    
    # Return as downloadable file with ASCII-safe filename
    import urllib.parse
    suffix = "_with_answers" if include_answers else ""
    # Use exam type and subject for filename (ASCII safe)
    safe_filename = f"{paper['exam_type']}_{paper['subject']}_Paper{suffix}.pdf".replace(' ', '_')
    # Encode the original title for Content-Disposition
    encoded_filename = urllib.parse.quote(paper['paper_title'])
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={safe_filename}; filename*=UTF-8''{encoded_filename}{suffix}.pdf"
        }
    )

@api_router.get("/papers/{paper_id}/download-answers")
async def download_answer_key(paper_id: str, current_user: Dict = Depends(get_current_user)):
    paper = await db.question_papers.find_one(
        {"id": paper_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    # Check language and use appropriate PDF generation method
    language = paper.get('language', 'English').lower()
    
    if language == 'english':
        # Use text-based PDF for English
        pdf_bytes = generate_pdf(paper, include_answers=True)
    else:
        # Use screenshot-based PDF for non-English languages
        pdf_bytes = await generate_pdf_from_screenshot(paper, include_answers=True)
    
    # Return as downloadable file with ASCII-safe filename
    import urllib.parse
    safe_filename = f"{paper['exam_type']}_{paper['subject']}_Answer_Key.pdf".replace(' ', '_')
    encoded_filename = urllib.parse.quote(paper['paper_title'])
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={safe_filename}; filename*=UTF-8''{encoded_filename}_Answer_Key.pdf"
        }
    )

@api_router.delete("/papers/{paper_id}")
async def delete_paper(paper_id: str, current_user: Dict = Depends(get_current_user)):
    result = await db.question_papers.delete_one(
        {"id": paper_id, "user_id": current_user['id']}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    # NOTE: We do NOT decrement total_papers_generated
    # This ensures users cannot bypass limits by deleting papers
    # Only decrement free_papers_used for UI display purposes
    if not current_user.get('subscription_plan'):
        await db.users.update_one(
            {"id": current_user['id']},
            {"$inc": {"free_papers_used": -1}}
        )
    
    return {"message": "Paper deleted successfully"}

# ==================== QUIZ/PRACTICE ROUTES ====================

class QuizSubmission(BaseModel):
    paper_id: str
    answers: Dict[str, Any]

def normalize_answer(answer: str) -> str:
    """Normalize answer for flexible comparison"""
    if not answer:
        return ""
    
    answer = str(answer).strip().lower()
    
    # Remove common prefixes like "A)", "a)", "1.", etc.
    import re
    answer = re.sub(r'^[a-d]\)\s*', '', answer, flags=re.IGNORECASE)
    answer = re.sub(r'^[1-4]\.\s*', '', answer)
    answer = re.sub(r'^[a-d]\s*', '', answer, flags=re.IGNORECASE)
    
    # Remove extra whitespace
    answer = ' '.join(answer.split())
    
    return answer

def check_answer_match(user_answer: str, correct_answer: str, question_type: str) -> bool:
    """Check if user answer matches correct answer with flexible matching"""
    
    # Normalize both answers
    user_norm = normalize_answer(user_answer)
    correct_norm = normalize_answer(correct_answer)
    
    # Exact match after normalization
    if user_norm == correct_norm:
        return True
    
    # For True/False questions - handle variations
    if question_type == 'true_false':
        # Check if answers are both true or both false
        true_variations = ['true', 'सत्य', 'सही', 't', 'yes', 'y']
        false_variations = ['false', 'असत्य', 'गलत', 'f', 'no', 'n']
        
        user_is_true = any(var in user_norm for var in true_variations)
        user_is_false = any(var in user_norm for var in false_variations)
        correct_is_true = any(var in correct_norm for var in true_variations)
        correct_is_false = any(var in correct_norm for var in false_variations)
        
        if user_is_true and correct_is_true:
            return True
        if user_is_false and correct_is_false:
            return True
    
    # For MCQ - check if the answer text is contained in either direction
    if question_type == 'mcq':
        # Sometimes user answers with just letter, sometimes with full text
        if user_norm in correct_norm or correct_norm in user_norm:
            return True
        
        # Extract just the answer text (without option labels)
        user_parts = user_answer.split(')', 1)
        correct_parts = correct_answer.split(')', 1)
        
        if len(user_parts) > 1 and len(correct_parts) > 1:
            user_text = normalize_answer(user_parts[1])
            correct_text = normalize_answer(correct_parts[1])
            if user_text == correct_text:
                return True
    
    # For short answer and essay - check similarity (at least 70% match)
    if question_type in ['short_answer', 'essay']:
        # Calculate simple similarity
        words_user = set(user_norm.split())
        words_correct = set(correct_norm.split())
        
        if len(words_user) == 0 or len(words_correct) == 0:
            return False
        
        intersection = words_user.intersection(words_correct)
        union = words_user.union(words_correct)
        
        similarity = len(intersection) / len(union) if len(union) > 0 else 0
        
        # If 70% or more words match, consider it correct
        if similarity >= 0.7:
            return True
    
    return False

@api_router.post("/quiz/submit")
async def submit_quiz(submission: QuizSubmission, current_user: Dict = Depends(get_current_user)):
    # Get paper
    paper = await db.question_papers.find_one(
        {"id": submission.paper_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    # Calculate score
    correct_answers = 0
    total_questions = len(paper['questions'])
    answer_key_dict = {ak['question_id']: ak for ak in paper['answer_key']}
    
    # Get question types
    question_types = {q['id']: q['type'] for q in paper['questions']}
    
    for q_id, user_answer in submission.answers.items():
        if q_id in answer_key_dict:
            correct_answer = answer_key_dict[q_id]['correct_answer']
            question_type = question_types.get(q_id, 'mcq')
            
            # Use flexible answer matching
            if check_answer_match(user_answer, correct_answer, question_type):
                correct_answers += 1
    
    percentage = (correct_answers / total_questions * 100) if total_questions > 0 else 0
    
    # Create quiz attempt
    attempt = QuizAttempt(
        user_id=current_user['id'],
        paper_id=submission.paper_id,
        answers=submission.answers,
        score=correct_answers,
        total_questions=total_questions,
        correct_answers=correct_answers,
        percentage=percentage
    )
    
    attempt_dict = attempt.model_dump()
    await db.quiz_attempts.insert_one(attempt_dict)
    
    return {
        "message": "Quiz submitted successfully",
        "result": {
            "score": correct_answers,
            "total_questions": total_questions,
            "percentage": round(percentage, 2),
            "correct_answers": correct_answers,
            "answer_key": paper['answer_key']
        }
    }

@api_router.get("/quiz/attempts")
async def get_attempts(current_user: Dict = Depends(get_current_user)):
    attempts = await db.quiz_attempts.find(
        {"user_id": current_user['id']},
        {"_id": 0, "answers": 0}
    ).sort("completed_at", -1).to_list(100)
    return {"attempts": attempts}

@api_router.get("/quiz/stats")
async def get_stats(current_user: Dict = Depends(get_current_user)):
    attempts = await db.quiz_attempts.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).to_list(1000)
    
    if not attempts:
        return {
            "total_attempts": 0,
            "average_score": 0,
            "highest_score": 0,
            "recent_attempts": []
        }
    
    total_attempts = len(attempts)
    average_score = sum(a['percentage'] for a in attempts) / total_attempts
    highest_score = max(a['percentage'] for a in attempts)
    
    return {
        "total_attempts": total_attempts,
        "average_score": round(average_score, 2),
        "highest_score": round(highest_score, 2),
        "recent_attempts": attempts[:5]
    }

# ==================== SUBSCRIPTION ROUTES ====================

@api_router.get("/subscriptions/plans")
async def get_plans():
    # Get plans from database
    plans = await db.subscription_plans.find(
        {"is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    # If no plans in DB, return default plans
    if not plans:
        plans = [
            {
                "id": "basic",
                "name": "Basic",
                "price": 299,
                "papers_limit": 50,
                "duration_days": 30,
                "features": ["50 papers per month", "All exam types", "Multiple languages", "Download PDF"],
                "is_active": True
            },
            {
                "id": "pro",
                "name": "Pro",
                "price": 599,
                "papers_limit": 150,
                "duration_days": 30,
                "features": ["150 papers per month", "All exam types", "Multiple languages", "Download PDF", "Priority support"],
                "is_active": True
            },
            {
                "id": "premium",
                "name": "Premium",
                "price": 999,
                "papers_limit": -1,  # unlimited
                "duration_days": 30,
                "features": ["Unlimited papers", "All exam types", "Multiple languages", "Download PDF", "Priority support", "Custom question banks"],
                "is_active": True
            }
        ]
    
    return {"plans": plans}

@api_router.post("/subscriptions/create-order")
async def create_subscription_order(order: PaymentOrder, current_user: Dict = Depends(get_current_user)):
    # Get plan details
    plan = await db.subscription_plans.find_one({"id": order.plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Create Razorpay order
    try:
        amount_in_paise = int(plan['price'] * 100)  # Convert to paise
        razor_order = razorpay_client.order.create({
            "amount": amount_in_paise,
            "currency": "INR",
            "payment_capture": 1
        })
        
        # Store order in database
        await db.payment_orders.insert_one({
            "order_id": razor_order["id"],
            "user_id": current_user['id'],
            "plan_id": order.plan_id,
            "amount": plan['price'],
            "status": "created",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "order_id": razor_order["id"],
            "amount": amount_in_paise,
            "currency": "INR",
            "key_id": os.environ.get('RAZORPAY_KEY_ID')
        }
    except Exception as e:
        logging.error(f"Error creating order: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")

@api_router.post("/subscriptions/verify-payment")
async def verify_payment(verification: PaymentVerification, current_user: Dict = Depends(get_current_user)):
    # Verify signature
    try:
        signature_payload = f"{verification.razorpay_order_id}|{verification.razorpay_payment_id}"
        expected_signature = hmac.new(
            os.environ.get('RAZORPAY_KEY_SECRET', '').encode(),
            signature_payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if expected_signature != verification.razorpay_signature:
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        
        # Get plan details
        plan = await db.subscription_plans.find_one({"id": verification.plan_id}, {"_id": 0})
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        # Update order status
        await db.payment_orders.update_one(
            {"order_id": verification.razorpay_order_id},
            {"$set": {
                "payment_id": verification.razorpay_payment_id,
                "status": "paid",
                "paid_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Update user subscription
        expiry_date = datetime.now(timezone.utc) + timedelta(days=plan['duration_days'])
        
        await db.users.update_one(
            {"id": current_user['id']},
            {
                "$set": {
                    "subscription_plan": verification.plan_id,
                    "subscription_expiry": expiry_date.isoformat(),
                    "papers_limit": plan['papers_limit'],
                    "total_papers_generated": 0  # Reset total count for new subscription
                }
            }
        )
        
        return {
            "message": "Payment verified and subscription activated",
            "plan": verification.plan_id,
            "expiry": expiry_date.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error verifying payment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {str(e)}")

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/users")
async def get_all_users(current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find(
        {},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    return {"users": users}

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = await db.users.count_documents({})
    total_papers = await db.question_papers.count_documents({})
    total_attempts = await db.quiz_attempts.count_documents({})
    active_subscriptions = await db.users.count_documents({"subscription_plan": {"$ne": None}})
    
    return {
        "total_users": total_users,
        "total_papers": total_papers,
        "total_attempts": total_attempts,
        "active_subscriptions": active_subscriptions
    }

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if role not in ['user', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": role}}
    )
    
    return {"message": "User role updated successfully"}

@api_router.put("/admin/users/{user_id}/status")
async def update_user_status(user_id: str, is_active: bool, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Prevent admin from deactivating themselves
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": is_active}}
    )
    

class UserUpdateAdmin(BaseModel):
    free_papers_limit: Optional[int] = None
    subscription_plan: Optional[str] = None
    subscription_expiry: Optional[str] = None
    papers_limit: Optional[int] = None

@api_router.put("/admin/users/{user_id}/details")
async def update_user_details(user_id: str, user_update: UserUpdateAdmin, current_user: Dict = Depends(get_current_user)):
    """Admin updates user subscription details"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build update dict with only provided fields
    update_fields = {}
    if user_update.free_papers_limit is not None:
        update_fields["free_papers_limit"] = user_update.free_papers_limit
    if user_update.subscription_plan is not None:
        update_fields["subscription_plan"] = user_update.subscription_plan
    if user_update.subscription_expiry is not None:
        update_fields["subscription_expiry"] = user_update.subscription_expiry
    if user_update.papers_limit is not None:
        update_fields["papers_limit"] = user_update.papers_limit
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User details updated successfully"}

    status_text = "activated" if is_active else "deactivated"
    return {"message": f"User {status_text} successfully"}

@api_router.put("/admin/plans/{plan_id}/status")
async def toggle_plan_status(plan_id: str, is_active: bool, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.subscription_plans.update_one(
        {"id": plan_id},
        {"$set": {"is_active": is_active}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    status_text = "activated" if is_active else "deactivated"
    return {"message": f"Plan {status_text} successfully"}


# ==================== ADMIN SUBSCRIPTION PLAN ROUTES ====================

@api_router.post("/admin/plans")
async def create_plan(plan: SubscriptionPlanCreate, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Create new plan
    new_plan = SubscriptionPlan(
        name=plan.name,
        price=plan.price,
        currency=plan.currency,
        papers_limit=plan.papers_limit,
        duration_days=plan.duration_days,
        features=plan.features
    )
    
    plan_dict = new_plan.model_dump()
    # Make a copy for MongoDB insertion (to avoid _id pollution)
    plan_dict_for_db = plan_dict.copy()
    await db.subscription_plans.insert_one(plan_dict_for_db)
    
    return {"message": "Plan created successfully", "plan": plan_dict}

@api_router.get("/admin/plans")
async def get_all_plans(current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    plans = await db.subscription_plans.find({}, {"_id": 0}).to_list(100)
    return {"plans": plans}

@api_router.put("/admin/plans/{plan_id}")
async def update_plan(plan_id: str, plan: SubscriptionPlanCreate, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.subscription_plans.update_one(
        {"id": plan_id},
        {"$set": {
            "name": plan.name,
            "price": plan.price,
            "currency": plan.currency,
            "papers_limit": plan.papers_limit,
            "duration_days": plan.duration_days,
            "features": plan.features
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {"message": "Plan updated successfully"}

@api_router.delete("/admin/plans/{plan_id}")
async def delete_plan(plan_id: str, current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Soft delete - mark as inactive
    result = await db.subscription_plans.update_one(
        {"id": plan_id},
        {"$set": {"is_active": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {"message": "Plan deactivated successfully"}

@api_router.get("/admin/payments")
async def get_payments(current_user: Dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    payments = await db.payment_orders.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return {"payments": payments}


# ==================== TRANSACTION ROUTES ====================

@api_router.post("/admin/transactions")
async def create_transaction(transaction_data: TransactionCreate, current_user: Dict = Depends(get_current_user)):
    """Admin creates a transaction record manually after payment confirmation"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get user details
    user = await db.users.find_one({"id": transaction_data.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get plan details
    plan = await db.subscription_plans.find_one({"id": transaction_data.plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Calculate validity dates
    validity_start = datetime.now(timezone.utc)
    validity_end = validity_start + timedelta(days=plan['duration_days'])
    
    # Create transaction
    transaction = Transaction(
        user_id=user['id'],
        user_name=user['name'],
        user_email=user['email'],
        user_mobile=user.get('mobile', 'N/A'),
        plan_id=plan['id'],
        plan_name=plan['name'],
        amount=transaction_data.amount,
        currency=plan.get('currency', 'INR'),
        payment_method=transaction_data.payment_method,
        payment_id=transaction_data.payment_id,
        validity_start=validity_start.isoformat(),
        validity_end=validity_end.isoformat(),
        notes=transaction_data.notes,
        created_by="admin"
    )
    
    transaction_dict = transaction.model_dump()
    
    # Generate receipt PDF
    receipt_pdf = generate_receipt_pdf(transaction_dict)
    
    # Save receipt to file system
    receipts_dir = "/app/receipts"
    os.makedirs(receipts_dir, exist_ok=True)
    receipt_filename = f"{transaction_dict['transaction_number']}.pdf"
    receipt_path = os.path.join(receipts_dir, receipt_filename)
    
    with open(receipt_path, 'wb') as f:
        f.write(receipt_pdf)
    
    transaction_dict['receipt_url'] = f"/receipts/{receipt_filename}"
    
    # Save transaction to database
    transaction_dict_for_db = transaction_dict.copy()
    await db.transactions.insert_one(transaction_dict_for_db)
    
    # Update user subscription
    await db.users.update_one(
        {"id": user['id']},
        {"$set": {
            "subscription_plan": plan['name'],
            "subscription_expiry": validity_end.isoformat(),
            "papers_limit": plan['papers_limit']
        }}
    )
    
    return {
        "message": "Transaction created successfully",
        "transaction": transaction_dict
    }

@api_router.get("/transactions")
async def get_user_transactions(current_user: Dict = Depends(get_current_user)):
    """Get all transactions for current user"""
    transactions = await db.transactions.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"transactions": transactions}

@api_router.get("/admin/transactions")
async def get_all_transactions(current_user: Dict = Depends(get_current_user)):
    """Admin gets all transactions"""
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    transactions = await db.transactions.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return {"transactions": transactions}

@api_router.get("/transactions/{transaction_id}/receipt")
async def download_receipt(transaction_id: str, current_user: Dict = Depends(get_current_user)):
    """Download receipt for a transaction"""
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Check if user owns this transaction or is admin
    if transaction['user_id'] != current_user['id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Access denied")
    
    receipt_path = f"/app{transaction['receipt_url']}"
    
    if not os.path.exists(receipt_path):
        # Regenerate receipt if not found
        receipt_pdf = generate_receipt_pdf(transaction)
        with open(receipt_path, 'wb') as f:
            f.write(receipt_pdf)
    
    return FileResponse(
        receipt_path,
        media_type='application/pdf',
        filename=f"Receipt_{transaction['transaction_number']}.pdf"
    )

@api_router.put("/profile/mobile")
async def update_mobile(mobile: str, current_user: Dict = Depends(get_current_user)):
    """Update user mobile number"""
    await db.users.update_one(
        {"id": current_user['id']},
        {"$set": {"mobile": mobile}}
    )
    return {"message": "Mobile number updated successfully"}

# ==================== INCLUDE ROUTER ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()