import { useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { GalleryVerticalEnd } from "lucide-react"
import { LoginForm } from "@/components/login-form"
import Background from "@/assets/Background.png"
import Beams from "@/components/Beams"
import { motion } from "motion/react"

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token && token !== 'undefined' && token !== 'null') {
      navigate('/dashboard');
    }
  }, [navigate]);

  return (
    <div className="relative h-screen bg-[#0D0D0D] font-inter overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Beams
          beamWidth={2}
          beamHeight={40}
          beamNumber={25}
          lightColor="#FF7A00"
          speed={3}
          noiseIntensity={1.75}
          scale={0.5}
          rotation={30}
          className="w-full h-full"
        />
      </div>

      <div className="relative z-10 grid h-full lg:grid-cols-2 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col gap-4 p-8 md:p-10 lg:p-12 overflow-y-auto lg:overflow-hidden bg-transparent pointer-events-auto"
        >
          <div className="flex justify-center lg:justify-start mb-8">
            <a href="https://vcaptiona.com" className="flex items-center gap-2">
              <img src="/logo.png" alt="Vcaptiona Logo" className="h-10 w-auto object-contain" />
            </a>
          </div>
          <div className="flex flex-1 items-center justify-center lg:justify-start">
            <div className="w-full max-w-md">
              <LoginForm />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
