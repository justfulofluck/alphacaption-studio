import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  Key,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from "motion/react";
import { API_BASE_URL } from "@/api/config";

export default function AdminResetPasswordPage() {
  const [step, setStep] = useState(1); // 1: Request, 2: Reset
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    password: '',
    confirmPassword: ''
  });
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await axios.post(`${API_BASE_URL}/api/auth/admin/reset-password-request`, {
        email: formData.email
      });
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      await axios.post(`${API_BASE_URL}/api/auth/admin/reset-password`, {
        email: formData.email,
        otp: formData.otp,
        password: formData.password
      });
      setSuccess(true);
      setTimeout(() => navigate('/admin/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans"
      >
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-zinc-950 shadow-[0_0_50px_-12px_rgba(255,255,255,0.3)]">
              <CheckCircle2 size={32} strokeWidth={2.5} className="text-green-600" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">Access Restored</h2>
          <p className="mt-4 text-zinc-500 font-medium">Your security key has been updated. Redirecting to terminal...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans"
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-zinc-950 shadow-[0_0_50px_-12px_rgba(255,255,255,0.3)]">
            <Key size={32} strokeWidth={2.5} />
          </div>
        </div>
        <h2 className="mt-8 text-center text-4xl font-black text-white tracking-tight">
          Reset Access
        </h2>
        <p className="mt-3 text-center text-sm text-zinc-500 font-medium">
          {step === 1 ? 'Verify admin identifier to continue' : 'Enter verification code and new key'}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-zinc-900/50 backdrop-blur-xl py-10 px-8 border border-zinc-800 shadow-2xl rounded-[3rem] sm:px-12 relative overflow-hidden group">
          <form className="space-y-6 relative z-10" onSubmit={step === 1 ? handleRequestOTP : handleResetPassword}>
            {step === 1 ? (
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2 ml-1">
                  Admin Identifier
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@system.com"
                    className="appearance-none block w-full pl-12 pr-4 py-4 bg-zinc-800/50 border border-zinc-700/50 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all sm:text-sm"
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2 ml-1">
                    Verification Code
                  </label>
                  <input
                    name="otp"
                    type="text"
                    required
                    value={formData.otp}
                    onChange={handleChange}
                    placeholder="6-digit code"
                    className="appearance-none block w-full px-4 py-4 bg-zinc-800/50 border border-zinc-700/50 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2 ml-1">
                    New Security Key
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="appearance-none block w-full px-4 py-4 bg-zinc-800/50 border border-zinc-700/50 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2 ml-1">
                    Confirm Key
                  </label>
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="appearance-none block w-full px-4 py-4 bg-zinc-800/50 border border-zinc-700/50 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all sm:text-sm"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-3 py-4 px-4 bg-white hover:bg-zinc-100 text-zinc-950 rounded-2xl shadow-xl shadow-white/5 text-sm font-black transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>{step === 1 ? 'Request Reset' : 'Update Security Key'} <ArrowRight size={18} /></>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => step === 2 ? setStep(1) : navigate('/admin/login')}
                className="w-full flex justify-center items-center gap-2 py-3 text-zinc-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest"
              >
                <ArrowLeft size={14} /> Back to Terminal
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
