import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, ArrowLeft, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";

const Subscriptions = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Fetch plans and current user data
      const [plansRes, userRes] = await Promise.all([
        axios.get(`${API}/subscriptions/plans`),
        axios.get(`${API}/auth/me`, config)
      ]);

      // Filter only active plans
      const activePlans = plansRes.data.plans.filter(plan => plan.is_active);
      setPlans(activePlans);
      setCurrentUser(userRes.data);
    } catch (error) {
      toast.error("Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = (plan) => {
    setSelectedPlan(plan);
    setShowConfirmModal(true);
  };

  const confirmPayment = () => {
    // Store selected plan details in localStorage for payment tracking
    localStorage.setItem('pending_payment', JSON.stringify({
      plan_id: selectedPlan.id,
      plan_name: selectedPlan.name,
      amount: selectedPlan.price,
      currency: selectedPlan.currency || 'INR',
      timestamp: new Date().toISOString()
    }));
    
    // Open payment link in new tab (amount must be entered manually on Razorpay page)
    const paymentLink = "https://razorpay.me/@anjanaramprasadkekan";
    window.open(paymentLink, '_blank');
    
    setShowConfirmModal(false);
    
    // Show important instruction
    toast.info(`Please enter exactly ₹${selectedPlan.price} on the payment page`, { 
      duration: 5000 
    });
    
    // Redirect to payment pending page after 2 seconds
    setTimeout(() => {
      navigate('/payment-pending');
    }, 2000);
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
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="border-slate-300 hover:border-blue-600 hover:text-blue-600 rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Upgrade to unlock unlimited question paper generation and access to all features
          </p>
          
          {/* Current Status */}
          {currentUser && (
            <div className="mt-6 inline-block bg-blue-50 border border-blue-200 rounded-lg px-6 py-3">
              <p className="text-sm text-slate-700">
                Current Plan: <span className="font-semibold text-blue-600">
                  {currentUser.subscription_plan || "Free Tier"}
                </span>
              </p>
              {!currentUser.subscription_plan && (
                <p className="text-xs text-slate-500 mt-1">
                  Papers Used: {currentUser.free_papers_used || 0} / {currentUser.free_papers_limit || 1}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={plan.id} 
              className={`p-8 rounded-2xl shadow-xl border-2 transition-all hover:scale-105 ${
                index === 1 
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50' 
                  : 'border-slate-200 bg-white'
              }`}
            >
              {/* Popular Badge */}
              {index === 1 && (
                <div className="bg-blue-600 text-white text-sm font-semibold px-4 py-1 rounded-full inline-block mb-4">
                  Most Popular
                </div>
              )}
              
              {/* Plan Name */}
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                {plan.name}
              </h3>
              
              {/* Price */}
              <div className="mb-6">
                <span className="text-5xl font-bold text-blue-600">
                  ₹{plan.price}
                </span>
                <span className="text-slate-600 ml-2">
                  / {plan.duration_days === 30 ? 'month' : plan.duration_days === 365 ? 'year' : `${plan.duration_days} days`}
                </span>
              </div>
              
              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {/* Subscribe Button */}
              <Button
                onClick={() => handleSubscribe(plan)}
                className={`w-full rounded-full py-6 text-lg font-semibold ${
                  index === 1
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                Subscribe Now
                <ExternalLink className="w-5 h-5 ml-2" />
              </Button>
            </Card>
          ))}
        </div>

        {/* Note about temporary payment */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500 max-w-2xl mx-auto">
            <strong>Note:</strong> After completing your payment, please contact our support team 
            with your transaction details to activate your subscription. We'll activate your plan within 24 hours.
          </p>
        </div>

        {/* Features Comparison */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            Why Upgrade?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Unlimited Papers
              </h3>
              <p className="text-slate-600">
                Generate as many question papers as you need, whenever you need them
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Instant Access
              </h3>
              <p className="text-slate-600">
                AI-powered generation creates papers in seconds, not hours
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                All Exam Types
              </h3>
              <p className="text-slate-600">
                Support for NEET, JEE, UPSC, School exams, and 15+ more
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              Confirm Your Subscription
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              Please review your subscription details before proceeding to payment
            </DialogDescription>
          </DialogHeader>
          
          {selectedPlan && (
            <div className="py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
                <h4 className="text-lg font-bold text-slate-900 mb-2">{selectedPlan.name}</h4>
                <div className="flex items-baseline mb-4">
                  <span className="text-4xl font-bold text-blue-600">₹{selectedPlan.price}</span>
                  <span className="text-slate-600 ml-2">
                    / {selectedPlan.duration_days === 30 ? 'month' : selectedPlan.duration_days === 365 ? 'year' : `${selectedPlan.duration_days} days`}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <h5 className="font-semibold text-slate-900 text-sm">Features:</h5>
                  {selectedPlan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center text-sm text-slate-700">
                      <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800 font-medium mb-2">⚠️ Important Instructions:</p>
                <ul className="text-sm text-amber-700 space-y-2">
                  <li className="flex items-start">
                    <span className="font-bold mr-2">1.</span>
                    <span>On the Razorpay payment page, <strong>enter exactly ₹{selectedPlan.price}</strong> in the amount field</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">2.</span>
                    <span>Complete the payment process</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">3.</span>
                    <span>Save your payment screenshot and transaction ID</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">4.</span>
                    <span>Submit payment details on the next page to activate subscription</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <Button
              onClick={confirmPayment}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full py-6 text-base font-semibold"
            >
              Proceed to Payment
              <ExternalLink className="w-5 h-5 ml-2" />
            </Button>
            <Button
              onClick={() => setShowConfirmModal(false)}
              variant="outline"
              className="w-full rounded-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subscriptions;
