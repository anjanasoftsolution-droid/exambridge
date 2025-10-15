import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Plus, LogOut, User, TrendingUp, BookOpen, Award, Download, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [papers, setPapers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, papersRes, statsRes] = await Promise.all([
        axios.get(`${API}/auth/me`),
        axios.get(`${API}/papers`),
        axios.get(`${API}/quiz/stats`)
      ]);

      setUser(userRes.data);
      setPapers(papersRes.data.papers);
      setStats(statsRes.data);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/auth");
  };

  const handleDownload = async (paperId, paperTitle, withAnswers = false) => {
    // Prevent multiple simultaneous downloads
    const downloadKey = `${paperId}-${withAnswers}`;
    if (downloading === downloadKey) {
      return;
    }
    
    setDownloading(downloadKey);
    
    try {
      const endpoint = withAnswers 
        ? `${API}/papers/${paperId}/download-answers`
        : `${API}/papers/${paperId}/download`;
      
      const response = await axios.get(endpoint, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const suffix = withAnswers ? '_Answer_Key' : '';
      const filename = `${paperTitle.replace(/[^a-z0-9]/gi, '_')}${suffix}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      toast.success(withAnswers ? "Answer key downloaded!" : "Paper downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download");
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (paperId) => {
    if (!window.confirm("Are you sure you want to delete this paper?")) {
      return;
    }

    try {
      await axios.delete(`${API}/papers/${paperId}`);
      toast.success("Paper deleted successfully!");
      fetchData(); // Refresh the data
    } catch (error) {
      toast.error("Failed to delete paper");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-2xl font-semibold text-slate-700">Loading...</div>
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
          <div className="flex items-center gap-4">
            {user?.role === 'admin' && (
              <Button
                data-testid="admin-panel-btn"
                onClick={() => navigate('/admin')}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50 rounded-full"
              >
                Admin Panel
              </Button>
            )}
            <Button
              data-testid="logout-btn"
              onClick={handleLogout}
              variant="outline"
              className="border-slate-300 hover:border-red-500 hover:text-red-500 rounded-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-lg text-slate-600">
            Let's continue your exam preparation journey
          </p>
        </div>

        {/* Free Limit Warning Banner */}
        {!user?.subscription_plan && user?.free_papers_used >= user?.free_papers_limit && (
          <div className="mb-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">You've Used All Your Free Papers!</h3>
                  <p className="text-amber-50">
                    Upgrade to premium to generate unlimited question papers and unlock all features
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/subscriptions')}
                className="bg-white text-orange-600 hover:bg-orange-50 font-semibold px-6 py-3 rounded-full"
              >
                View Plans
              </Button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <div className="text-3xl font-bold mb-1">{papers.length}</div>
            <div className="text-blue-100 text-sm">Papers Generated</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats?.total_attempts || 0}</div>
            <div className="text-indigo-100 text-sm">Practice Attempts</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats?.average_score?.toFixed(1) || 0}%</div>
            <div className="text-teal-100 text-sm">Average Score</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8" />
            </div>
            <div className="text-3xl font-bold mb-1">{user?.free_papers_limit - user?.free_papers_used}</div>
            <div className="text-amber-100 text-sm">Free Papers Left</div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <Button
            data-testid="generate-paper-btn"
            onClick={() => navigate('/generator')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-6 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 text-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Generate New Paper
          </Button>
          <Button
            data-testid="view-results-btn"
            onClick={() => navigate('/results')}
            variant="outline"
            className="border-2 border-slate-300 hover:border-blue-600 text-slate-700 hover:text-blue-600 px-6 py-6 rounded-2xl font-semibold text-lg"
          >
            <TrendingUp className="w-5 h-5 mr-2" />
            View All Results
          </Button>
          <Button
            onClick={() => navigate('/transactions')}
            variant="outline"
            className="border-2 border-slate-300 hover:border-blue-600 text-slate-700 hover:text-blue-600 px-6 py-6 rounded-2xl font-semibold text-lg"
          >
            <Receipt className="w-5 h-5 mr-2" />
            Transactions
          </Button>
        </div>

        {/* Generated Papers */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Your Generated Papers</h2>
          
          {papers.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-lg text-slate-500 mb-4">No papers generated yet</p>
              <Button
                data-testid="first-paper-btn"
                onClick={() => navigate('/generator')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full"
              >
                Generate Your First Paper
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {papers.map((paper) => (
                <Card
                  key={paper.id}
                  className="p-6 border border-slate-200 rounded-xl hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{paper.paper_title}</h3>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                          {paper.exam_type}
                        </span>
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                          {paper.subject}
                        </span>
                        <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full font-medium">
                          {paper.total_marks} marks
                        </span>
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                          {paper.duration_minutes} mins
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        data-testid={`download-paper-${paper.id}-btn`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDownload(paper.id, paper.paper_title, false);
                        }}
                        disabled={downloading === `${paper.id}-false`}
                        variant="outline"
                        size="sm"
                        className="border-2 border-green-600 text-green-600 hover:bg-green-50 rounded-full disabled:opacity-50"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        {downloading === `${paper.id}-false` ? "..." : "Paper"}
                      </Button>
                      <Button
                        data-testid={`download-answers-${paper.id}-btn`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDownload(paper.id, paper.paper_title, true);
                        }}
                        disabled={downloading === `${paper.id}-true`}
                        variant="outline"
                        size="sm"
                        className="border-2 border-teal-600 text-teal-600 hover:bg-teal-50 rounded-full disabled:opacity-50"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        {downloading === `${paper.id}-true` ? "..." : "Answers"}
                      </Button>
                      <Button
                        data-testid={`practice-paper-${paper.id}-btn`}
                        onClick={() => navigate(`/practice/${paper.id}`)}
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full"
                      >
                        Practice Now
                      </Button>
                      <Button
                        data-testid={`delete-paper-${paper.id}-btn`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(paper.id);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-2 border-red-600 text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;