/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { cn } from '../lib/utils';

import { API_BASE_URL } from "@/api/config";

type AuthMode = 'login' | 'signup' | 'reset';

export default function AuthPage({ mode: initialMode = 'login' }: { mode?: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const navigate = useNavigate();

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    otp: '',
    new_password: ''
  });

  useEffect(() => {
    let timer: any;
    if (showOtp && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [showOtp, timeLeft]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
    setInfo(null);
  };

  const handleSendOtp = async (purpose: string) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = purpose === 'reset' ? '/api/auth/reset-password-request' : '/api/auth/register';

      const res = await axios.post(`${API_BASE_URL}${endpoint}`, formData);

      if (res.data.otp_required) {
        setShowOtp(true);
        setTimeLeft(180); // 3 minutes
        setInfo('OTP sent to your email. Valid for 3 minutes.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For signup: first send OTP if not shown, then verify
    if (mode === 'signup' && !showOtp) {
      await handleSendOtp('register');
      return;
    }

    // For reset: first send OTP if not shown, then verify
    if (mode === 'reset' && !showOtp) {
      await handleSendOtp('reset');
      return;
    }

    // For login or after OTP verification
    setLoading(true);
    setError(null);

    try {
      let endpoint = '';
      let payload = {};

      if (mode === 'login') {
        endpoint = '/api/auth/login';
        payload = { email: formData.email, password: formData.password };
      } else if (mode === 'signup') {
        endpoint = '/api/auth/register';
        payload = { ...formData };
      } else if (mode === 'reset') {
        endpoint = '/api/auth/reset-password';
        payload = { email: formData.email, otp: formData.otp, new_password: formData.new_password };
      }

      const res = await axios.post(`${API_BASE_URL}${endpoint}`, payload);

      if (res.data.token) {
        localStorage.setItem('auth_token', res.data.token);
        navigate('/');
      } else if (mode === 'reset') {
        setInfo('Password reset successful! Redirecting...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = () => {
    if (mode === 'reset') {
      handleSendOtp('reset');
    } else if (mode === 'signup') {
      handleSendOtp('register');
    }
  };


  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-zinc-200 italic font-black text-xl">
            P
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black text-zinc-900 tracking-tight">
          {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create an Account' : 'Reset Password'}
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-500">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <Link to="/signup" className="font-bold text-zinc-900 hover:text-zinc-900">
                Sign up for free
              </Link>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" onClick={() => { setMode('login'); setShowOtp(false) }} className="font-bold text-zinc-900 hover:text-zinc-900">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-zinc-200 shadow-xl rounded-[2.5rem] sm:px-10">
          {success && mode !== 'reset' ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in fade-in zoom-in duration-300">
              <CheckCircle2 size={64} className="text-emerald-500" />
              <p className="text-lg font-bold text-zinc-900">Successfully Authorized!</p>
              <p className="text-sm text-zinc-500">Redirecting you to the workspace...</p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {!showOtp ? (
                <>
                  {mode === 'signup' && (
                    <>
                      <div>
                        <label htmlFor="name" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                          <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. John Doe"
                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-zinc-200 rounded-2xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent sm:text-sm transition-all bg-zinc-50/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="mobile" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                          <input
                            id="mobile"
                            name="mobile"
                            type="tel"
                            value={formData.mobile}
                            onChange={handleChange}
                            placeholder="+91 98765 43210"
                            className="appearance-none block w-full pl-10 pr-3 py-3 border border-zinc-200 rounded-2xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent sm:text-sm transition-all bg-zinc-50/50"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="name@company.com"
                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-zinc-200 rounded-2xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent sm:text-sm transition-all bg-zinc-50/50"
                      />
                    </div>
                  </div>

                  {mode !== 'reset' && (
                    <div>
                      <label htmlFor="password" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1 flex justify-between">
                        <span>Password</span>
                        {mode === 'login' && (
                          <button type="button" onClick={() => setMode('reset')} className="text-zinc-900 hover:text-zinc-900 lowercase normal-case font-bold">
                            Forgot?
                          </button>
                        )}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input
                          id="password"
                          name="password"
                          type="password"
                          autoComplete="current-password"
                          required
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="appearance-none block w-full pl-10 pr-3 py-3 border border-zinc-200 rounded-2xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent sm:text-sm transition-all bg-zinc-50/50"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="otp" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1 flex justify-between">
                      <span>Verification Code</span>
                      <span className="text-zinc-400 normal-case">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                    </label>
                    <div className="relative">
                      <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input
                        id="otp"
                        name="otp"
                        type="text"
                        required
                        maxLength={6}
                        value={formData.otp}
                        onChange={handleChange}
                        placeholder="Enter 6-digit OTP"
                        className="appearance-none block w-full pl-10 pr-3 py-3 border border-zinc-200 rounded-2xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent sm:text-sm transition-all bg-zinc-50/50 tracking-[0.5em] font-black text-center"
                      />
                    </div>
                  </div>

                  {mode === 'reset' && (
                    <div>
                      <label htmlFor="new_password" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input
                          id="new_password"
                          name="new_password"
                          type="password"
                          required
                          value={formData.new_password}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="appearance-none block w-full pl-10 pr-3 py-3 border border-zinc-200 rounded-2xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent sm:text-sm transition-all bg-zinc-50/50"
                        />
                      </div>
                    </div>
                  )}

                  <div className="text-center">
                    <button
                      type="button"
                      disabled={loading || timeLeft > 120}
                      onClick={handleResendOtp}
                      className="text-xs font-bold text-zinc-900 hover:text-zinc-900 disabled:opacity-30"
                    >
                      Resend Code {timeLeft > 120 ? `in ${timeLeft - 120}s` : ''}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              {info && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                  <CheckCircle2 size={14} />
                  {info}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-black text-white bg-zinc-900 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 disabled:opacity-50 transition-all active:scale-95"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      {mode === 'login' ? (
                        <>Sign In <ArrowRight size={18} /></>
                      ) : !showOtp ? (
                        <>Send Verification Code <ArrowRight size={18} /></>
                      ) : (
                        <>{mode === 'reset' ? 'Reset Password' : 'Verify & Continue'} <CheckCircle2 size={18} /></>
                      )}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
