/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Settings,
  Camera,
  CheckCircle2,
  ShieldCheck,
  Globe,
  Loader2,
  Lock,
  Zap,
  CreditCard,
  Clock,
  ArrowUpRight,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

import { API_BASE_URL } from "@/api/config";
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileText, ExternalLink, AlertCircle } from 'lucide-react';

export default function ProfileSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'profile';

  const [userData, setUserData] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    company: '',
    language: 'English (US)'
  });

  const fetchData = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [userRes, creditRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/auth/me`, { headers }),
        axios.get(`${API_BASE_URL}/api/credit/balance`, { headers }),
        axios.get(`${API_BASE_URL}/api/credit/history`, { headers })
      ]);

      setUserData(userRes.data);
      setCredits(creditRes.data.balance);
      setHistory(historyRes.data || []);

      setFormData(prev => ({
        ...prev,
        name: userRes.data.name || '',
        email: userRes.data.email || '',
        mobile: userRes.data.phone || ''
      }));
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('auth_token');
        navigate('/login');
      }
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate, location.search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
    setError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const exportToCSV = () => {
    if (!history.length) return;
    
    const headers = ["Reference ID", "Date", "Type", "Amount"];
    const rows = history.map(item => [
      `TXN-${item.id}`,
      new Date(item.created_at).toLocaleDateString(),
      item.type === 'credit' ? 'Credit Added' : 'Credit Used',
      `${item.type === 'credit' ? '+' : '-'}${item.amount}m`
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `billing_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(history.length / itemsPerPage);
  const paginatedHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('auth_token');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Update Profile Info
      await axios.put(`${API_BASE_URL}/api/auth/profile`,
        { 
          name: formData.name,
          phone: formData.mobile
        },
        { headers }
      );

      // Update Password if fields are filled
      if (passwordData.old_password || passwordData.new_password) {
        if (passwordData.new_password !== passwordData.confirm_password) {
          setError('New passwords do not match');
          setLoading(false);
          return;
        }
        await axios.post(`${API_BASE_URL}/api/auth/change-password`,
          {
            old_password: passwordData.old_password,
            new_password: passwordData.new_password
          },
          { headers }
        );
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // If password was changed, we might want to log out, but user asked to integrate it, 
      // so we'll just keep them logged in unless the backend invalidates the token.
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (fetching) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-zinc-900" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 font-sans">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tight">
            {activeTab === 'subscription' ? 'Subscription & Billing' : 'Profile Settings'}
          </h1>
          <p className="text-zinc-500 mt-3 font-medium text-lg">
            {activeTab === 'subscription'
              ? 'Manage your plan, credits, and view your billing history.'
              : 'Update your personal information and security preferences.'}
          </p>
        </div>

        <div className="flex bg-zinc-900 border border-white/5 p-1.5 rounded-[2rem] shadow-2xl">
          <button
            onClick={() => navigate('/settings')}
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'profile' ? 'bg-white/5 text-white shadow-xl' : 'text-zinc-500 hover:text-white'}`}
          >
            Profile
          </button>
          <button
            onClick={() => navigate('/settings?tab=subscription')}
            className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'subscription' ? 'bg-[#ff7800] text-white shadow-[0_0_20px_rgba(255,120,0,0.3)]' : 'text-zinc-500 hover:text-white'}`}
          >
            Subscription
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${activeTab === 'profile' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-10`}>
        {/* Left Side (Only for Profile Tab) */}
        {activeTab === 'profile' && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col items-center text-center group relative overflow-hidden">
              <div className="relative group mb-6">
                <div className="w-28 h-28 rounded-full bg-[#ff7800]/10 border-4 border-white/5 shadow-2xl flex items-center justify-center text-[#ff7800] font-black text-4xl overflow-hidden group-hover:scale-105 transition-transform">
                  {getInitials(formData.name)}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-zinc-900">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <h3 className="font-black text-2xl text-white mb-1 leading-none">{formData.name}</h3>
              <p className="text-sm font-bold text-zinc-500 mb-6">{formData.email}</p>

              <div className="w-full space-y-3 pt-6 border-t border-white/5">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <Zap size={18} className="text-[#ff7800] fill-[#ff7800]/20" />
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Credits</span>
                  </div>
                  <span className="font-black text-white">{credits}m</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className="text-zinc-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">Tier</span>
                  </div>
                  <span className="font-black text-[#ff7800] uppercase text-[10px] tracking-widest">{userData?.plan}</span>
                </div>
              </div>
              
              {/* Subtle orange glow */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#ff7800]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )}

        {/* Right Content Section (Becomes Full Width on Subscription) */}
        <div className={activeTab === 'profile' ? 'lg:col-span-2' : 'lg:col-span-1'}>
          <AnimatePresence mode="wait">
            {activeTab === 'profile' ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-zinc-900/40 backdrop-blur-xl p-8 sm:p-12 rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden"
              >
                <form onSubmit={handleSubmit} className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <label htmlFor="name" className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#ff7800] transition-colors" size={20} />
                        <input
                          type="text" id="name" name="name" value={formData.name} onChange={handleChange}
                          className="w-full pl-14 pr-6 py-4.5 bg-white/5 border border-white/5 rounded-2xl text-sm font-bold text-white focus:ring-2 focus:ring-[#ff7800]/50 focus:border-transparent transition-all outline-none placeholder:text-zinc-700"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label htmlFor="email" className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
                        <input
                          type="email" id="email" value={formData.email} disabled
                          className="w-full pl-14 pr-6 py-4.5 bg-white/[0.02] border border-white/5 rounded-2xl text-sm font-bold text-zinc-500 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label htmlFor="mobile" className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#ff7800] transition-colors" size={20} />
                        <input
                          type="tel" id="mobile" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="+91 00000 00000"
                          className="w-full pl-14 pr-6 py-4.5 bg-white/5 border border-white/5 rounded-2xl text-sm font-bold text-white focus:ring-2 focus:ring-[#ff7800]/50 focus:border-transparent transition-all outline-none placeholder:text-zinc-700"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label htmlFor="language" className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Interface Language</label>
                      <div className="relative">
                        <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#ff7800] transition-colors" size={20} />
                        <select
                          id="language" name="language" value={formData.language} onChange={handleChange}
                          className="w-full pl-14 pr-12 py-4.5 bg-white/5 border border-white/5 rounded-2xl text-sm font-bold text-white focus:ring-2 focus:ring-[#ff7800]/50 outline-none appearance-none cursor-pointer"
                        >
                          <option className="bg-zinc-900">English (US)</option>
                          <option className="bg-zinc-900">Spanish (ES)</option>
                          <option className="bg-zinc-900">Hindi (IN)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="size-10 bg-[#ff7800]/10 border border-[#ff7800]/20 rounded-xl flex items-center justify-center text-[#ff7800]">
                        <Lock size={18} />
                      </div>
                      <h4 className="text-xl font-black text-white">Security Update</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Current Password</label>
                        <input
                          type="password" name="old_password" value={passwordData.old_password} onChange={handlePasswordChange}
                          placeholder="••••••••"
                          className="w-full px-6 py-4.5 bg-white/5 border border-white/5 rounded-2xl text-sm font-bold text-white focus:ring-2 focus:ring-[#ff7800]/50 outline-none transition-all placeholder:text-zinc-800"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">New Password</label>
                        <input
                          type="password" name="new_password" value={passwordData.new_password} onChange={handlePasswordChange}
                          placeholder="••••••••"
                          className="w-full px-6 py-4.5 bg-white/5 border border-white/5 rounded-2xl text-sm font-bold text-white focus:ring-2 focus:ring-[#ff7800]/50 outline-none transition-all placeholder:text-zinc-800"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Confirm Password</label>
                        <input
                          type="password" name="confirm_password" value={passwordData.confirm_password} onChange={handlePasswordChange}
                          placeholder="••••••••"
                          className="w-full px-6 py-4.5 bg-white/5 border border-white/5 rounded-2xl text-sm font-bold text-white focus:ring-2 focus:ring-[#ff7800]/50 outline-none transition-all placeholder:text-zinc-800"
                        />
                      </div>
                    </div>
                  </div>

                  {error && <p className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/5 p-4 rounded-xl border border-red-500/20">{error}</p>}

                  <div className="pt-10 border-t border-white/5 flex flex-col sm:flex-row items-center justify-end gap-8">
                    <Button type="submit" disabled={loading} className="w-full sm:w-auto px-12 h-14 rounded-2xl bg-[#ff7800] hover:bg-[#e66c00] text-white font-black uppercase text-[10px] tracking-widest shadow-[0_0_20px_rgba(255,120,0,0.3)] transition-all">
                      {loading ? <Loader2 className="animate-spin" size={20} /> : success ? "Settings Saved!" : "Apply All Changes"}
                    </Button>
                  </div>
                </form>
                
                {/* Bottom orange glow */}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#ff7800]/20 to-transparent" />
              </motion.div>
            ) : (
              <motion.div
                key="subscription"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Current Plan Multi-Metric Card */}
                <div className="premium-card p-8 sm:p-12 rounded-[3rem] border border-white/5 bg-zinc-900/40 backdrop-blur-2xl shadow-2xl group overflow-hidden relative">
                  <div className="flex flex-col sm:flex-row justify-between gap-8 mb-12 items-start">
                    <div>
                      <span className="text-[10px] font-black text-[#ff7800] uppercase tracking-[0.3em]">Current Membership</span>
                      <h2 className="text-5xl font-black text-white mt-2 tracking-tight">{userData?.plan.toUpperCase()} Plan</h2>
                      <p className="text-zinc-500 text-sm font-medium mt-2">Next renewal on <span className="text-[#ff7800]">May 27, 2026</span></p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="h-fit bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 size={16} /> Active
                      </div>
                      <Button onClick={() => navigate('/pricing')} className="bg-[#ff7800] text-white h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-[0_0_20px_rgba(255,120,0,0.3)] hover:bg-[#e66c00] transition-all">Upgrade</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-8 lg:pr-12 lg:border-r border-white/5">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Resource Usage</span>
                        <span className="text-sm font-black text-white">{credits}m Available</span>
                      </div>
                      <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, ((credits || 0) / 500) * 100)}%` }}
                          className="h-full bg-[#ff7800] rounded-full shadow-[0_0_15px_rgba(255,120,0,0.5)]"
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{Math.max(0, 500 - credits)}m Spent</span>
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">500m Total</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 group-hover:bg-white/10 transition-colors">
                        <div className="size-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center mb-5">
                          <CreditCard className="text-[#ff7800]" size={20} />
                        </div>
                        <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Pricing</span>
                        <span className="text-2xl font-black text-white">{userData?.plan === 'free' ? '₹0/mo' : '₹999/mo'}</span>
                      </div>
                      <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 group-hover:bg-white/10 transition-colors">
                        <div className="size-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center mb-5">
                          <Clock className="text-[#ff7800]" size={20} />
                        </div>
                        <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Validity</span>
                        <span className="text-2xl font-black text-white">30 Days</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bottom orange glow */}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#ff7800]/20 to-transparent" />
                </div>

                {/* Billing History Table */}
                <div className="premium-card p-8 sm:p-12 rounded-[3rem] border border-white/5 bg-zinc-900/40 backdrop-blur-2xl shadow-2xl group overflow-hidden relative">
                  <div className="flex items-center justify-between mb-12">
                    <div>
                      <h4 className="text-3xl font-black tracking-tight text-white">Recent Activity</h4>
                      <p className="text-zinc-500 text-sm font-medium mt-2">Check your latest credit transactions</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={exportToCSV}
                      className="text-[10px] font-black uppercase tracking-widest border-white/10 text-white bg-white/5 hover:bg-white/10 rounded-xl px-6 h-11"
                    >
                      <Download size={14} className="mr-2" /> Export CSV
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="pb-8 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] px-4">Reference ID</th>
                          <th className="pb-8 text-center text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] px-4">Type</th>
                          <th className="pb-8 text-center text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] px-4">Amount</th>
                          <th className="pb-8 text-right text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] px-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {paginatedHistory.length > 0 ? paginatedHistory.map((item, i) => (
                          <tr key={i} className="group hover:bg-white/5 transition-all">
                            <td className="py-8 px-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-white group-hover:text-[#ff7800] transition-colors">TXN-{item.id}</span>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{new Date(item.created_at).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="py-8 px-4 text-center">
                              <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest inline-block border ${
                                item.type === 'credit' 
                                  ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' 
                                  : 'bg-[#ff7800]/5 text-[#ff7800] border-[#ff7800]/20'
                              }`}>
                                {item.type === 'credit' ? 'Credit Added' : 'Credit Used'}
                              </span>
                            </td>
                            <td className="py-8 px-4 text-center">
                              <span className={`text-sm font-black ${item.type === 'credit' ? 'text-emerald-400' : 'text-[#ff7800]'}`}>
                                {item.type === 'credit' ? '+' : '-'}{item.amount}m
                              </span>
                            </td>
                            <td className="py-8 px-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild={false}>
                                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
                                    <MoreHorizontal className="size-5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-xl">
                                  <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer transition-all">
                                    <FileText size={14} className="text-[#ff7800]" /> View Details
                                  </DropdownMenuItem>
                                  {item.type === 'credit' && (
                                    <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer transition-all">
                                      <Download size={14} className="text-[#ff7800]" /> Download Receipt
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-xl text-xs font-black uppercase tracking-widest text-red-400 hover:text-red-300 hover:bg-red-400/5 cursor-pointer transition-all">
                                    <AlertCircle size={14} /> Report Issue
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="py-20 text-center text-zinc-600 text-sm font-bold uppercase tracking-widest">No recent transactions found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-12 pt-8 border-t border-white/5">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, history.length)} of {history.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className="h-10 w-10 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                        >
                          <ChevronLeft size={18} />
                        </Button>
                        <div className="flex items-center gap-1">
                          {[...Array(totalPages)].map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentPage(i + 1)}
                              className={`h-10 w-10 rounded-xl text-[10px] font-black transition-all ${
                                currentPage === i + 1 
                                  ? 'bg-[#ff7800] text-white shadow-[0_0_15px_rgba(255,120,0,0.3)]' 
                                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className="h-10 w-10 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                        >
                          <ChevronRight size={18} />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Bottom orange glow */}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#ff7800]/20 to-transparent" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
