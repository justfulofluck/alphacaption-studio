import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import axios from "axios"
import { Loader2, ArrowRight, AlertCircle, Mail, Lock, Eye, EyeOff } from "lucide-react"

import { API_BASE_URL } from "@/api/config"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, formData);
      if (res.data.token) {
        localStorage.setItem('auth_token', res.data.token);
        const redirect = searchParams.get('redirect') || '/';
        const planId = searchParams.get('plan');
        const target = planId ? `${redirect}?plan=${planId}` : redirect;
        navigate(target);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={cn("flex flex-col gap-4", className)} {...props} onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col gap-1 mb-4">
          <h1 className="text-4xl font-black text-white tracking-tightest">Welcome back</h1>
          <p className="text-[#A1A1A1] font-medium">
            Enter your credentials to access your studio
          </p>
        </div>
        <Field className="space-y-2">
          <FieldLabel htmlFor="email" className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#A1A1A1] ml-1">Email Address</FieldLabel>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF7A00]/60" size={18} />
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={formData.email}
              onChange={handleChange}
              className="bg-[#1A1A1A] border-[#262626] h-12 pl-12 rounded-lg text-white placeholder:text-zinc-700 focus-visible:ring-[#FF7A00] focus-visible:border-[#FF7A00]"
            />
          </div>
        </Field>
        <Field className="space-y-2">
          <div className="flex items-center ml-1">
            <FieldLabel htmlFor="password" className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#A1A1A1]">Password</FieldLabel>
            <Link
              to="/reset-password"
              className="ml-auto text-[10px] font-black text-[#FF7A00] uppercase tracking-widest hover:underline underline-offset-4"
            >
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF7A00]/60" size={18} />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={formData.password}
              onChange={handleChange}
              className="bg-[#1A1A1A] border-[#262626] h-12 pl-12 pr-12 rounded-lg text-white placeholder:text-zinc-700 focus-visible:ring-[#FF7A00] focus-visible:border-[#FF7A00]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1A1] hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs font-bold animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full h-12 rounded-lg bg-[#FF7A00] hover:bg-[#e66c00] text-black font-black uppercase text-[10px] tracking-widest shadow-none hover:shadow-[0_0_20px_rgba(255,122,0,0.4)] transition-all">
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>Sign In <ArrowRight size={18} /></>
          )}
        </Button>
        <p className="text-center text-sm font-medium text-[#A1A1A1]">
          Don&apos;t have an account?{" "}
          <Link to={`/signup${window.location.search}`} className="font-black text-[#FF7A00] hover:underline underline-offset-8 decoration-[#FF7A00]/30 transition-all">
            Sign Up
          </Link>
        </p>
      </FieldGroup>
    </form>
  )
}
