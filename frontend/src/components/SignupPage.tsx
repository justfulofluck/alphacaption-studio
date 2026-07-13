import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { GalleryVerticalEnd } from "lucide-react"
import { SignupForm } from "@/components/signup-form"
import Background from "@/assets/Background.png"
import Beams from "@/components/Beams"
import { API_BASE_URL } from "@/api/config"
import { motion } from "motion/react"
import axios from "axios"

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token && token !== 'undefined' && token !== 'null') {
      const redirect = searchParams.get('redirect') || '/dashboard';
      const planId = searchParams.get('plan');
      const target = planId ? `${redirect}?plan=${planId}` : redirect;
      axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        if (res.data?.id) {
          navigate(target);
        }
      }).catch(() => {
        localStorage.removeItem('auth_token');
      });
    }
  }, [navigate, searchParams]);

  return (
    <div className="relative h-screen bg-[#0D0D0D] font-inter overflow-hidden">
      {/* Force HMR */}
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
              <SignupForm />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
