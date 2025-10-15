import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, ArrowLeft, Download, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

const Transactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const response = await axios.get(`${API}/transactions`, config);
      setTransactions(response.data.transactions);
    } catch (error) {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = async (transactionId, transactionNumber) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API}/transactions/${transactionId}/receipt`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt_${transactionNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("Receipt downloaded successfully");
    } catch (error) {
      toast.error("Failed to download receipt");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Transaction History
          </h1>
          <p className="text-lg text-slate-600">
            View all your subscription payments and download receipts
          </p>
        </div>

        {transactions.length === 0 ? (
          <Card className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Receipt className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Transactions Yet</h3>
            <p className="text-slate-600 mb-6">
              You haven't made any subscription payments yet
            </p>
            <Button
              onClick={() => navigate('/subscriptions')}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
            >
              View Subscription Plans
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <Card key={transaction.id} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {transaction.plan_name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        transaction.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : transaction.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {transaction.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Transaction Number</p>
                        <p className="font-semibold text-slate-900">{transaction.transaction_number}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Amount</p>
                        <p className="font-semibold text-slate-900">₹{transaction.amount}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Date</p>
                        <p className="font-semibold text-slate-900">{formatDate(transaction.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Validity</p>
                        <p className="font-semibold text-slate-900">
                          {formatDate(transaction.validity_start)} - {formatDate(transaction.validity_end)}
                        </p>
                      </div>
                    </div>
                    
                    {transaction.payment_method && (
                      <div className="mt-3 text-sm">
                        <span className="text-slate-500">Payment Method: </span>
                        <span className="font-medium text-slate-900">{transaction.payment_method}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-6">
                    <Button
                      onClick={() => downloadReceipt(transaction.id, transaction.transaction_number)}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Receipt
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
