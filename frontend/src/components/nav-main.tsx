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
            const isActive = location.pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  render={
                    <Link to={item.url} className="flex items-center w-full gap-3">
                      <span className={`transition-colors duration-300 ${
                        isActive 
                        ? 'text-white dark:text-zinc-900' 
                        : 'text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'
                      }`}>
                        {item.icon}
                      </span>
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                  }
                  tooltip={item.title}
                  className={`group flex items-center gap-3 transition-all duration-300 py-5 px-4 rounded-xl font-bold tracking-tight ${
                    isActive 
                    ? "bg-zinc-900 text-white shadow-md shadow-zinc-200 dark:bg-white dark:text-zinc-900 dark:shadow-none" 
                    : "text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
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
