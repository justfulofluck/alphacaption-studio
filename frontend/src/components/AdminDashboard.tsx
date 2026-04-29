"use client"

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Users,
  CreditCard,
  Cpu,
  BarChart3,
  Loader2,
  ShieldCheck,
  Zap,
  ServerIcon,
  PlusCircle,
  History,
  X,
  UserCog
} from 'lucide-react';
import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar"
import { StudioSidebar } from "@/components/StudioSidebar"
import { SiteHeader } from "@/components/site-header"
import { SectionCards } from "@/components/section-cards"
import { DashboardTable } from "@/components/DashboardTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { API_BASE_URL } from "@/api/config";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscribers: 0,
    totalTokensUsed: 0,
    monthlyRevenue: "$0"
  });

  // Modal states
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    price: 0,
    credits_included: 0,
    validity_days: 30,
    amount: 10,
    reason: 'Admin Gift',
    role: 'user',
    plan: 'free'
  });

  const queryParams = new URLSearchParams(location.search);
  const section = queryParams.get('section') || 'users';

  const fetchData = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token || token === 'undefined' || token === 'null') {
      navigate('/admin/login');
      return;
    }

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [meRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/auth/me`, { headers }),
        axios.get(`${API_BASE_URL}/api/auth/admin/stats`, { headers })
      ]);
      setAdminUser(meRes.data);
      setStats(statsRes.data);

      let contentUrl = `${API_BASE_URL}/api/auth/admin/users`;
      if (section === 'ledger') contentUrl = `${API_BASE_URL}/api/admin/ledger`;
      if (section === 'payments') contentUrl = `${API_BASE_URL}/api/admin/payments`;
      if (section === 'plans') contentUrl = `${API_BASE_URL}/api/admin/plans`;

      const contentRes = await axios.get(contentUrl, { headers });
      setData(contentRes.data);
    } catch (err) {
      console.error("[AdminDashboard] Data fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate, section]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    try {
      await axios.post(`${API_BASE_URL}/api/admin/plans`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowPlanModal(false);
      fetchData();
    } catch (err) {
      alert("Failed to create plan");
    }
  };

  const handleAddCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    try {
      await axios.post(`${API_BASE_URL}/api/admin/users/${selectedRow.id}/add-credits`, {
        amount: formData.amount,
        reason: formData.reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCreditModal(false);
      fetchData();
    } catch (err) {
      alert("Failed to add credits");
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    try {
      await axios.put(`${API_BASE_URL}/api/admin/users/${selectedRow.id}`, {
        role: formData.role,
        plan: formData.plan
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowEditUserModal(false);
      fetchData();
    } catch (err) {
      alert("Failed to update user");
    }
  };

  const handleDeleteUser = async (user_id: number) => {
    if (!confirm("Permanently delete this user? This cannot be undone.")) return;
    const token = localStorage.getItem('admin_token');
    try {
      await axios.delete(`${API_BASE_URL}/api/admin/users/${user_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert("Failed to delete user");
    }
  };

  const onTableAction = (action: string, row: any) => {
    setSelectedRow(row);
    if (action === 'add_credits') {
      setShowCreditModal(true);
    } else if (action === 'edit_user') {
      setFormData({ ...formData, role: row.role, plan: row.plan });
      setShowEditUserModal(true);
    } else if (action === 'delete') {
      if (section === 'users') {
        handleDeleteUser(row.id);
      }
    }
  };

  const statCards = [
    {
      description: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      footerLabel: "User Growth",
      footerDescription: "+12.5% this month",
      isUp: true,
      actionLabel: "Healthy"
    },
    {
      description: "Active Subs",
      value: stats.activeSubscribers,
      icon: ShieldCheck,
      footerLabel: "Retention",
      footerDescription: "High subscription rate",
      isUp: true,
      actionLabel: "+5.2%"
    },
    {
      description: "Tokens Consumed",
      value: `${(stats.totalTokensUsed / 1000000).toFixed(1)}M`,
      icon: Cpu,
      footerLabel: "AI Usage",
      footerDescription: "Steady API utilization",
      isUp: true,
      actionLabel: "Optimal"
    },
    {
      description: "Revenue",
      value: stats.monthlyRevenue,
      icon: BarChart3,
      footerLabel: "MRR",
      footerDescription: "Monthly Recurring Revenue",
      isUp: true,
      actionLabel: "Growth"
    }
  ];

  const getColumns = () => {
    switch (section) {
      case 'ledger':
        return [
          { header: "User ID", accessorKey: "user_id" },
          { header: "Amount", accessorKey: "amount" },
          { header: "Type", accessorKey: "type" },
          { header: "Description", accessorKey: "description" },
          { header: "Date", accessorKey: "created_at" }
        ];
      case 'payments':
        return [
          { header: "User ID", accessorKey: "user_id" },
          { header: "Amount", accessorKey: "amount" },
          { header: "Currency", accessorKey: "currency" },
          { header: "Status", accessorKey: "status" },
          { header: "Date", accessorKey: "created_at" }
        ];
      case 'plans':
        return [
          { header: "Name", accessorKey: "name" },
          { header: "Price", accessorKey: "price" },
          { header: "Credits", accessorKey: "credits_included" },
          { header: "Validity (Days)", accessorKey: "validity_days" }
        ];
      default:
        return [
          { header: "User Name", accessorKey: "name" },
          { header: "Email Address", accessorKey: "email" },
          { header: "Subscription", accessorKey: "plan" },
          { header: "Role", accessorKey: "role" }
        ];
    }
  };

  const getTitle = () => {
    if (section === 'ledger') return "Credit Ledger History";
    if (section === 'payments') return "Payment History";
    if (section === 'plans') return "Membership Plans";
    return "User Management";
  };

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "280px",
        "--header-height": "64px",
      } as React.CSSProperties}
    >
      <StudioSidebar user={{
        name: adminUser?.name || "Admin",
        email: adminUser?.email || "",
        role: adminUser?.role || "admin"
      }} />
      <SidebarInset>
        <SiteHeader user={{ name: adminUser?.name || "Admin", avatar: adminUser?.avatar }} />
        <div className="flex flex-1 flex-col gap-8 p-4 md:p-8 pt-6">
          {section === 'users' ? (
            <div className="flex items-center justify-between space-y-2">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-zinc-900 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">
                    Production Mode
                  </span>
                  <span className="text-muted-foreground text-sm flex items-center gap-1 ml-2">
                    <ServerIcon size={14} /> System Healthy
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold tracking-tight">{getTitle()}</h1>
              {section === 'plans' && (
                <Button className="font-bold flex items-center gap-2" onClick={() => setShowPlanModal(true)}>
                  <PlusCircle size={18} />
                  Create New Plan
                </Button>
              )}
            </div>
          )}

          {section === 'users' && <SectionCards cards={statCards} />}

          <div className="space-y-4">
            {loading ? (
              <div className="h-64 flex items-center justify-center border rounded-xl bg-muted/10">
                <Loader2 className="animate-spin text-muted-foreground" />
              </div>
            ) : (
              <DashboardTable
                title={getTitle()}
                data={data}
                columns={getColumns()}
                section={section}
                onAction={onTableAction}
              />
            )}
          </div>
        </div>

        {/* Create Plan Modal */}
        {showPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold tracking-tight">Create New Plan</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowPlanModal(false)}><X size={20} /></Button>
              </div>
              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div className="space-y-2">
                  <span className="text-sm font-bold uppercase tracking-widest opacity-50 text-[10px]">Plan Name</span>
                  <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Starter Pack" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-sm font-bold uppercase tracking-widest opacity-50 text-[10px]">Price (INR)</span>
                    <Input type="number" required value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-bold uppercase tracking-widest opacity-50 text-[10px]">Credits (Mins)</span>
                    <Input type="number" required value={formData.credits_included} onChange={e => setFormData({ ...formData, credits_included: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-bold uppercase tracking-widest opacity-50 text-[10px]">Validity (Days)</span>
                  <Input type="number" required value={formData.validity_days} onChange={e => setFormData({ ...formData, validity_days: Number(e.target.value) })} />
                </div>
                <Button type="submit" className="w-full font-bold h-12 mt-4 transition-all">Create Membership Plan</Button>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                    <UserCog size={24} /> Manage Account
                  </h2>
                  <p className="text-sm text-muted-foreground">Updating access for {selectedRow?.email}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowEditUserModal(false)}><X size={20} /></Button>
              </div>
              <form onSubmit={handleEditUser} className="space-y-6 pt-4">
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-50">Assigned Role</span>
                  <Select value={formData.role} onValueChange={val => setFormData({ ...formData, role: val })}>
                    <SelectTrigger className="w-full h-12">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Standard User</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-50">Current Membership</span>
                  <Select value={formData.plan} onValueChange={val => setFormData({ ...formData, plan: val })}>
                    <SelectTrigger className="w-full h-12">
                      <SelectValue placeholder="Select Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free Tier</SelectItem>
                      <SelectItem value="starter">Starter Plan</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full font-bold h-12 mt-4 bg-zinc-900 text-white hover:bg-zinc-800">
                  Save Account Changes
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Add Credits Modal */}
        {showCreditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Add Credits</h2>
                  <p className="text-sm text-muted-foreground">Adjusting balance for {selectedRow?.email}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowCreditModal(false)}><X size={20} /></Button>
              </div>
              <form onSubmit={handleAddCredits} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-50">Amount (Minutes)</span>
                  <Input type="number" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-50">Reason / Reference</span>
                  <Input required value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} />
                </div>
                <Button type="submit" className="w-full font-bold h-12 mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
                  Apply Adjustment
                </Button>
              </form>
            </div>
          </div>
        )}

      </SidebarInset>
    </SidebarProvider>
  );
}
