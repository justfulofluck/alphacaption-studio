import { GalleryVerticalEnd } from "lucide-react"
import { ResetPasswordForm } from "@/components/ResetPasswordForm"
import Background from "@/assets/Background.png"

export default function ResetPasswordPage() {
  return (
    <div className="grid h-screen lg:grid-cols-2 bg-[#050505] font-sans overflow-hidden">
      <div className="flex flex-col gap-4 p-8 md:p-10 lg:p-12 relative z-10 overflow-y-auto lg:overflow-hidden">
        <div className="flex justify-center lg:justify-start mb-8">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Vcaptiona Logo" className="h-10 w-auto object-contain" />
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center lg:justify-start">
          <div className="w-full max-w-md">
            <ResetPasswordForm />
          </div>
        </div>
      </div>
      <div className="relative hidden lg:block overflow-hidden border-l border-white/5">
        <img
          src={Background}
          alt="Security and Privacy"
          className="absolute inset-0 h-full w-full object-cover brightness-[0.3]"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#050505] via-transparent to-[#ff7800]/10"></div>
        <div className="absolute bottom-20 left-20 right-20">
          <blockquote className="space-y-8">
            <p className="text-4xl font-black tracking-tightest text-white leading-[1.1] max-w-xl">
              "Security is not a feature, it's a foundation. We protect your creativity with enterprise-grade authentication."
            </p>
            <footer className="text-xs font-black uppercase tracking-[0.3em] text-[#ff7800]">
              Security Operations @ AlphaCaption
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  )
}
