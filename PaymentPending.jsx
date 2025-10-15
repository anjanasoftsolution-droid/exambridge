import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, CheckCircle, Upload, ArrowRight, Clock } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const PaymentPending = () => {
  const navigate = useNavigate();
  const [pendingPayment, setPendingPayment] = useState(null);

  useEffect(() => {
    // Get pending payment details from localStorage
    const pending = localStorage.getItem('pending_payment');
    if (pending) {
      setPendingPayment(JSON.parse(pending));
    }
  }, []);

  const handlePaymentCompleted = () => {
    // Clear pending payment
    localStorage.removeItem('pending_payment');
    toast.success("Thank you! Please contact support with your payment details.");
    
    // Redirect to transactions after 2 seconds
    setTimeout(() => {
      navigate('/transactions');
    }, 2000);
  };

  const handleContactSupport = () => {
    // Open email client with pre-filled details
    const subject = encodeURIComponent(`Payment Confirmation - ${pendingPayment?.plan_name || 'Subscription'}`);
    const body = encodeURIComponent(`Hello,

I have completed the payment for ${pendingPayment?.plan_name || 'subscription plan'}.

Payment Details:
- Plan: ${pendingPayment?.plan_name || 'N/A'}
- Amount: ₹${pendingPayment?.amount || 'N/A'}
- Date: ${pendingPayment?.timestamp ? new Date(pendingPayment.timestamp).toLocaleString() : 'N/A'}
- Transaction ID/Payment ID: [Please enter your transaction ID]

Please activate my subscription.

Thank you!`);
    
    window.location.href = `mailto:support@sostools.com?subject=${subject}&body=${body}`;
  };

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
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Payment In Progress
          </h1>
          <p className="text-lg text-slate-600">
            Complete your payment and submit the details below
          </p>
        </div>

        {pendingPayment && (
          <Card className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{pendingPayment.plan_name}</h3>
                <p className="text-slate-600">Selected Plan</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600">₹{pendingPayment.amount}</p>
                <p className="text-sm text-slate-600">{pendingPayment.currency}</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-1">Step 1: Complete Payment</h4>
                  <p className="text-slate-600 text-sm mb-2">
                    On the Razorpay page that opened in a new tab:
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded px-3 py-2">
                    <p className="text-green-800 text-sm font-semibold">
                      ⚠️ Enter exactly <span className="text-xl">₹{pendingPayment.amount}</span> in the amount field
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-1">Step 2: Save Payment Details</h4>
                  <p className="text-slate-600 text-sm">
                    After payment, note down your Transaction ID or take a screenshot of the payment confirmation.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-1">Step 3: Contact Support</h4>
                  <p className="text-slate-600 text-sm">
                    Send your payment details to our support team for subscription activation.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Button
            onClick={handleContactSupport}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full py-6 text-base font-semibold"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Support via Email
          </Button>
          
          <Button
            onClick={handlePaymentCompleted}
            variant="outline"
            className="w-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-full py-6 text-base font-semibold"
          >
            I've Completed Payment
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        <Card className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-slate-900 mb-2">📧 Support Email</h4>
          <p className="text-slate-700 mb-2">support@sostools.com</p>
          <p className="text-sm text-slate-600">
            Our support team will activate your subscription within 24 hours after payment verification.
          </p>
        </Card>

        <div className="text-center mt-8">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            className="text-slate-600 hover:text-slate-900"
          >
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPending;
