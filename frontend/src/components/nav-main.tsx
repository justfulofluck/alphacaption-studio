import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { PlusCircleIcon } from "lucide-react"
import { Link, useNavigate, useLocation } from "react-router-dom"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
  }[]
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const isQuickCreateActive = location.pathname === '/';

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Quick Create"
              onClick={() => navigate('/')}
              className={`w-full transition-all duration-300 shadow-lg rounded-xl py-5 px-4 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:justify-center ${
                isQuickCreateActive 
                ? "bg-zinc-900 text-white shadow-lg shadow-zinc-200 dark:bg-white dark:text-zinc-900 dark:shadow-none" 
                : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 shadow-none border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-700"
              }`}
            >
              <PlusCircleIcon className="size-5 shrink-0" />
              <span className="font-black tracking-tight group-data-[collapsible=icon]:hidden">Quick Create</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu className="gap-2">
          {items.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild
                  tooltip={item.title}
                  className={`flex items-center gap-3 transition-all duration-300 py-5 px-4 rounded-xl font-bold tracking-tight ${
                    isActive 
                    ? "bg-zinc-900 text-white shadow-md shadow-zinc-200 dark:bg-white dark:text-zinc-900 dark:shadow-none" 
                    : "text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                  }`}
                >
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
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
