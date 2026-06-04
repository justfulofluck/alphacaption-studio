import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, Loader2, Clock, ServerIcon, Globe, BarChart3, Filter } from 'lucide-react';
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
  const [popularPages, setPopularPages] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [eventFilter, setEventFilter] = useState<string>('all');

  const fetchData = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const url = eventFilter === 'all'
      ? `${API_BASE_URL}/api/visitor/events/recent`
      : `${API_BASE_URL}/api/visitor/events/recent?type=${eventFilter}`;

    try { const r = await axios.get(`${API_BASE_URL}/api/auth/me`, { headers }); setAdminUser(r.data); } catch (e) {}
    try { const r = await axios.get(`${API_BASE_URL}/api/auth/admin/stats`, { headers }); setStats((s: any) => ({ ...s, ...r.data })); } catch (e) {}
    try { const r = await axios.get(url, { headers }); setRecentEvents(r.data); } catch (e) {}
    try { const r = await axios.get(`${API_BASE_URL}/api/visitor/popular-pages`, { headers }); setPopularPages(r.data); } catch (e) {}
    try { const r = await axios.get(`${API_BASE_URL}/api/visitor/daily-stats`, { headers }); setDailyStats(r.data); } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [navigate, eventFilter]);

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

  const maxDailyVisits = Math.max(1, ...dailyStats.map((d: any) => d.visits));

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
                <span className="px-2 py-0.5 bg-zinc-900 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">Production Mode</span>
                <span className="text-muted-foreground text-sm flex items-center gap-1 ml-2"><ServerIcon size={14} /> System Healthy</span>
              </div>
            </div>
          </div>

          <SectionCards cards={statCards} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-[2rem] bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={18} className="text-orange-400" />
                <h2 className="text-lg font-bold tracking-tight">Popular Pages</h2>
              </div>
              {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
              ) : popularPages.length === 0 ? (
                <p className="text-sm text-zinc-500 py-4 text-center">No page data yet</p>
              ) : (
                <div className="space-y-2">
                  {popularPages.map((page: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
                      <span className="text-xs font-bold text-zinc-500 w-6">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{page.page}</p>
                        <div className="h-1.5 rounded-full bg-zinc-800 mt-1">
                          <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, (page.visits / Math.max(...popularPages.map((p: any) => p.visits))) * 100)}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-orange-400">{page.visits}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[2rem] bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-orange-400" />
                <h2 className="text-lg font-bold tracking-tight">Daily Visitors (30 days)</h2>
              </div>
              {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
              ) : dailyStats.length === 0 ? (
                <p className="text-sm text-zinc-500 py-4 text-center">No daily data yet</p>
              ) : (
                <div className="flex items-end gap-1 h-48">
                  {dailyStats.map((d: any, i: number) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <span className="text-[10px] text-zinc-500 font-medium">{d.visits}</span>
                      <div
                        className="w-full rounded-t-md bg-orange-500/80 hover:bg-orange-400 transition-colors min-h-[4px]"
                        style={{ height: `${(d.visits / maxDailyVisits) * 100}%` }}
                        title={`${d.date}: ${d.visits} visits`}
                      />
                      {dailyStats.length <= 15 && (
                        <span className="text-[8px] text-zinc-600 -rotate-45 origin-left whitespace-nowrap">{d.date?.slice(5) || ''}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-orange-400" />
                <h2 className="text-lg font-bold tracking-tight">Recent Activity</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-zinc-500" />
                  <select
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="all">All Events</option>
                    <option value="page_view">Page Views</option>
                    <option value="click">Clicks</option>
                  </select>
                </div>
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-green-500 animate-pulse" /> Live
                </span>
              </div>
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
              ) : recentEvents.length === 0 ? (
                <p className="text-sm text-zinc-500 py-4 text-center">No recent visitor activity</p>
              ) : (
                recentEvents.slice(0, 30).map((event: any) => (
                  <div key={event.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                    <span className="mt-0.5 text-sm">{event.event_type === 'page_view' ? '🟢' : '🖱️'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {event.event_type === 'page_view' ? 'New visitor arrived' : `Clicked "${event.event_label}"`}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {(() => { const d = Date.now() - new Date(event.created_at).getTime(); const s = Math.floor(d / 1000); if (s < 60) return `${s}s ago`; const m = Math.floor(s / 60); if (m < 60) return `${m}m ${s % 60}s ago`; return `${Math.floor(m / 60)}h ago`; })()}
                      </p>
                    </div>
                    <span className="text-[10px] text-zinc-600 truncate max-w-[120px]">{event.page_url}</span>
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
