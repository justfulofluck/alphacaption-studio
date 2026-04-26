import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { 
  EllipsisVerticalIcon, 
  CircleUserRoundIcon, 
  LogOutIcon
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000`;

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
    plan?: string
  }
}) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()

  const handleLogout = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      if (token) {
        await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('admin_token');
      navigate('/login');
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger 
            nativeButton={true}
            className="w-full"
            render={
              <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <Avatar className="size-8 rounded-lg grayscale">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-primary text-white font-bold">
                    {user.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-black">{user.name}</span>
                  <span className="truncate text-[10px] font-bold text-primary uppercase tracking-widest leading-none">
                    {user.plan || 'Free'} Plan
                  </span>
                </div>
                <EllipsisVerticalIcon className="ml-auto size-4" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem 
                onSelect={() => navigate('/settings')} 
                onClick={() => navigate('/settings')}
                className="cursor-pointer"
              >
                <CircleUserRoundIcon className="mr-2 h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onSelect={handleLogout} 
              onClick={handleLogout}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive font-bold cursor-pointer"
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              Log out Session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
