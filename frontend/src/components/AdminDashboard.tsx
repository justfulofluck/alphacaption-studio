"use client"

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, 
  CreditCard, 
  Cpu, 
  BarChart3, 
  Loader2, 
  ShieldCheck, 
  ShieldAlert,
  ServerIcon
} from 'lucide-react';
import { 
  SidebarInset, 
  SidebarProvider 
} from "@/components/ui/sidebar"
import { StudioSidebar } from "@/components/StudioSidebar"
import { SiteHeader } from "@/components/site-header"
import { SectionCards } from "@/components/section-cards"
import { DashboardTable } from "@/components/DashboardTable"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000`;

interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  joinedAt: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscribers: 0,
    totalTokensUsed: 0,
    monthlyRevenue: "$0"
  });

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        navigate('/admin/login');
        return;
      }

      try {
        const meRes = await axios.get(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAdminUser(meRes.data);

        // Mocking admin data for demonstration as in previous version
        const mockUsers: AdminUser[] = [
          { id: '1', name: 'John Doe', email: 'john@example.com', plan: 'pro', status: 'active', joinedAt: '2026-04-10' },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com', plan: 'basic', status: 'active', joinedAt: '2026-04-12' },
          { id: '3', name: 'Bob Wilson', email: 'bob@example.com', plan: 'enterprise', status: 'active', joinedAt: '2026-04-15' },
          { id: '4', name: 'Alice Brown', email: 'alice@example.com', plan: 'free', status: 'deactivated', joinedAt: '2026-04-16' },
        ];
        setUsers(mockUsers);
        setStats({
          totalUsers: 1250,
          activeSubscribers: 450,
          totalTokensUsed: 1520000,
          monthlyRevenue: '$4,250'
        });
      } catch (err) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
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
      description: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      footerLabel: "User Growth",
      footerDescription: "+12.5% this month",
      isUp: true,
      actionLabel: "Healthy"
    },
    {
      description: "Active Subs",
      value: stats.activeSubscribers,
      icon: ShieldCheck,
      footerLabel: "Retention",
      footerDescription: "High subscription rate",
      isUp: true,
      actionLabel: "+5.2%"
    },
    {
      description: "Tokens Consumed",
      value: `${(stats.totalTokensUsed / 1000000).toFixed(1)}M`,
      icon: Cpu,
      footerLabel: "AI Usage",
      footerDescription: "Steady API utilization",
      isUp: true,
      actionLabel: "Optimal"
    },
    {
      description: "Revenue",
      value: stats.monthlyRevenue,
      icon: BarChart3,
      footerLabel: "MRR",
      footerDescription: "Monthly Recurring Revenue",
      isUp: true,
      actionLabel: "Growth"
    }
  ];

  const columns = [
    { header: "User Name", accessorKey: "name" },
    { header: "Email Address", accessorKey: "email" },
    { header: "Subscription", accessorKey: "plan" },
    { header: "Account Status", accessorKey: "status" }
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
        role: "admin" 
      }} />
      <SidebarInset>
        <SiteHeader user={{ name: adminUser?.name || "Admin", avatar: adminUser?.avatar }} />
        <div className="flex flex-1 flex-col gap-8 p-4 md:p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-zinc-900 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">
                  Production Mode
                </span>
                <span className="text-muted-foreground text-sm flex items-center gap-1">
                  <ServerIcon size={14} /> System Healthy
                </span>
              </div>
            </div>
          </div>
          
          <SectionCards cards={statCards} />
          
          <DashboardTable 
            title="User Management"
            data={users} 
            columns={columns}
            onAction={(action, row) => console.log(action, row)}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
