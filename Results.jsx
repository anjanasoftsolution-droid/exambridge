import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, ArrowLeft, TrendingUp, Award, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const Results = () => {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const [attemptsRes, statsRes] = await Promise.all([
        axios.get(`${API}/quiz/attempts`),
        axios.get(`${API}/quiz/stats`)
      ]);

      setAttempts(attemptsRes.data.attempts);
      setStats(statsRes.data);
    } catch (error) {
      toast.error("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-2xl font-semibold text-slate-700">Loading results...</div>
      </div>
    );
  }

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

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Your Performance</h1>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats?.total_attempts || 0}</div>
            <div className="text-blue-100 text-sm">Total Attempts</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats?.average_score?.toFixed(1) || 0}%</div>
            <div className="text-indigo-100 text-sm">Average Score</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats?.highest_score?.toFixed(1) || 0}%</div>
            <div className="text-amber-100 text-sm">Highest Score</div>
          </Card>
        </div>

        {/* Attempts List */}
        <Card className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">All Attempts</h2>
          
          {attempts.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-lg text-slate-500 mb-4">No quiz attempts yet</p>
              <Button
                data-testid="start-practice-btn"
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full"
              >
                Start Practicing
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {attempts.map((attempt) => (
                <Card
                  key={attempt.id}
                  className="p-6 border border-slate-200 rounded-xl hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {formatDate(attempt.completed_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-sm text-slate-600">Score</div>
                          <div className="text-2xl font-bold text-slate-900">
                            {attempt.correct_answers}/{attempt.total_questions}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-600">Percentage</div>
                          <div className={`text-2xl font-bold ${
                            attempt.percentage >= 75 ? 'text-green-600' :
                            attempt.percentage >= 50 ? 'text-amber-600' :
                            'text-red-600'
                          }`}>
                            {attempt.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`px-4 py-2 rounded-full font-semibold ${
                        attempt.percentage >= 75 ? 'bg-green-100 text-green-700' :
                        attempt.percentage >= 50 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {attempt.percentage >= 75 ? 'Excellent' :
                         attempt.percentage >= 50 ? 'Good' : 'Needs Improvement'}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Results;