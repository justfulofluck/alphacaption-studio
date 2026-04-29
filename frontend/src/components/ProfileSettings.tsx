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
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

import { API_BASE_URL } from "@/api/config";
import { Button } from "@/components/ui/button"

export default function ProfileSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'profile';

  const [userData, setUserData] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [history, setHistory] = useState<any[]>([]);

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
        email: userRes.data.email || ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('auth_token');
    try {
      await axios.put(`${API_BASE_URL}/api/auth/me`,
        { name: formData.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
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
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight">
            {activeTab === 'subscription' ? 'Subscription & Billing' : 'Profile Settings'}
          </h1>
          <p className="text-zinc-500 mt-2 font-medium">
            {activeTab === 'subscription'
              ? 'Manage your plan, credits, and view your billing history.'
              : 'Update your personal information and security preferences.'}
          </p>
        </div>

        <div className="flex bg-zinc-100 p-1.5 rounded-2xl">
          <button
            onClick={() => navigate('/settings')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Profile
          </button>
          <button
            onClick={() => navigate('/settings?tab=subscription')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'subscription' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Subscription
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${activeTab === 'profile' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-10`}>
        {/* Left Side (Only for Profile Tab) */}
        {activeTab === 'profile' && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl shadow-zinc-100/30 flex flex-col items-center text-center">
              <div className="relative group mb-6">
                <div className="w-28 h-28 rounded-full bg-zinc-900 shadow-2xl flex items-center justify-center text-white font-black text-4xl overflow-hidden">
                  {getInitials(formData.name)}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-white">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <h3 className="font-black text-2xl text-zinc-900 mb-1 leading-none">{formData.name}</h3>
              <p className="text-sm font-bold text-zinc-400 mb-6">{formData.email}</p>

              <div className="w-full space-y-3 pt-6 border-t border-zinc-50">
                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Zap size={18} className="text-primary fill-primary/20" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Credits</span>
                  </div>
                  <span className="font-black text-zinc-900">{credits}m</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className="text-zinc-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Tier</span>
                  </div>
                  <span className="font-black text-primary uppercase text-[10px] tracking-widest">{userData?.plan}</span>
                </div>
              </div>
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
                className="bg-white p-8 sm:p-10 rounded-[3rem] border border-zinc-100 shadow-xl shadow-zinc-100/30"
              >
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                        <input
                          type="text" id="name" name="name" value={formData.name} onChange={handleChange}
                          className="w-full pl-12 pr-4 py-4 bg-zinc-50/50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                        <input
                          type="email" id="email" value={formData.email} disabled
                          className="w-full pl-12 pr-4 py-4 bg-zinc-100/50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-400 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="mobile" className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                        <input
                          type="tel" id="mobile" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="+91 00000 00000"
                          className="w-full pl-12 pr-4 py-4 bg-zinc-50/50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="language" className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Interface Language</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
                        <select
                          id="language" name="language" value={formData.language} onChange={handleChange}
                          className="w-full pl-12 pr-10 py-4 bg-zinc-50/50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-zinc-900 outline-none appearance-none cursor-pointer"
                        >
                          <option>English (US)</option>
                          <option>Spanish (ES)</option>
                          <option>Hindi (IN)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-zinc-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <button type="button" className="group flex items-center gap-2 text-[10px] font-black text-zinc-400 hover:text-zinc-900 transition-all uppercase tracking-[0.2em]">
                      <Lock size={14} className="group-hover:rotate-12 transition-transform" />
                      Change Password
                    </button>

                    <Button type="submit" disabled={loading} className="w-full sm:w-auto px-10 h-14 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black shadow-xl">
                      {loading ? <Loader2 className="animate-spin" size={20} /> : success ? "Changes Saved!" : "Apply Updates"}
                    </Button>
                  </div>
                </form>
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
                <div className="bg-white p-8 sm:p-10 rounded-[3rem] border border-zinc-100 shadow-xl shadow-zinc-100/30">
                  <div className="flex flex-col sm:flex-row justify-between gap-6 mb-10 text-center sm:text-left">
                    <div>
                      <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Current Membership</span>
                      <h2 className="text-4xl font-black text-zinc-900 mt-1">{userData?.plan.toUpperCase()} Plan</h2>
                      <p className="text-zinc-400 text-sm font-medium mt-1">Next renewal on May 27, 2026</p>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      <div className="h-fit bg-emerald-50 text-emerald-600 px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 size={16} /> Active
                      </div>
                      <Button onClick={() => navigate('/pricing')} className="bg-zinc-900 text-white h-12 px-6 rounded-2xl font-black">Upgrade</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6 pt-6 border-t md:border-t-0 md:border-r border-zinc-50 pr-0 md:pr-10">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Resource Usage</span>
                        <span className="text-sm font-black text-zinc-900">{credits}m Available</span>
                      </div>
                      <div className="h-4 w-full bg-zinc-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${((credits || 0) / 100) * 100}%` }}
                          className="h-full bg-zinc-900 rounded-full"
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">0m Spent</span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">100m Total</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 bg-zinc-50 rounded-[2.5rem] border border-zinc-100/50">
                        <CreditCard className="text-zinc-400 mb-4" size={24} />
                        <span className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Pricing</span>
                        <span className="text-xl font-black text-zinc-900">₹0/mo</span>
                      </div>
                      <div className="p-6 bg-zinc-50 rounded-[2.5rem] border border-zinc-100/50">
                        <Clock className="text-zinc-400 mb-4" size={24} />
                        <span className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Validity</span>
                        <span className="text-xl font-black text-zinc-900">Lifetime</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billing History Table */}
                <div className="bg-white p-8 sm:p-10 rounded-[3rem] border border-zinc-100 shadow-xl shadow-zinc-100/30">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h4 className="text-2xl font-black tracking-tight">Recent Activity</h4>
                      <p className="text-zinc-400 text-xs font-medium mt-1">Check your latest credit transactions</p>
                    </div>
                    <Button variant="outline" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 rounded-xl">
                      Export CSV
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-zinc-50">
                          <th className="pb-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Reference ID</th>
                          <th className="pb-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Type</th>
                          <th className="pb-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Amount</th>
                          <th className="pb-6 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {history.length > 0 ? history.map((item, i) => (
                          <tr key={i} className="group hover:bg-zinc-50/50 transition-colors">
                            <td className="py-6">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-zinc-900">TXN-{item.id}</span>
                                <span className="text-[10px] text-zinc-400 font-medium">{new Date(item.created_at).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="py-6">
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${item.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                {item.amount > 0 ? 'Credit Added' : 'Credit Used'}
                              </span>
                            </td>
                            <td className="py-6">
                              <span className="text-sm font-black text-zinc-900">{Math.abs(item.amount)}m</span>
                            </td>
                            <td className="py-6 text-right">
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <Download size={16} />
                              </Button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-zinc-400 text-sm font-medium">No recent transactions found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
