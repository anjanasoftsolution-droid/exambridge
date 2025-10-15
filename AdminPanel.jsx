import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, ArrowLeft, Users, Award, TrendingUp, BookOpen, Plus, Edit, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users"); // users, plans, or transactions
  
  // Plan modal state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    price: "",
    currency: "INR",
    papers_limit: "",
    duration_days: "",
    features: ""
  });

  // Transaction modal state
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    user_id: "",
    plan_id: "",
    amount: "",
    payment_id: "",
    payment_method: "Razorpay",
    notes: ""
  });

  // Edit user modal state
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    free_papers_limit: "",
    subscription_plan: "",
    papers_limit: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const [statsRes, usersRes, plansRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, config),
        axios.get(`${API}/admin/users`, config),
        axios.get(`${API}/admin/plans`, config)
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setPlans(plansRes.data.plans);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error("Admin access required");
        navigate("/dashboard");
      } else {
        toast.error("Failed to load admin data");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.put(
        `${API}/admin/users/${userId}/status?is_active=${!currentStatus}`,
        {},
        config
      );
      
      toast.success(`User ${!currentStatus ? "activated" : "deactivated"} successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update user status");
    }
  };

  const togglePlanStatus = async (planId, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      await axios.put(
        `${API}/admin/plans/${planId}/status?is_active=${!currentStatus}`,
        {},
        config
      );
      
      toast.success(`Plan ${!currentStatus ? "activated" : "deactivated"} successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update plan status");
    }
  };

  const openCreatePlan = () => {
    setPlanForm({
      name: "",
      price: "",
      currency: "INR",
      papers_limit: "",
      duration_days: "",
      features: ""
    });
    setEditingPlan(null);
    setShowPlanModal(true);
  };

  const openEditPlan = (plan) => {
    setPlanForm({
      name: plan.name,
      price: plan.price.toString(),
      currency: plan.currency || "INR",
      papers_limit: plan.papers_limit.toString(),
      duration_days: plan.duration_days.toString(),
      features: plan.features.join("\n")
    });
    setEditingPlan(plan);
    setShowPlanModal(true);
  };

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const planData = {
        name: planForm.name,
        price: parseFloat(planForm.price),
        currency: planForm.currency,
        papers_limit: parseInt(planForm.papers_limit),
        duration_days: parseInt(planForm.duration_days),
        features: planForm.features.split("\n").filter(f => f.trim())
      };

      if (editingPlan) {
        await axios.put(`${API}/admin/plans/${editingPlan.id}`, planData, config);
        toast.success("Plan updated successfully");
      } else {
        await axios.post(`${API}/admin/plans`, planData, config);
        toast.success("Plan created successfully");
      }
      
      setShowPlanModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save plan");
    }
  };


  const openEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      free_papers_limit: user.free_papers_limit?.toString() || "1",
      subscription_plan: user.subscription_plan || "",
      papers_limit: user.papers_limit?.toString() || "1"
    });
    setShowEditUserModal(true);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Find selected plan to get validity
      const selectedPlan = plans.find(p => p.name === userForm.subscription_plan);
      
      const userData = {
        free_papers_limit: parseInt(userForm.free_papers_limit),
        subscription_plan: userForm.subscription_plan || null,
        papers_limit: selectedPlan ? selectedPlan.papers_limit : parseInt(userForm.papers_limit)
      };

      // If assigning a plan, calculate expiry
      if (selectedPlan) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + selectedPlan.duration_days);
        userData.subscription_expiry = expiryDate.toISOString();
      }

      await axios.put(`${API}/admin/users/${editingUser.id}/details`, userData, config);
      toast.success("User updated successfully");
      
      setShowEditUserModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update user");
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
              SOS-Tools Admin
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
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Admin Panel</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats?.total_users || 0}</div>
            <div className="text-blue-100 text-sm">Total Users</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats?.total_papers || 0}</div>
            <div className="text-indigo-100 text-sm">Papers Generated</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats?.total_attempts || 0}</div>
            <div className="text-teal-100 text-sm">Quiz Attempts</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats?.active_subscriptions || 0}</div>
            <div className="text-amber-100 text-sm">Active Subscriptions</div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          <Button
            onClick={() => setActiveTab("users")}
            className={`rounded-full px-6 ${
              activeTab === "users"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Users
          </Button>
          <Button
            onClick={() => setActiveTab("plans")}
            className={`rounded-full px-6 ${
              activeTab === "plans"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Award className="w-4 h-4 mr-2" />
            Subscription Plans
          </Button>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <Card className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">All Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Free Papers</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Subscription</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-700">{user.name}</td>
                      <td className="py-3 px-4 text-slate-700">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          user.is_active !== false
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {user.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {user.free_papers_used || 0} / {user.free_papers_limit || 5}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {user.subscription_plan ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            {user.subscription_plan}
                          </span>
                        ) : (
                          <span className="text-slate-500">Free Tier</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => openEditUser(user)}
                            size="sm"
                            variant="outline"
                            className="rounded-full border-blue-500 text-blue-500 hover:bg-blue-50"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => toggleUserStatus(user.id, user.is_active !== false)}
                            size="sm"
                            className={`rounded-full ${
                              user.is_active !== false
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-green-500 hover:bg-green-600'
                            }`}
                          >
                            {user.is_active !== false ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Plans Tab */}
        {activeTab === "plans" && (
          <Card className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Subscription Plans</h2>
              <Button
                onClick={openCreatePlan}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Plan
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card key={plan.id} className={`p-6 border-2 ${
                  plan.is_active ? 'border-blue-300' : 'border-slate-200 opacity-60'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-3xl font-bold text-blue-600 mt-2">
                        ₹{plan.price}
                        <span className="text-sm text-slate-500 ml-1">/ {plan.duration_days} days</span>
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      plan.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-slate-600 mb-2">
                      Papers: {plan.papers_limit === -1 ? 'Unlimited' : plan.papers_limit}
                    </p>
                    <p className="text-sm text-slate-600">Currency: {plan.currency || 'INR'}</p>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Features:</p>
                    <ul className="space-y-1">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-slate-600">• {feature}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => openEditPlan(plan)}
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-full"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => togglePlanStatus(plan.id, plan.is_active)}
                      size="sm"
                      className={`flex-1 rounded-full ${
                        plan.is_active
                          ? 'bg-red-500 hover:bg-red-600'
                          : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      {plan.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Plan Create/Edit Modal */}
      <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </DialogTitle>
            <DialogDescription>
              {editingPlan ? 'Update subscription plan details' : 'Add a new subscription plan'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handlePlanSubmit} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                placeholder="e.g., Monthly Plan"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                  placeholder="999"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={planForm.currency}
                  onChange={(e) => setPlanForm({ ...planForm, currency: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="papers_limit">Papers Limit</Label>
                <Input
                  id="papers_limit"
                  type="number"
                  value={planForm.papers_limit}
                  onChange={(e) => setPlanForm({ ...planForm, papers_limit: e.target.value })}
                  placeholder="-1 for unlimited"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="duration_days">Duration (Days)</Label>
                <Input
                  id="duration_days"
                  type="number"
                  value={planForm.duration_days}
                  onChange={(e) => setPlanForm({ ...planForm, duration_days: e.target.value })}
                  placeholder="30 for monthly, 365 for annual"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="features">Features (one per line)</Label>
              <Textarea
                id="features"
                value={planForm.features}
                onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                placeholder="Unlimited questions&#10;All exam types&#10;Priority support"
                rows={5}
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPlanModal(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
              >
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditUserModal} onOpenChange={setShowEditUserModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Edit User Details
            </DialogTitle>
            <DialogDescription>
              Update user subscription and limits
            </DialogDescription>
          </DialogHeader>
          
          {editingUser && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="font-semibold text-slate-900">{editingUser.name}</p>
              <p className="text-sm text-slate-600">{editingUser.email}</p>
            </div>
          )}
          
          <form onSubmit={handleUserSubmit} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="free_papers_limit">Free Papers Limit</Label>
              <Input
                id="free_papers_limit"
                type="number"
                value={userForm.free_papers_limit}
                onChange={(e) => setUserForm({ ...userForm, free_papers_limit: e.target.value })}
                placeholder="1"
                required
                min="0"
              />
              <p className="text-xs text-slate-500 mt-1">Number of free papers user can generate</p>
            </div>
            
            <div>
              <Label htmlFor="subscription_plan">Subscription Plan</Label>
              <select
                id="subscription_plan"
                value={userForm.subscription_plan}
                onChange={(e) => setUserForm({ ...userForm, subscription_plan: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No Subscription (Free Tier)</option>
                {plans.filter(p => p.is_active).map((plan) => (
                  <option key={plan.id} value={plan.name}>
                    {plan.name} - ₹{plan.price} ({plan.duration_days} days)
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Assign a subscription plan to the user</p>
            </div>

            {!userForm.subscription_plan && (
              <div>
                <Label htmlFor="papers_limit">Papers Limit (if no subscription)</Label>
                <Input
                  id="papers_limit"
                  type="number"
                  value={userForm.papers_limit}
                  onChange={(e) => setUserForm({ ...userForm, papers_limit: e.target.value })}
                  placeholder="1"
                  min="-1"
                />
                <p className="text-xs text-slate-500 mt-1">Use -1 for unlimited papers</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditUserModal(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
              >
                Update User
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
