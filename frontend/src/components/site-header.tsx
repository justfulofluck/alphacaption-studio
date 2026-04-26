import React, { useEffect, useState } from "react"
import { Separator } from "@/components/ui/separator"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useLocation } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MoonIcon, SunIcon, LogOutIcon, UserIcon, SettingsIcon, BellIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNavigate } from "react-router-dom"

export function SiteHeader({ user }: { user?: { name: string; avatar?: string; email?: string } }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathnames = location.pathname.split("/").filter((x) => x);
  const [isDark, setIsDark] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('admin_token');
    navigate('/login');
    window.location.reload();
  };

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const getPageTitle = () => {
    if (pathnames.length === 0) return "Studio Workspace";
    const lastPath = pathnames[pathnames.length - 1];
    switch (lastPath) {
      case "dashboard": return "User Dashboard";
      case "admin": return "Super Admin Console";
      case "settings": return "Account Settings";
      default: return lastPath.replace(/-/g, ' ');
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center gap-4 border-b bg-background/60 backdrop-blur-xl px-4 md:px-6 shrink-0 shadow-sm transition-colors duration-300">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <div className="flex items-center gap-2 select-none">
          <h1 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      <div className="flex items-center ml-auto gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          className="h-9 w-9 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <BellIcon size={18} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className="h-9 w-9 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          {isDark ? (
            <SunIcon className="size-5 transition-all duration-500 rotate-0 scale-100" />
          ) : (
            <MoonIcon className="size-5 transition-all duration-500 rotate-[360deg] scale-100" />
          )}
          <span className="sr-only">Toggle dark mode</span>
        </Button>
      </div>
    </header>
  )
}
