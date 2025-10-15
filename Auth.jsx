import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { FileText, Mail, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    mobile: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/signup";
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, payload);
      
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      
      toast.success(isLogin ? "Login successful!" : "Account created successfully!");
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <Toaster position="top-center" richColors />
      
      <Card className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl p-8">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center">
            <FileText className="w-8 h-8 text-white" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center text-slate-900 mb-2">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>
        <p className="text-center text-slate-600 mb-8">
          {isLogin ? "Login to continue your journey" : "Start your exam preparation today"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 font-medium">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="name"
                    data-testid="name-input"
                    type="text"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-11 h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                    required={!isLogin}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mobile" className="text-slate-700 font-medium">
                  Mobile Number (Optional)
                </Label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="pl-11 h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700 font-medium">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="email"
                data-testid="email-input"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-11 h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-700 font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                id="password"
                data-testid="password-input"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-11 h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                required
              />
            </div>
          </div>

          <Button
            data-testid="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            data-testid="toggle-auth-mode-btn"
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;