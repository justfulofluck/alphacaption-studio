import * as React from "react"
import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"
import {
  BarChart3 as BarChart3Icon,
  ShieldCheck as ShieldCheckIcon,
  Sparkles as SparklesIcon,
  Users as UsersIcon,
  Settings2 as Settings2Icon,
  LayoutDashboard as LayoutDashboardIcon,
  AudioLines as AudioLinesIcon,
  Mic as MicIcon
} from "lucide-react"
import { Link } from "react-router-dom"

interface StudioSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name: string;
    email: string;
    avatar?: string;
    role?: string;
    plan?: string;
  };
}

import { useLocation } from "react-router-dom"

export function StudioSidebar({ user, ...props }: StudioSidebarProps) {
  const location = useLocation();
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  const isAdminPath = location.pathname.startsWith('/admin');

  const navMain = [
    ...(isAdminPath ? [
      {
        title: "User Management",
        url: "/admin",
        icon: <UsersIcon />,
      },
      {
        title: "Credit Ledger",
        url: "/admin?section=ledger",
        icon: <ShieldCheckIcon />,
      },
      {
        title: "Plan Setup",
        url: "/admin?section=plans",
        icon: <Settings2Icon />,
      }
    ] : [
      {
        title: "Home",
        url: "/dashboard",
        icon: <LayoutDashboardIcon />,
      },
      {
        title: "Caption Studio",
        url: "/",
        icon: <AudioLinesIcon />,
      },
      {
        title: "Text-to-Speech",
        url: "/tts",
        icon: <MicIcon />,
      },
      {
        title: "Reels",
        url: "/reels",
        icon: <LayoutDashboardIcon />,
      },
      {
        title: "Subscription",
        url: "/settings?tab=subscription",
        icon: <ShieldCheckIcon />,
      }
    ])
  ];


  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-white/5 bg-[#0a0a0a]">
      <SidebarHeader className="pt-4 group-data-[collapsible=icon]:p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <Link to="/" className="flex items-center gap-3">
                  <img src="/logo.png" alt="Vcaptiona Logo" className="h-10 w-auto object-contain" />
                </Link>
              }
              className="hover:bg-transparent active:bg-transparent"
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-0">
        <NavMain items={navMain} user={user} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: user.name,
          email: user.email,
          avatar: user.avatar || "",
          plan: user.plan
        }} />
      </SidebarFooter>
    </Sidebar>
  )
}
