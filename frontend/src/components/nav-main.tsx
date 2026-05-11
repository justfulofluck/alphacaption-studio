import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { PlusCircleIcon, ShieldCheckIcon, LayoutDashboardIcon } from "lucide-react"
import { Link, useNavigate, useLocation } from "react-router-dom"

export function NavMain({
  items,
  user
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
  }[],
  user?: {
    role?: string
  }
}) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-4">
        <SidebarMenu className="gap-2">
          {items.map((item) => {
            const currentPath = location.pathname + location.search;
            const isActive = currentPath === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  render={
                    <Link to={item.url} className="flex items-center w-full gap-3">
                      <span className={`transition-colors duration-300 ${
                        isActive 
                        ? 'text-[#ff7800]' 
                        : 'text-zinc-500 group-hover:text-white'
                      }`}>
                        {item.icon}
                      </span>
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                  }
                  tooltip={item.title}
                  className={`group flex items-center gap-3 transition-all duration-300 py-6 px-4 rounded-xl font-black uppercase tracking-widest text-[10px] ${
                    isActive 
                    ? "bg-[#ff7800]/10 text-[#ff7800] border-l-[6px] border-[#ff7800] rounded-l-none shadow-[15px_0_30px_rgba(255,120,0,0.1)]" 
                    : "text-zinc-500 hover:bg-white/5 hover:text-white"
                  }`}
                />
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
