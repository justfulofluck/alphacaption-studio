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
import { Loader2, ArrowRight, CheckCircle2, AlertCircle, ShieldAlert, Lock } from "lucide-react"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000`;

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
    <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold font-sans tracking-tight">Reset Password</h1>
          <p className="text-sm text-balance text-muted-foreground font-medium">
            {showOtp ? "Enter the code and your new password" : "Enter your email to receive a verification code"}
          </p>
        </div>

        {!showOtp ? (
          <Field>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <Input 
              id="email" 
              type="email" 
              placeholder="name@company.com" 
              required 
              value={formData.email}
              onChange={handleChange}
              className="bg-zinc-50/50"
            />
          </Field>
        ) : (
          <div className="space-y-4">
            <Field>
              <div className="flex justify-between items-center mb-1.5">
                <FieldLabel htmlFor="otp">Verification Code</FieldLabel>
                <span className="text-[10px] font-bold text-zinc-400">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="relative">
                 <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
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
            <Field>
              <FieldLabel htmlFor="new_password">New Password</FieldLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <Input 
                  id="new_password" 
                  type="password" 
                  placeholder="••••••••" 
                  required 
                  value={formData.new_password}
                  onChange={handleChange}
                  className="pl-10 bg-zinc-50/50"
                />
              </div>
            </Field>
            <div className="text-center">
              <Button 
                variant="link"
                size="sm"
                type="button"
                disabled={loading || timeLeft > 120}
                onClick={handleSendOtp}
                className="text-xs font-bold text-zinc-900 h-auto p-0"
              >
                Resend Code {timeLeft > 120 ? `in ${timeLeft - 120}s` : ''}
              </Button>
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
          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-xs font-bold animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={14} />
            {info}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full font-bold">
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            showOtp ? "Update Password" : "Send Verification Code"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link to="/login" className="font-bold text-primary underline underline-offset-4 decoration-primary/30">
            Sign in
          </Link>
        </p>
      </FieldGroup>
    </form>
  )
}
