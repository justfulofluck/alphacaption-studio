import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, Loader2, Clock, ServerIcon } from 'lucide-react';
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { StudioSidebar } from "@/components/StudioSidebar"
import { SiteHeader } from "@/components/site-header"
import { SectionCards } from "@/components/section-cards"
import { API_BASE_URL } from "@/api/config";

export default function VisitorsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalVisitors: 0,
    todayVisitors: 0
  });
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        navigate('/admin/login');
        return;
      }
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [meRes, statsRes, eventsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/auth/me`, { headers }),
          axios.get(`${API_BASE_URL}/api/auth/admin/stats`, { headers }),
          axios.get(`${API_BASE_URL}/api/visitor/events/recent`, { headers })
        ]);
        setAdminUser(meRes.data);
        setStats(statsRes.data);
        setRecentEvents(eventsRes.data);
      } catch (err) {
        console.error("Failed to load visitors data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [navigate]);

  const statCards = [
    {
      description: "Visitors Today",
      value: stats.todayVisitors.toLocaleString(),
      icon: Eye,
      footerLabel: "Total Visitors",
      footerDescription: `${stats.totalVisitors.toLocaleString()} all time`,
      isUp: true,
      actionLabel: "Active"
    }
  ];

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "280px",
        "--header-height": "64px",
      } as React.CSSProperties}
    >
      <StudioSidebar user={{
        name: adminUser?.name || "Admin",
        email: adminUser?.email || "",
        role: adminUser?.role || "admin"
      }} />
      <SidebarInset>
        <SiteHeader user={{ name: adminUser?.name || "Admin", avatar: adminUser?.avatar }} />
        <div className="flex flex-1 flex-col gap-8 p-4 md:p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Visitors Info and Recent Activity</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-zinc-900 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">
                  Production Mode
                </span>
                <span className="text-muted-foreground text-sm flex items-center gap-1 ml-2">
                  <ServerIcon size={14} /> System Healthy
                </span>
              </div>
            </div>
          </div>

          <SectionCards cards={statCards} />

          <div className="rounded-[2rem] bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-orange-400" />
                <h2 className="text-lg font-bold tracking-tight">Recent Activity</h2>
              </div>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
              ) : recentEvents.length === 0 ? (
                <p className="text-sm text-zinc-500 py-4 text-center">No recent visitor activity</p>
              ) : (
                recentEvents.slice(0, 20).map((event: any) => (
                  <div key={event.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                    <span className="mt-0.5 text-sm">
                      {event.event_type === 'page_view' ? '🟢' : '🖱️'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {event.event_type === 'page_view' ? 'New visitor arrived' : `Clicked "${event.event_label}"`}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {(() => {
                          const diff = Date.now() - new Date(event.created_at).getTime();
                          const sec = Math.floor(diff / 1000);
                          if (sec < 60) return `${sec}s ago`;
                          const min = Math.floor(sec / 60);
                          if (min < 60) return `${min}m ${sec % 60}s ago`;
                          return `${Math.floor(min / 60)}h ago`;
                        })()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
