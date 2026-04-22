import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000`;

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Use dedicated admin login endpoint for server-side validation
      const res = await axios.post(`${API_BASE_URL}/api/auth/admin/login`, formData);
      
      if (res.data.token) {
        localStorage.setItem('admin_token', res.data.token);
        localStorage.setItem('auth_token', res.data.token);
        navigate('/admin');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Authentication failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-zinc-900 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-zinc-950 shadow-[0_0_50px_-12px_rgba(255,255,255,0.3)]">
            <ShieldCheck size={32} strokeWidth={2.5} />
          </div>
        </div>
        <h2 className="mt-8 text-center text-4xl font-black text-white tracking-tight">
          Terminal Access
        </h2>
        <p className="mt-3 text-center text-sm text-zinc-500 font-medium">
          Super Admin Authentication Required
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-zinc-900/50 backdrop-blur-xl py-10 px-8 border border-zinc-800 shadow-2xl rounded-[3rem] sm:px-12 relative overflow-hidden group">
          {/* Animated glow effect */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-zinc-900/10 blur-[80px] rounded-full group-hover:bg-zinc-900/20 transition-all duration-700"></div>
          
          <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
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

            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2 ml-1">
                Security Key
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="appearance-none block w-full pl-12 pr-4 py-4 bg-zinc-800/50 border border-zinc-700/50 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20 transition-all sm:text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-3 py-4 px-4 bg-white hover:bg-zinc-100 text-zinc-950 rounded-2xl shadow-xl shadow-white/5 text-sm font-black transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>Authorize Access <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>
        
        <p className="mt-8 text-center text-[10px] text-zinc-700 font-bold uppercase tracking-widest leading-loose">
          Secure encrypted session • Access is logged • Unauthorized entry is prohibited
        </p>
      </div>
    </div>
  );
}
