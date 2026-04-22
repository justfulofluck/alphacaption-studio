import { GalleryVerticalEnd } from "lucide-react"
import { ResetPasswordForm } from "@/components/ResetPasswordForm"

export default function ResetPasswordPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background font-sans">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-black tracking-tight">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <GalleryVerticalEnd size={18} />
            </div>
            vcaptiona
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <ResetPasswordForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop"
          alt="Security and Privacy"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] grayscale opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
        <div className="absolute bottom-12 left-12 right-12">
          <blockquote className="space-y-4">
            <p className="text-2xl font-medium tracking-tight text-white leading-relaxed">
              "Security is not a feature, it's a foundation. We protect your creativity with enterprise-grade authentication."
            </p>
            <footer className="text-sm font-bold uppercase tracking-widest text-zinc-400">
              Security Operations @ AlphaCaption
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  )
}
