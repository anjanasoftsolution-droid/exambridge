import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, ArrowLeft, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const Practice = () => {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const [paper, setPaper] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPaper();
  }, [paperId]);

  const fetchPaper = async () => {
    try {
      const response = await axios.get(`${API}/papers/${paperId}`);
      setPaper(response.data);
    } catch (error) {
      toast.error("Failed to load paper");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length === 0) {
      toast.error("Please answer at least one question");
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(`${API}/quiz/submit`, {
        paper_id: paperId,
        answers: answers
      });
      
      setResult(response.data.result);
      setSubmitted(true);
      toast.success("Quiz submitted successfully!");
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(error.response?.data?.detail || "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-2xl font-semibold text-slate-700">Loading paper...</div>
      </div>
    );
  }

  if (!paper) return null;

  const question = paper.questions[currentQuestion];
  const answerKey = result?.answer_key?.find(ak => ak.question_id === question.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Toaster position="top-center" richColors />
      
      {/* Navbar - Responsive */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm md:text-lg font-bold text-slate-900 truncate">{paper.paper_title}</div>
                <div className="text-xs md:text-sm text-slate-600 truncate">
                  {paper.exam_type} • {paper.subject}
                </div>
              </div>
            </div>
            <Button
              data-testid="back-to-dashboard-btn"
              onClick={() => navigate('/dashboard')}
              variant="outline"
              size="sm"
              className="border-slate-300 hover:border-blue-600 hover:text-blue-600 rounded-full ml-2"
            >
              <ArrowLeft className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Back</span>
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 md:py-8">
        {!submitted ? (
          <>
            {/* Progress - Responsive */}
            <div className="mb-4 md:mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                <span className="text-xs md:text-sm font-medium text-slate-600">
                  Question {currentQuestion + 1} of {paper.questions.length}
                </span>
                <span className="text-xs md:text-sm font-medium text-slate-600">
                  Answered: {Object.keys(answers).length} / {paper.questions.length}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / paper.questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card - Responsive */}
            <Card className="bg-white rounded-2xl shadow-lg p-4 md:p-8 mb-4 md:mb-6">
              <div className="mb-3 md:mb-4 flex flex-wrap gap-2">
                <span className="px-2 md:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs md:text-sm font-medium">
                  {question.type.replace('_', ' ').toUpperCase()}
                </span>
                {question.marks && (
                  <span className="px-2 md:px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs md:text-sm font-medium">
                    {question.marks} marks
                  </span>
                )}
              </div>
              
              <h3 className="text-lg md:text-2xl font-bold text-slate-900 mb-4 md:mb-6 leading-relaxed">
                {question.question}
              </h3>

              {question.type === 'mcq' && question.options && (
                <div className="space-y-2 md:space-y-3">
                  {question.options.map((option, index) => (
                    <button
                      key={index}
                      data-testid={`option-${index}-btn`}
                      onClick={() => handleAnswer(question.id, option)}
                      className={`w-full p-3 md:p-4 text-left text-sm md:text-base border-2 rounded-xl transition-all duration-200 ${
                        answers[question.id] === option
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-medium'
                          : 'border-slate-300 hover:border-blue-400 bg-white text-slate-700'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {question.type === 'true_false' && (
                <div className="space-y-2 md:space-y-3">
                  {['True', 'False'].map((option) => (
                    <button
                      key={option}
                      data-testid={`${option.toLowerCase()}-btn`}
                      onClick={() => handleAnswer(question.id, option)}
                      className={`w-full p-3 md:p-4 text-left text-sm md:text-base border-2 rounded-xl transition-all duration-200 ${
                        answers[question.id] === option
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-medium'
                          : 'border-slate-300 hover:border-blue-400 bg-white text-slate-700'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {(question.type === 'short_answer' || question.type === 'essay') && (
                <textarea
                  data-testid="answer-textarea"
                  rows={question.type === 'essay' ? 6 : 4}
                  value={answers[question.id] || ''}
                  onChange={(e) => handleAnswer(question.id, e.target.value)}
                  className="w-full p-3 md:p-4 text-sm md:text-base border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 transition-colors resize-none"
                  placeholder="Type your answer here..."
                />
              )}
            </Card>

            {/* Navigation - Responsive */}
            <div className="flex justify-between items-center gap-2">
              <Button
                data-testid="prev-question-btn"
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                variant="outline"
                size="sm"
                className="border-2 border-slate-300 hover:border-blue-600 text-slate-700 hover:text-blue-600 px-3 md:px-6 py-2 md:py-3 rounded-xl font-semibold text-sm md:text-base"
              >
                <ArrowLeft className="w-4 h-4 md:mr-2" />
                <span className="hidden sm:inline">Previous</span>
              </Button>

              {currentQuestion < paper.questions.length - 1 ? (
                <Button
                  data-testid="next-question-btn"
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3 md:px-6 py-2 md:py-3 rounded-xl font-semibold text-sm md:text-base"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <ArrowRight className="w-4 h-4 md:ml-2" />
                </Button>
              ) : (
                <Button
                  data-testid="submit-quiz-btn"
                  onClick={handleSubmit}
                  disabled={submitting}
                  size="sm"
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 md:px-8 py-2 md:py-3 rounded-xl font-semibold text-sm md:text-base"
                >
                  {submitting ? "Submitting..." : "Submit Quiz"}
                </Button>
              )}
            </div>
          </>
        ) : (
          /* Results - Responsive */
          <div className="space-y-4 md:space-y-6">
            <Card className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl shadow-2xl p-4 md:p-8 text-center">
              <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">Quiz Completed!</h2>
              <div className="grid grid-cols-3 gap-3 md:gap-6 mt-4 md:mt-8">
                <div>
                  <div className="text-3xl md:text-5xl font-bold">{result.score}</div>
                  <div className="text-blue-100 mt-1 md:mt-2 text-xs md:text-base">Correct</div>
                </div>
                <div>
                  <div className="text-3xl md:text-5xl font-bold">{result.total_questions}</div>
                  <div className="text-blue-100 mt-1 md:mt-2 text-xs md:text-base">Total</div>
                </div>
                <div>
                  <div className="text-3xl md:text-5xl font-bold">{result.percentage}%</div>
                  <div className="text-blue-100 mt-1 md:mt-2 text-xs md:text-base">Score</div>
                </div>
              </div>
            </Card>

            {/* Answer Key - Responsive */}
            <Card className="bg-white rounded-2xl shadow-lg p-4 md:p-8">
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 md:mb-6">Answer Key</h3>
              <div className="space-y-3 md:space-y-4">
                {paper.questions.map((q, index) => {
                  const ak = result.answer_key.find(a => a.question_id === q.id);
                  const userAnswer = answers[q.id];
                  const isCorrect = userAnswer === ak?.correct_answer;

                  return (
                    <div key={q.id} className="p-3 md:p-4 border-2 border-slate-200 rounded-xl">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-slate-900 text-sm md:text-base">Q{index + 1}.</span>
                            {isCorrect ? (
                              <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                            )}
                          </div>
                          <p className="text-slate-700 mb-2 text-sm md:text-base">{q.question}</p>
                          {userAnswer && (
                            <div className="text-xs md:text-sm">
                              <span className="font-medium text-slate-600">Your Answer: </span>
                              <span className={isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                {userAnswer}
                              </span>
                            </div>
                          )}
                          {!isCorrect && ak && (
                            <div className="text-xs md:text-sm mt-1">
                              <span className="font-medium text-slate-600">Correct Answer: </span>
                              <span className="text-green-600 font-medium">{ak.correct_answer}</span>
                            </div>
                          )}
                          {ak?.explanation && (
                            <div className="mt-2 p-2 md:p-3 bg-blue-50 rounded-lg text-xs md:text-sm text-blue-900">
                              <span className="font-medium">Explanation: </span>{ak.explanation}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
              <Button
                data-testid="back-to-dashboard-results-btn"
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 md:px-8 py-2 md:py-3 rounded-xl font-semibold text-sm md:text-base w-full sm:w-auto"
              >
                Back to Dashboard
              </Button>
              <Button
                data-testid="view-all-results-btn"
                onClick={() => navigate('/results')}
                variant="outline"
                className="border-2 border-slate-300 hover:border-blue-600 text-slate-700 hover:text-blue-600 px-4 md:px-8 py-2 md:py-3 rounded-xl font-semibold text-sm md:text-base w-full sm:w-auto"
              >
                View All Results
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Practice;