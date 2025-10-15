import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, ArrowLeft, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

const Generator = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [formData, setFormData] = useState({
    exam_type: "",
    stream: "",
    subject: "",
    topics: [],
    question_types: {
      mcq: 0,
      short_answer: 0,
      true_false: 0,
      essay: 0
    },
    paper_format: "standard",
    total_marks: 100,
    duration_minutes: 180,
    paper_title: "",
    instructions: "• Read all questions carefully\n• Answer all questions\n• Write your answers in the space provided\n• All questions carry equal marks unless specified",
    language: "English",
    school_name: "",
    exam_date: "",
    max_marks: null,
    time_allowed: ""
  });

  const examTypes = [
    "NEET", "JEE Main", "JEE Advanced", "UPSC", "MPSC", "NDA", "GATE",
    "SSC", "Railway", "Banking", "School Level", "Engineering", "Pharmacy", "CLAT", "CAT"
  ];

  // School levels for dependent dropdown
  const schoolLevels = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);
  
  // Engineering streams
  const engineeringStreams = [
    "Computer Science", "Mechanical", "Civil", "Electrical", "Electronics",
    "Chemical", "Aerospace", "Biotechnology", "Information Technology"
  ];
  
  // Pharmacy streams
  const pharmacyStreams = ["D.Pharmacy", "B.Pharmacy", "M.Pharmacy", "Pharm.D"];

  const subjects = {
    "NEET": ["Physics", "Chemistry", "Biology"],
    "JEE Main": ["Physics", "Chemistry", "Mathematics"],
    "JEE Advanced": ["Physics", "Chemistry", "Mathematics"],
    "UPSC": ["History", "Geography", "Polity", "Economy", "Current Affairs", "Science & Technology"],
    "MPSC": ["History", "Geography", "Polity", "Economy", "Current Affairs", "Maharashtra GK"],
    "NDA": ["Mathematics", "General Ability", "English", "General Science"],
    "GATE": ["Engineering Mathematics", "Digital Logic", "Data Structures", "Algorithms", "Operating Systems"],
    "School Level": {
      "Class 1": ["English", "Mathematics", "EVS", "Hindi"],
      "Class 2": ["English", "Mathematics", "EVS", "Hindi"],
      "Class 3": ["English", "Mathematics", "EVS", "Hindi"],
      "Class 4": ["English", "Mathematics", "Science", "Social Studies", "Hindi"],
      "Class 5": ["English", "Mathematics", "Science", "Social Studies", "Hindi"],
      "Class 6": ["English", "Mathematics", "Science", "Social Studies", "Hindi", "Sanskrit"],
      "Class 7": ["English", "Mathematics", "Science", "Social Studies", "Hindi", "Sanskrit"],
      "Class 8": ["English", "Mathematics", "Science", "Social Studies", "Hindi", "Sanskrit"],
      "Class 9": ["English", "Mathematics", "Science", "Social Studies", "Hindi", "Information Technology"],
      "Class 10": ["English", "Mathematics", "Science", "Social Studies", "Hindi", "Information Technology"],
      "Class 11": ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Computer Science", "Economics", "Accountancy"],
      "Class 12": ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Computer Science", "Economics", "Accountancy"]
    },
    "Engineering": {
      "Computer Science": ["Data Structures", "Algorithms", "DBMS", "Operating Systems", "Computer Networks", "Software Engineering"],
      "Mechanical": ["Thermodynamics", "Fluid Mechanics", "Machine Design", "Manufacturing", "Heat Transfer"],
      "Civil": ["Structural Analysis", "Geotechnical Engineering", "Transportation", "Hydraulics", "Environmental Engineering"],
      "Electrical": ["Circuit Theory", "Electromagnetic Theory", "Power Systems", "Control Systems", "Electrical Machines"],
      "Electronics": ["Analog Circuits", "Digital Electronics", "Signals & Systems", "Communication Systems", "Microprocessors"],
      "Chemical": ["Chemical Thermodynamics", "Process Control", "Mass Transfer", "Reaction Engineering", "Process Design"],
      "Aerospace": ["Aerodynamics", "Flight Mechanics", "Propulsion", "Aircraft Structures", "Control Systems"],
      "Biotechnology": ["Molecular Biology", "Biochemistry", "Genetic Engineering", "Bioprocess Engineering", "Immunology"],
      "Information Technology": ["Data Structures", "Database Systems", "Web Technologies", "Cloud Computing", "Cybersecurity"]
    },
    "Pharmacy": {
      "D.Pharmacy": ["Pharmaceutics", "Pharmaceutical Chemistry", "Pharmacology", "Human Anatomy", "Health Education"],
      "B.Pharmacy": ["Pharmaceutical Chemistry", "Pharmacology", "Pharmaceutics", "Pharmacognosy", "Pharmaceutical Analysis"],
      "M.Pharmacy": ["Advanced Pharmaceutics", "Clinical Pharmacy", "Pharmacokinetics", "Drug Regulatory Affairs", "Pharmaceutical Biotechnology"],
      "Pharm.D": ["Pharmacy Practice", "Clinical Pharmacy", "Pharmacotherapeutics", "Clinical Toxicology", "Clinical Research"]
    },
    "default": ["Mathematics", "Science", "English"]
  };

  const topicsBySubject = {
    "Physics": ["Mechanics", "Thermodynamics", "Electromagnetism", "Optics", "Modern Physics", "Waves", "Rotational Motion"],
    "Chemistry": ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Chemical Bonding", "Periodic Table"],
    "Biology": ["Cell Biology", "Genetics", "Ecology", "Human Physiology", "Plant Physiology", "Evolution"],
    "Mathematics": ["Algebra", "Calculus", "Trigonometry", "Geometry", "Statistics", "Probability", "Coordinate Geometry"],
    "History": ["Ancient History", "Medieval History", "Modern History", "Indian Freedom Struggle", "World History"],
    "Geography": ["Physical Geography", "Human Geography", "Indian Geography", "World Geography", "Map Skills"],
    "Science": ["Matter", "Energy", "Living Things", "Earth & Space", "Force & Motion"],
    "English": ["Grammar", "Comprehension", "Writing Skills", "Literature", "Vocabulary"],
    "Data Structures": ["Arrays", "Linked Lists", "Stacks", "Queues", "Trees", "Graphs", "Hashing"],
    "Algorithms": ["Sorting", "Searching", "Greedy", "Dynamic Programming", "Divide & Conquer"],
    "DBMS": ["SQL", "Normalization", "Transactions", "Indexing", "Query Optimization"],
    "Pharmacology": ["General Pharmacology", "Cardiovascular Drugs", "CNS Drugs", "Antibiotics", "Chemotherapy"],
    "Pharmaceutics": ["Dosage Forms", "Drug Delivery", "Biopharmaceutics", "Formulation", "Quality Control"],
    "default": ["General Topics"]
  };

  const handleGenerate = async () => {
    // Validation
    if (!formData.exam_type || !formData.subject || !formData.paper_title) {
      toast.error("Please fill all required fields");
      return;
    }

    const totalQuestions = Object.values(formData.question_types).reduce((a, b) => a + b, 0);
    if (totalQuestions === 0) {
      toast.error("Please add at least one question");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API}/papers/generate`, formData);
      toast.success("Question paper generated successfully!");
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch (error) {
      // Check if it's a free limit error (403)
      if (error.response?.status === 403) {
        setShowLimitModal(true);
      } else {
        toast.error(error.response?.data?.detail || "Failed to generate paper");
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => {
    // Get subjects based on exam type and stream
    const getSubjects = () => {
      if (!formData.exam_type) return subjects.default;
      
      if (formData.exam_type === "School Level" && formData.stream) {
        return subjects["School Level"][formData.stream] || subjects.default;
      } else if (formData.exam_type === "Engineering" && formData.stream) {
        return subjects["Engineering"][formData.stream] || subjects.default;
      } else if (formData.exam_type === "Pharmacy" && formData.stream) {
        return subjects["Pharmacy"][formData.stream] || subjects.default;
      } else if (Array.isArray(subjects[formData.exam_type])) {
        return subjects[formData.exam_type];
      }
      
      return subjects.default;
    };

    return (
      <div className="space-y-6">
        <div>
          <Label className="text-slate-700 font-medium mb-2 block">Exam Type *</Label>
          <Select value={formData.exam_type} onValueChange={(value) => setFormData({ ...formData, exam_type: value, stream: "", subject: "", topics: [] })}>
            <SelectTrigger data-testid="exam-type-select" className="h-12 rounded-xl border-slate-300">
              <SelectValue placeholder="Select exam type" />
            </SelectTrigger>
            <SelectContent>
              {examTypes.map((exam) => (
                <SelectItem key={exam} value={exam}>{exam}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stream/Level Selection for School Level, Engineering, Pharmacy */}
        {(formData.exam_type === "School Level" || formData.exam_type === "Engineering" || formData.exam_type === "Pharmacy") && (
          <div>
            <Label className="text-slate-700 font-medium mb-2 block">
              {formData.exam_type === "School Level" ? "Class *" : 
               formData.exam_type === "Engineering" ? "Stream *" : "Course *"}
            </Label>
            <Select 
              value={formData.stream} 
              onValueChange={(value) => setFormData({ ...formData, stream: value, subject: "", topics: [] })}
            >
              <SelectTrigger data-testid="stream-select" className="h-12 rounded-xl border-slate-300">
                <SelectValue placeholder={
                  formData.exam_type === "School Level" ? "Select class" : 
                  formData.exam_type === "Engineering" ? "Select stream" : "Select course"
                } />
              </SelectTrigger>
              <SelectContent>
                {formData.exam_type === "School Level" && schoolLevels.map((level) => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
                {formData.exam_type === "Engineering" && engineeringStreams.map((stream) => (
                  <SelectItem key={stream} value={stream}>{stream}</SelectItem>
                ))}
                {formData.exam_type === "Pharmacy" && pharmacyStreams.map((stream) => (
                  <SelectItem key={stream} value={stream}>{stream}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="text-slate-700 font-medium mb-2 block">Subject *</Label>
          <Select 
            value={formData.subject} 
            onValueChange={(value) => setFormData({ ...formData, subject: value, topics: [] })}
            disabled={!formData.exam_type || 
              ((formData.exam_type === "School Level" || formData.exam_type === "Engineering" || formData.exam_type === "Pharmacy") && !formData.stream)}
          >
            <SelectTrigger data-testid="subject-select" className="h-12 rounded-xl border-slate-300">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {getSubjects().map((subject) => (
                <SelectItem key={subject} value={subject}>{subject}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      <div>
        <Label className="text-slate-700 font-medium mb-2 block">Topics (Optional)</Label>
        <div className="space-y-2 max-h-48 overflow-y-auto p-4 bg-slate-50 rounded-xl border border-slate-300">
          {(topicsBySubject[formData.subject] || topicsBySubject.default).map((topic) => (
            <div key={topic} className="flex items-center space-x-2">
              <Checkbox
                id={topic}
                data-testid={`topic-${topic}-checkbox`}
                checked={formData.topics.includes(topic)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFormData({ ...formData, topics: [...formData.topics, topic] });
                  } else {
                    setFormData({ ...formData, topics: formData.topics.filter(t => t !== topic) });
                  }
                }}
              />
              <label htmlFor={topic} className="text-sm font-medium text-slate-700 cursor-pointer">
                {topic}
              </label>
            </div>
          ))}
        </div>
      </div>

        <div>
          <Label className="text-slate-700 font-medium mb-2 block">Language</Label>
          <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
            <SelectTrigger data-testid="language-select" className="h-12 rounded-xl border-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="Hindi">Hindi</SelectItem>
              <SelectItem value="Marathi">Marathi</SelectItem>
              <SelectItem value="Tamil">Tamil</SelectItem>
              <SelectItem value="Telugu">Telugu</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-slate-700 font-medium mb-2 block">Multiple Choice Questions (MCQ)</Label>
        <Input
          data-testid="mcq-count-input"
          type="number"
          min="0"
          value={formData.question_types.mcq}
          onChange={(e) => setFormData({
            ...formData,
            question_types: { ...formData.question_types, mcq: parseInt(e.target.value) || 0 }
          })}
          className="h-12 rounded-xl border-slate-300"
        />
      </div>

      <div>
        <Label className="text-slate-700 font-medium mb-2 block">Short Answer Questions</Label>
        <Input
          data-testid="short-answer-count-input"
          type="number"
          min="0"
          value={formData.question_types.short_answer}
          onChange={(e) => setFormData({
            ...formData,
            question_types: { ...formData.question_types, short_answer: parseInt(e.target.value) || 0 }
          })}
          className="h-12 rounded-xl border-slate-300"
        />
      </div>

      <div>
        <Label className="text-slate-700 font-medium mb-2 block">True/False Questions</Label>
        <Input
          data-testid="true-false-count-input"
          type="number"
          min="0"
          value={formData.question_types.true_false}
          onChange={(e) => setFormData({
            ...formData,
            question_types: { ...formData.question_types, true_false: parseInt(e.target.value) || 0 }
          })}
          className="h-12 rounded-xl border-slate-300"
        />
      </div>

      <div>
        <Label className="text-slate-700 font-medium mb-2 block">Essay Questions</Label>
        <Input
          data-testid="essay-count-input"
          type="number"
          min="0"
          value={formData.question_types.essay}
          onChange={(e) => setFormData({
            ...formData,
            question_types: { ...formData.question_types, essay: parseInt(e.target.value) || 0 }
          })}
          className="h-12 rounded-xl border-slate-300"
        />
      </div>

      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-sm text-blue-800 font-medium">
          Total Questions: {Object.values(formData.question_types).reduce((a, b) => a + b, 0)}
        </p>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-slate-700 font-medium mb-2 block">Paper Title *</Label>
        <Input
          data-testid="paper-title-input"
          type="text"
          placeholder="e.g., NEET Physics Practice Test 1"
          value={formData.paper_title}
          onChange={(e) => setFormData({ ...formData, paper_title: e.target.value })}
          className="h-12 rounded-xl border-slate-300"
        />
      </div>

      <div>
        <Label className="text-slate-700 font-medium mb-2 block">School/Institution Name (Optional)</Label>
        <Input
          data-testid="school-name-input"
          type="text"
          placeholder="e.g., Delhi Public School"
          value={formData.school_name}
          onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
          className="h-12 rounded-xl border-slate-300"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-700 font-medium mb-2 block">Total Marks</Label>
          <Input
            data-testid="total-marks-input"
            type="number"
            min="1"
            value={formData.total_marks}
            onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) || 100, max_marks: parseInt(e.target.value) || 100 })}
            className="h-12 rounded-xl border-slate-300"
          />
        </div>

        <div>
          <Label className="text-slate-700 font-medium mb-2 block">Exam Date (Optional)</Label>
          <Input
            data-testid="exam-date-input"
            type="text"
            placeholder="e.g., 15-10-2024"
            value={formData.exam_date}
            onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
            className="h-12 rounded-xl border-slate-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-700 font-medium mb-2 block">Duration (minutes)</Label>
          <Input
            data-testid="duration-input"
            type="number"
            min="1"
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 180 })}
            className="h-12 rounded-xl border-slate-300"
          />
        </div>

        <div>
          <Label className="text-slate-700 font-medium mb-2 block">Time Format (Optional)</Label>
          <Input
            data-testid="time-allowed-input"
            type="text"
            placeholder="e.g., 3 Hours"
            value={formData.time_allowed}
            onChange={(e) => setFormData({ ...formData, time_allowed: e.target.value })}
            className="h-12 rounded-xl border-slate-300"
          />
        </div>
      </div>

      <div>
        <Label className="text-slate-700 font-medium mb-2 block">General Instructions (Optional)</Label>
        <textarea
          data-testid="instructions-input"
          rows="6"
          value={formData.instructions}
          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
          className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter general instructions (one per line with bullet points)..."
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Toaster position="top-center" richColors />
      
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              SOS-Tools
            </span>
          </div>
          <Button
            data-testid="back-to-dashboard-btn"
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="border-slate-300 hover:border-blue-600 hover:text-blue-600 rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                  step >= s 
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg' 
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-2 mx-2 rounded-full transition-all duration-300 ${
                    step > s ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm font-medium text-slate-600">
            <span>Exam Details</span>
            <span>Question Types</span>
            <span>Paper Format</span>
          </div>
        </div>

        {/* Form Card */}
        <Card className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">
            {step === 1 && "Step 1: Exam Details"}
            {step === 2 && "Step 2: Question Types"}
            {step === 3 && "Step 3: Paper Format"}
          </h2>

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
            {step > 1 && (
              <Button
                data-testid="prev-step-btn"
                onClick={() => setStep(step - 1)}
                variant="outline"
                className="border-2 border-slate-300 hover:border-blue-600 text-slate-700 hover:text-blue-600 px-6 py-3 rounded-xl font-semibold"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}
            
            <div className="ml-auto">
              {step < 3 ? (
                <Button
                  data-testid="next-step-btn"
                  onClick={() => setStep(step + 1)}
                  disabled={!formData.exam_type || !formData.subject}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  data-testid="generate-btn"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Paper"
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Free Limit Exhausted Modal */}
      <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center">
              Free Limit Reached!
            </DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              You've used all your free question papers. Upgrade to a premium plan to continue generating unlimited papers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-slate-900 mb-2">Premium Benefits:</h4>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                  Unlimited question papers
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                  All exam types (NEET, JEE, UPSC, School exams & more)
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                  Practice mode with instant feedback
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                  Priority support
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex flex-col space-y-2">
            <Button
              onClick={() => {
                setShowLimitModal(false);
                navigate('/subscriptions');
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full py-6 text-base font-semibold"
            >
              View Plans & Upgrade
            </Button>
            <Button
              onClick={() => setShowLimitModal(false)}
              variant="outline"
              className="w-full rounded-full"
            >
              Maybe Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Generator;
