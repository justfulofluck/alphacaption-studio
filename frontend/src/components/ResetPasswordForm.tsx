import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useNavigate, Link } from "react-router-dom"
import axios from "axios"
import { Loader2, ArrowRight, CheckCircle2, AlertCircle, ShieldAlert, Lock, Mail, Eye, EyeOff } from "lucide-react"

import { API_BASE_URL } from "@/api/config"

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    new_password: ""
  });
  const [showPassword, setShowPassword] = useState(false);

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
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    setError(null);
    setInfo(null);
  };

  const handleSendOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/reset-password-request`, { email: formData.email });
      setShowOtp(true);
      setTimeLeft(180);
      setInfo("Verification code sent to your email.");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!showOtp) {
      await handleSendOtp();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/reset-password`, formData);
      setInfo("Password reset successful! Redirecting to login...");
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Reset failed. Please check your code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={cn("flex flex-col gap-4", className)} {...props} onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col gap-1 mb-4">
          <h1 className="text-4xl font-black text-white tracking-tightest">Reset Password</h1>
          <p className="text-[#A1A1A1] font-medium">
            {showOtp ? "Enter the code and your new password" : "Enter your email to receive a verification code"}
          </p>
        </div>

        {!showOtp ? (
          <Field className="space-y-2">
            <FieldLabel htmlFor="email" className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#A1A1A1] ml-1">Email address</FieldLabel>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF7A00]/60" size={18} />
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                required
                value={formData.email}
                onChange={handleChange}
                className="bg-[#1A1A1A] border-[#262626] h-12 pl-12 rounded-lg text-white placeholder:text-zinc-700 focus-visible:ring-[#FF7A00] focus-visible:border-[#FF7A00]"
              />
            </div>
          </Field>
        ) : (
          <div className="space-y-4">
            <Field>
              <div className="flex justify-between items-center mb-1.5">
                <FieldLabel htmlFor="otp">Verification Code</FieldLabel>
                <span className="text-[10px] font-bold text-[#A1A1A1]">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="relative">
                <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1A1]" size={18} />
                <Input
                  id="otp"
                  type="text"
                  required
                  maxLength={6}
                  value={formData.otp}
                  onChange={handleChange}
                  placeholder="000000"
                  className="pl-10 bg-zinc-50/50 tracking-[0.5em] font-black text-center"
                />
              </div>
            </Field>
            <Field className="space-y-2">
              <FieldLabel htmlFor="new_password" className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#A1A1A1] ml-1">New Password</FieldLabel>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF7A00]/60" size={18} />
                <Input
                  id="new_password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={formData.new_password}
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
            <div className="text-center">
              <button
                type="button"
                disabled={loading}
                onClick={handleSendOtp}
                className="text-xs font-black text-[#FF7A00] uppercase tracking-widest hover:underline underline-offset-4"
              >
                Resend Code {timeLeft > 120 ? `in ${timeLeft - 120}s` : ''}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs font-bold animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {info && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100 text-green-700 text-xs font-bold animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={14} />
            {info}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full h-12 rounded-lg bg-[#FF7A00] hover:bg-[#e66c00] text-black font-black uppercase text-[10px] tracking-widest shadow-none hover:shadow-[0_0_20px_rgba(255,122,0,0.4)] transition-all">
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            showOtp ? "Update Password" : "Send Verification Code"
          )}
        </Button>

        <p className="text-center text-sm font-medium text-[#A1A1A1]">
          Remembered your password?{" "}
          <Link to="/login" className="font-black text-[#FF7A00] hover:underline underline-offset-8 decoration-[#FF7A00]/30 transition-all">
            Sign In
          </Link>
        </p>
      </FieldGroup>
    </form>
  )
}
