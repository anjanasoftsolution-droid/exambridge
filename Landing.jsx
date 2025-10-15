import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, BookOpen, TrendingUp, Award, Users, Clock } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <FileText className="w-8 h-8" />,
      title: "AI-Powered Generation",
      description: "Generate custom question papers using advanced AI for NEET, JEE, UPSC, and more"
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: "Online Practice",
      description: "Practice papers online with instant scoring and detailed performance analysis"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Track Progress",
      description: "Monitor your performance with detailed statistics and improvement insights"
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Multiple Exam Types",
      description: "Support for NEET, JEE, UPSC, MPSC, NDA, GATE, and school-level exams"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "For Everyone",
      description: "Perfect for students, teachers, and coaching institutes"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Save Time",
      description: "Generate complete papers in minutes, not hours"
    }
  ];

  const examTypes = [
    "NEET", "JEE", "UPSC", "MPSC", "NDA", "GATE", "SSC", "Railway",
    "Banking", "School Boards", "CLAT", "CAT"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              SOS-Tools
            </span>
          </div>
          <Button
            data-testid="nav-get-started-btn"
            onClick={() => navigate("/auth")}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block mb-4 px-4 py-2 bg-blue-100 rounded-full">
          <span className="text-blue-700 font-semibold text-sm">AI-Powered Question Paper Generator</span>
        </div>
        <h1 className="text-6xl md:text-7xl font-extrabold text-slate-900 mb-6 leading-tight">
          Master Your Exams with
          <br />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            AI-Generated Papers
          </span>
        </h1>
        <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
          Generate custom question papers for NEET, JEE, UPSC, MPSC, and more. Practice online,
          track your progress, and ace your exams with confidence.
        </p>
        <div className="flex justify-center gap-4 mb-16">
          <Button
            data-testid="hero-get-started-btn"
            onClick={() => navigate("/auth")}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 rounded-full text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
          >
            Start Generating Papers
          </Button>
          <Button
            data-testid="hero-learn-more-btn"
            onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
            size="lg"
            variant="outline"
            className="border-2 border-slate-300 hover:border-blue-600 text-slate-700 hover:text-blue-600 px-8 py-6 rounded-full text-lg font-semibold transition-all duration-300"
          >
            Learn More
          </Button>
        </div>

        {/* Exam Types */}
        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {examTypes.map((exam, index) => (
            <div
              key={index}
              className="px-4 py-2 bg-white rounded-full border border-slate-200 text-slate-700 font-medium text-sm hover:border-blue-500 hover:text-blue-600 hover:shadow-md transition-all duration-200 cursor-default"
            >
              {exam}
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-slate-900 mb-4">Powerful Features</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Everything you need to prepare effectively for competitive exams
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-8 bg-white border border-slate-200 rounded-2xl hover:shadow-2xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-600 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Get started in 3 simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-blue-600">
                1
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Configure Your Paper</h3>
              <p className="text-blue-100">
                Select exam type, subject, topics, and question types
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-blue-600">
                2
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">AI Generates Questions</h3>
              <p className="text-blue-100">
                Our advanced AI creates relevant, high-quality questions
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold text-blue-600">
                3
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Practice & Excel</h3>
              <p className="text-blue-100">
                Take tests online, track progress, and improve continuously
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl font-bold text-slate-900 mb-6">
          Ready to Start Your Journey?
        </h2>
        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
          Join thousands of students who are already using SOS-Tools to ace their exams
        </p>
        <Button
          data-testid="cta-get-started-btn"
          onClick={() => navigate("/auth")}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-10 py-6 rounded-full text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
        >
          Get Started for Free
        </Button>
        <p className="text-sm text-slate-500 mt-4">5 free papers included. No credit card required.</p>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">SOS-Tools</span>
          </div>
          <p className="text-slate-400 mb-4">
            Empowering students with AI-powered learning tools
          </p>
          <p className="text-slate-500 text-sm">
            © 2024 SOS-Tools. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;