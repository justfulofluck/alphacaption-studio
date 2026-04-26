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
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000`;

export default function ProfileSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    company: '',
    language: 'English (US)'
  });

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setFormData(prev => ({
          ...prev,
          name: res.data.name || '',
          email: res.data.email || ''
        }));
      } catch (err: any) {
        console.error('Failed to fetch user:', err);
        if (err.response?.status === 401 || err.response?.status === 422) {
          localStorage.removeItem('auth_token');
          navigate('/login');
        }
      } finally {
        setFetching(false);
      }
    };

    fetchUserData();
  }, [navigate]);

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
    if (!token) {
      navigate('/login');
      return;
    }

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
    <div className="max-w-4xl mx-auto px-6 py-12 font-sans">
      <div className="mb-12">
        <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Profile Settings</h1>
        <p className="text-zinc-500 mt-1">Manage your personal information and account preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Sidebar-like Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-zinc-100 shadow-xl shadow-zinc-100/50 flex flex-col items-center text-center">
            <div className="relative group cursor-pointer mb-6">
              <div className="w-24 h-24 rounded-full bg-zinc-50 border-4 border-white shadow-xl flex items-center justify-center text-zinc-900 font-black text-3xl overflow-hidden">
                {getInitials(formData.name)}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white" size={20} />
              </div>
            </div>
            <h3 className="font-black text-lg text-zinc-900 leading-none mb-1">{formData.name || 'Your Name'}</h3>
            <p className="text-xs font-bold text-zinc-900 uppercase tracking-widest">{formData.email}</p>
            
            <div className="mt-6 w-full pt-6 border-t border-zinc-50 space-y-4">
              <div className="flex items-center gap-3 text-xs">
                <ShieldCheck className="text-emerald-500" size={16} />
                <span className="text-zinc-500 font-medium">Identity Verified</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <Settings className="animate-spin-slow" size={16} />
                <span>Last updated just now</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right: The Form */}
        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-zinc-100 shadow-xl shadow-zinc-100/50"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-4 py-3 bg-zinc-50/50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-zinc-500 focus:border-transparent transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      readOnly
                      disabled
                      className="block w-full pl-10 pr-4 py-3 bg-zinc-100 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="mobile" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                    <input
                      type="tel"
                      id="mobile"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-4 py-3 bg-zinc-50/50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-zinc-500 focus:border-transparent transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="language" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 ml-1">
                    Default Language
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" size={18} />
                    <select
                      id="language"
                      name="language"
                      value={formData.language}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-4 py-3 bg-zinc-50/50 border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-zinc-500 focus:border-transparent transition-all outline-none appearance-none cursor-pointer"
                    >
                      <option>English (US)</option>
                      <option>Spanish (ES)</option>
                      <option>French (FR)</option>
                      <option>German (DE)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-50 flex items-center justify-between gap-4">
                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-xs font-bold">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}
                <button
                  type="button"
                  className="flex items-center gap-2 text-xs font-black text-zinc-400 hover:text-zinc-900 transition-all uppercase tracking-widest"
                >
                  <Lock size={14} />
                  Change Password
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-zinc-900 text-white px-8 py-3.5 rounded-2xl text-sm font-black hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-100 active:scale-95 disabled:opacity-50 min-w-[160px] justify-center"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : success ? (
                    <>
                      <CheckCircle2 size={20} />
                      Saved
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
