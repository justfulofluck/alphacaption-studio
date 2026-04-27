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
  History
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

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Check token expiration locally
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (Date.now() >= payload.exp * 1000) {
          localStorage.removeItem('auth_token');
          navigate('/login');
          return;
        }
      } catch (e) {
        localStorage.removeItem('auth_token');
        navigate('/login');
        return;
      }

      try {
        const [userRes, projectsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/api/projects`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setUser(userRes.data);
        setProjects(projectsRes.data || []);
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
      value: user?.credits || 0,
      icon: Zap,
      footerLabel: "Plan Type",
      footerDescription: `${user?.plan.toUpperCase()} Account`,
      isUp: true,
      actionLabel: "Active"
    },
    {
      description: "Total Projects",
      value: projects.length,
      icon: LayoutDashboard,
      footerLabel: "Engagement",
      footerDescription: "Projects Created Overall",
      isUp: true,
      actionLabel: "Syncing"
    },
    {
      description: "Active Subscriptions",
      value: "1",
      icon: CreditCard,
      footerLabel: "Billing Status",
      footerDescription: "Current Cycle Active",
      isUp: true,
      actionLabel: "Paid"
    },
    {
      description: "Recent Exports",
      value: projects.filter(p => p.status === 'completed').length,
      icon: History,
      footerLabel: "Completion Rate",
      footerDescription: "SRT Files Generated",
      isUp: true,
      actionLabel: "Healthy"
    }
  ];

  const columns = [
    { header: "Project Name", accessorKey: "name" },
    { header: "Date Added", accessorKey: "created_at" },
    { header: "Current Status", accessorKey: "status" }
  ];

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Studio Dashboard</h2>
          <p className="text-muted-foreground">Manage your transcription projects and credits</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => navigate('/')} className="font-bold">
            <Plus size={18} className="mr-2" />
            New Project
          </Button>
        </div>
      </div>

      <SectionCards cards={statCards} />

      <DashboardTable
        title="Recent Projects"
        data={projects.map(p => ({
          ...p,
          created_at: new Date(p.created_at).toLocaleDateString()
        }))}
        columns={columns}
        onAction={(action, row) => console.log(action, row)}
      />
    </div>
  );
}
