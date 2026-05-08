import React, { useEffect, useState } from "react"
import { Separator } from "@/components/ui/separator"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useLocation, useNavigate } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MoonIcon, SunIcon, LogOutIcon, UserIcon, SettingsIcon, BellIcon, CheckCircle2, AlertTriangle, Info, AlertCircle } from "lucide-react"
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

import { API_BASE_URL } from "@/api/config"
import axios from "axios"
import { formatDistanceToNow } from "date-fns"

export function SiteHeader({ user }: { user?: { name: string; avatar?: string; email?: string } }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathnames = location.pathname.split("/").filter((x) => x);
  const [isDark, setIsDark] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('admin_token');
    navigate('/login');
    window.location.reload();
  };

  const fetchNotifications = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    try {
      const [notifRes, countRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setNotifications(notifRes.data);
      setUnreadCount(countRes.data.count);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const markAllAsRead = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      await axios.put(`${API_BASE_URL}/api/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
    fetchNotifications();
    // Refresh every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
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

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={16} />;
      case 'error': return <AlertCircle className="text-red-500" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
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
        <DropdownMenu onOpenChange={(open) => open && markAllAsRead()}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white relative"
            >
              <BellIcon size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-background animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <div className="p-4 border-b bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-tight">Notifications</h3>
              {unreadCount > 0 && <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-900 text-white dark:bg-white dark:text-black px-2 py-0.5 rounded-full">{unreadCount} New</span>}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <DropdownMenuItem key={notif.id} className="p-4 border-b last:border-0 focus:bg-zinc-50 dark:focus:bg-zinc-900 cursor-default flex items-start gap-3">
                    <div className="mt-1 shrink-0">
                      {getNotifIcon(notif.type)}
                    </div>
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold text-xs truncate ${notif.is_read ? 'text-zinc-500' : 'text-zinc-900 dark:text-white'}`}>
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-zinc-400 shrink-0">
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-8 text-center flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                    <BellIcon size={20} />
                  </div>
                  <p className="text-xs font-medium text-zinc-500">No notifications yet</p>
                </div>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-t text-center">
                <button 
                  onClick={() => navigate('/settings')}
                  className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  View All Settings
                </button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

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
