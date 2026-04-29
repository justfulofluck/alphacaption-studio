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
      value: `${user?.credits || 0}m`,
      icon: Zap,
      footerLabel: "Usage Rate",
      footerDescription: `${((user?.credits || 0) / 10).toFixed(0)}% available`,
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
      value: projects.filter(p => p.status === 'completed').length,
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

  return (
    <div className="flex flex-1 flex-col gap-10 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-zinc-900">Studio Dashboard</h2>
          <p className="text-zinc-500 font-medium mt-1">Welcome back, {user?.name.split(' ')[0]}!</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => navigate('/pricing')} className="font-bold border-zinc-200 h-11 px-6 rounded-2xl hover:bg-zinc-50">
            <Zap size={18} className="mr-2 text-primary fill-primary/20" />
            Upgrade Plan
          </Button>
          <Button onClick={() => navigate('/')} className="font-bold bg-zinc-900 text-white h-11 px-6 rounded-2xl hover:bg-zinc-800 shadow-lg shadow-zinc-200">
            <Plus size={18} className="mr-2" />
            New Project
          </Button>
        </div>
      </div>

      <SectionCards cards={statCards} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Projects Section */}
        <div className="lg:col-span-2 space-y-4">
          <DashboardTable
            title="Recent Projects"
            data={projects.map(p => ({
              ...p,
              created_at: new Date(p.created_at).toLocaleDateString()
            }))}
            columns={projectColumns}
            onAction={(action, row) => navigate('/')}
          />
        </div>

        {/* Usage & Billing Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          {/* Credit Progress Card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl shadow-zinc-100/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg">Usage Analytics</h3>
              <div className="p-2 bg-zinc-50 rounded-xl"><ArrowUpRight size={18} className="text-zinc-400" /></div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Monthly Credits</span>
                <span className="text-sm font-black text-zinc-900">{user?.credits}m Left</span>
              </div>
              <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((user?.credits || 0) / 100) * 100}%` }}
                  className="h-full bg-zinc-900 rounded-full"
                />
              </div>
              <p className="text-[10px] font-bold text-zinc-400 text-center uppercase tracking-widest leading-relaxed">
                Automatic reset in 22 days
              </p>
            </div>

            <Button onClick={() => navigate('/settings?tab=subscription')} variant="ghost" className="w-full mt-6 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 h-12 rounded-xl">
              Detailed Report <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>

          {/* Quick History Card */}
          <div className="bg-zinc-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-zinc-900/10">
            <h3 className="font-black text-lg mb-6">Recent Billing</h3>
            <div className="space-y-6">
              {billingHistory.length > 0 ? billingHistory.map((item, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer" onClick={() => navigate('/settings?tab=subscription')}>
                  <div className="flex items-center gap-4">
                    <div className={`size-10 rounded-xl flex items-center justify-center ${item.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
                      <History size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">Credits {item.amount > 0 ? 'Added' : 'Used'}</p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="text-sm font-black">{item.amount > 0 ? '+' : ''}{item.amount}m</span>
                </div>
              )) : (
                <p className="text-zinc-500 text-sm font-medium">No recent activity.</p>
              )}
            </div>

            <Button onClick={() => navigate('/pricing')} className="w-full mt-8 bg-white text-zinc-900 hover:bg-zinc-100 font-black h-12 rounded-xl border-none">
              Buy More Credits
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
