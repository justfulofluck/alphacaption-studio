import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import axios from "axios"
import { Loader2, ArrowRight, CheckCircle2, AlertCircle, ShieldAlert, User, Mail, Phone, Lock, Eye, EyeOff, RefreshCw } from "lucide-react"

import { API_BASE_URL } from "@/api/config"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [otpErrorCount, setOtpErrorCount] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    otp: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    if (isRequesting) return;

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/register`, formData);
      if (res.data.otp_required) {
        setShowOtp(true);
        setTimeLeft(180);
        setInfo("Verification code sent to your email.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send verification code.");
    } finally {
      setLoading(false);
      setIsRequesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!showOtp) {
      await handleSendOtp();
      return;
    }

    if (isRequesting) return;
    setIsRequesting(true);
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/register`, formData);
      if (res.data.token) {
        localStorage.setItem('auth_token', res.data.token);
        const redirect = searchParams.get('redirect') || '/';
        const planId = searchParams.get('plan');
        const target = planId ? `${redirect}?plan=${planId}` : redirect;
        navigate(target);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || "Verification failed. Please check your code.";
      setError(msg);
      setOtpErrorCount(c => c + 1);
      if (timeLeft <= 0 || msg.toLowerCase().includes("expired")) {
        setInfo("Your code has expired. Click 'Resend Code' below to get a new one.");
      } else {
        setInfo("Wrong code? Click 'Resend Code' below to get a new one.");
      }
    } finally {
      setLoading(false);
      setIsRequesting(false);
    }
  };

  const handleResendOtp = async () => {
    if (isRequesting) return;
    setError(null);
    setInfo("Sending a new code...");
    await handleSendOtp();
  };

  return (
    <form className={cn("flex flex-col gap-4", className)} {...props} onSubmit={handleSubmit}>
      <FieldGroup>
      <div className="flex flex-col gap-1 mb-4">
        <h1 className="text-4xl font-black text-white tracking-tightest">Create account</h1>
        <p className="text-zinc-500 font-medium">
          {showOtp ? "Enter the verification code sent to your email" : "Fill in the form below to create your account"}
        </p>
      </div>

        {!showOtp ? (
          <>
            <Field className="space-y-2">
              <FieldLabel htmlFor="name" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Full Name</FieldLabel>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff7800]/60" size={18} />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="bg-white/5 border-white/5 h-12 pl-12 rounded-xl text-white placeholder:text-zinc-700 focus-visible:ring-[#ff7800]/50"
                />
              </div>
            </Field>

            <Field className="space-y-2">
              <FieldLabel htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Email</FieldLabel>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff7800]/60" size={18} />
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="bg-white/5 border-white/5 h-12 pl-12 rounded-xl text-white placeholder:text-zinc-700 focus-visible:ring-[#ff7800]/50"
                />
              </div>
              <FieldDescription className="text-zinc-600 text-[11px] font-medium ml-1">
                We'll use this to contact you.
              </FieldDescription>
            </Field>

            <Field className="space-y-2">
              <FieldLabel htmlFor="mobile" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Phone Number</FieldLabel>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff7800]/60" size={18} />
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="9876543210"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="bg-white/5 border-white/5 h-12 pl-12 rounded-xl text-white placeholder:text-zinc-700 focus-visible:ring-[#ff7800]/50"
                />
              </div>
            </Field>

            <Field className="space-y-2">
              <FieldLabel htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Password</FieldLabel>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff7800]/60" size={18} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="bg-white/5 border-white/5 h-12 pl-12 pr-12 rounded-xl text-white placeholder:text-zinc-700 focus-visible:ring-[#ff7800]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <FieldDescription className="text-zinc-600 text-[11px] font-medium ml-1">
                At least 8 characters with a number or symbol.
              </FieldDescription>
            </Field>

            <Field className="space-y-2">
              <FieldLabel htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1">Confirm Password</FieldLabel>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ff7800]/60" size={18} />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="bg-white/5 border-white/5 h-12 pl-12 pr-12 rounded-xl text-white placeholder:text-zinc-700 focus-visible:ring-[#ff7800]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
          </>
        ) : (
          <div className="space-y-4">
            <Field>
              <div className="flex justify-between items-center mb-1.5">
                <FieldLabel htmlFor="otp">Verification Code</FieldLabel>
                <span className={`text-[10px] font-bold ${timeLeft === 0 ? "text-red-500" : "text-zinc-400"}`}>
                  {timeLeft > 0
                    ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`
                    : "Expired"}
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
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                disabled={loading || isRequesting}
                onClick={handleResendOtp}
                className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black uppercase text-[10px] tracking-widest border border-white/10 transition-all"
              >
                {loading || isRequesting ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <><RefreshCw size={14} className="mr-2" /> Resend Code</>
                )}
              </Button>
              {timeLeft > 0 && timeLeft <= 120 && (
                <p className="text-center text-[10px] font-bold text-zinc-500">
                  You can resend every 60 seconds
                </p>
              )}
              {timeLeft === 0 && (
                <p className="text-center text-[10px] font-bold text-red-400">
                  Code expired — click Resend Code above for a new one
                </p>
              )}
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
          <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-zinc-800 text-xs font-bold animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={14} />
            {info}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-[#ff7800] hover:bg-[#e66c00] text-white font-black uppercase text-[10px] tracking-widest shadow-[0_0_20px_rgba(255,120,0,0.3)] transition-all">
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            showOtp ? "Verify & Create Account" : "Send Verification Code"
          )}
        </Button>

        <p className="text-center text-sm font-medium text-zinc-500">
          Already have an account?{" "}
          <Link to="/login" className="font-black text-[#ff7800] hover:underline underline-offset-8 decoration-[#ff7800]/30 transition-all">
            Sign In
          </Link>
        </p>
      </FieldGroup>
    </form>
  )
}
