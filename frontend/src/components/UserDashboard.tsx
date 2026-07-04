"use client"

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Plus,
  Loader2,
  LayoutDashboard,
  Zap,
  CreditCard,
  History,
  CheckCircle2,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar"
import { StudioSidebar } from "@/components/StudioSidebar"
import { SiteHeader } from "@/components/site-header"
import { SectionCards } from "@/components/section-cards"
import { DashboardTable } from "@/components/DashboardTable"
import { Button } from "@/components/ui/button"
import { motion } from "motion/react"

import { API_BASE_URL } from "@/api/config";

interface UserData {
  id: number;
  name: string;
  email: string;
  plan: string;
  credits: number;
}

interface Project {
  id: number;
  name: string;
  audio_filename: string;
  created_at: string;
  status: string;
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const [userRes, projectsRes, billingRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/api/projects`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/api/credit/history`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setUser(userRes.data);
        setProjects(projectsRes.data || []);
        setBillingHistory((billingRes.data || []).slice(0, 3)); // Only show last 3 for dashboard
      } catch (err: any) {
        if (err.response?.status === 401) {
          localStorage.removeItem('auth_token');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  const statCards = [
    {
      description: "Remaining Credits",
      value: `${user?.credits || 0}cr`,
      icon: Zap,
      footerLabel: "Usage Rate",
      footerDescription: `${Math.min(100, Math.round(((user?.credits || 0) / 500) * 100))}% available`,
      isUp: true,
      actionLabel: "Healthy"
    },
    {
      description: "Total Projects",
      value: projects.length,
      icon: LayoutDashboard,
      footerLabel: "Creative Output",
      footerDescription: "Projects Created",
      isUp: true,
      actionLabel: "Synced"
    },
    {
      description: "Active Tier",
      value: user?.plan.toUpperCase() || 'FREE',
      icon: CreditCard,
      footerLabel: "Renewal",
      footerDescription: "Next: May 2026",
      isUp: true,
      actionLabel: "Active"
    },
    {
      description: "Completed",
      value: projects.filter(p => p.status === 'completed' || p.status === 'aligned').length,
      icon: CheckCircle2,
      footerLabel: "SRT Files",
      footerDescription: "Ready for export",
      isUp: true,
      actionLabel: "Done"
    }
  ];

  const projectColumns = [
    { header: "Project Name", accessorKey: "name" },
    { header: "Date Added", accessorKey: "created_at" },
    { header: "Current Status", accessorKey: "status" }
  ];

  const handleTableAction = async (action: string, row: any) => {
    if (action === 'open') {
      navigate('/', { state: { projectId: row.id } });
    } else if (action === 'download') {
      const token = localStorage.getItem('auth_token');
      try {
        const res = await axios.get(`${API_BASE_URL}/api/captions/${row.id}/export`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${row.name.replace(/\.[^/.]+$/, "") || 'captions'}.srt`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        alert("Failed to export captions");
      }
    } else if (action === 'delete') {
      if (!confirm("Delete this project?")) return;
      const token = localStorage.getItem('auth_token');
      try {
        await axios.delete(`${API_BASE_URL}/api/projects/${row.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProjects(prev => prev.filter(p => p.id !== row.id));
      } catch (err) {
        alert("Failed to delete project");
      }
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 md:gap-10 p-4 md:p-8 pt-4 md:pt-6 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">Home</h2>
          <p className="text-[#A1A1A1] font-medium mt-1">Welcome back, {user?.name.split(' ')[0]}!</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            onClick={() => navigate('/pricing')} 
            className="flex-1 md:flex-none font-black uppercase tracking-widest text-[9px] md:text-[10px] border-[#262626] bg-[#262626] text-white h-11 md:h-12 px-4 md:px-7 rounded-lg hover:bg-[#333333] transition-all"
          >
            <Zap size={14} className="mr-2 text-[#FF7A00] fill-[#FF7A00]/20" />
            Upgrade
          </Button>
          <Button 
            onClick={() => navigate('/')} 
            className="flex-1 md:flex-none font-black uppercase tracking-widest text-[9px] md:text-[10px] bg-[#FF7A00] text-black h-11 md:h-12 px-4 md:px-7 rounded-lg hover:bg-[#e66c00] shadow-none hover:shadow-[0_0_20px_rgba(255,122,0,0.4)] transition-all active:scale-95"
          >
            <Plus size={16} className="mr-2" />
            New Project
          </Button>
        </div>
      </div>

      <SectionCards cards={statCards} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Projects Section */}
        <div className="lg:col-span-3 space-y-4">
          <DashboardTable
            title="Recent Projects"
            data={projects.map(p => ({
              ...p,
              created_at: new Date(p.created_at).toLocaleDateString()
            }))}
            columns={projectColumns}
            onAction={handleTableAction}
          />
        </div>

        {/* Usage & Billing Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          {/* Credit Progress Card */}
          <div className="premium-card p-8 rounded-2xl border border-[#262626] bg-[#1A1A1A] backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-lg text-white">Usage Analytics</h3>
              <div className="p-2 bg-[#FF7A00]/10 rounded-xl"><ArrowUpRight size={18} className="text-[#FF7A00]" /></div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#A1A1A1]">Monthly Credits</span>
                <span className="text-sm font-black text-white">{user?.credits}cr Left</span>
              </div>
              <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, ((user?.credits || 0) / 500) * 100)}%` }}
                  className="h-full bg-[#FF7A00] rounded-full shadow-[0_0_10px_rgba(255,120,0,0.5)]"
                />
              </div>
              <p className="text-[10px] font-bold text-[#A1A1A1] text-center uppercase tracking-widest leading-relaxed">
                Automatic reset in 22 days
              </p>
            </div>

            <Button onClick={() => navigate('/settings?tab=subscription')} variant="ghost" className="w-full mt-8 text-[10px] font-black uppercase tracking-widest text-[#A1A1A1] hover:text-[#FF7A00] hover:bg-transparent transition-all">
              Detailed Report <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>

          {/* Quick History Card */}
          <div className="bg-[#1A1A1A] p-8 rounded-2xl text-white shadow-2xl border border-[#262626]">
            <h3 className="font-black text-lg mb-8">Recent Billing</h3>
            <div className="space-y-8">
              {billingHistory.length > 0 ? billingHistory.map((item, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer" onClick={() => navigate('/settings?tab=subscription')}>
                  <div className="flex items-center gap-4">
                    <div className={`size-10 rounded-2xl flex items-center justify-center bg-zinc-800 border border-[#262626] shadow-inner`}>
                      <History size={18} className={item.type === 'credit' ? 'text-emerald-400' : 'text-[#FF7A00]'} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">Credits {item.type === 'credit' ? 'Added' : 'Used'}</p>
                      <p className="text-[10px] font-bold text-[#A1A1A1] uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-black ${item.type === 'credit' ? 'text-emerald-400' : 'text-[#FF7A00]'}`}>
                    {item.type === 'credit' ? '+' : '-'}{item.amount}cr
                  </span>
                </div>
              )) : (
                <p className="text-[#A1A1A1] text-sm font-medium">No recent activity.</p>
              )}
            </div>

            <Button onClick={() => navigate('/pricing')} className="w-full mt-10 bg-transparent border border-[#262626] text-white hover:bg-[#262626] font-black uppercase tracking-widest text-[10px] h-14 rounded-lg transition-all">
              Buy More Credits
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
