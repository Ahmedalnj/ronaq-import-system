"use client"

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, signOut } from '@/hooks/use-auth';

interface LayoutProps {
  children: React.ReactNode;
}

export function RtlLayout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { profile, loading } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const hasPermission = (perm: string) => {
    if (loading) return false;
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    return profile.permissions?.includes(perm) || false;
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAFA]">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? 'translate-x-0' : 'translate-x-full'
          } fixed right-0 z-40 w-64 h-screen bg-white border-l border-slate-200 transition-transform duration-300 lg:relative lg:translate-x-0`}
        >
          <div className="p-6 border-b border-slate-100">
            <Link href="/dashboard" className="text-2xl font-extrabold text-[#0A7C6E]">
              ✨ رونق للاستيراد
            </Link>
          </div>

          <nav className="space-y-1.5 p-4">
            {!loading && profile && (
              <>
                <NavLink href="/dashboard" label="لوحة التحكم" icon="📊" active={pathname === '/dashboard'} />
                
                {hasPermission('trips:read') && (
                  <NavLink href="/trips" label="الرحلات" icon="✈️" active={pathname === '/trips'} />
                )}
                
                {hasPermission('exchange:read') && (
                  <NavLink href="/exchange" label="الصرف والعملات" icon="🔄" active={pathname === '/exchange'} />
                )}
                
                {hasPermission('cars:read') && (
                  <NavLink href="/cars" label="السيارات" icon="🚗" active={pathname?.startsWith('/cars')} />
                )}
                
                {hasPermission('containers:read') && (
                  <NavLink href="/containers" label="الحاويات" icon="📦" active={pathname === '/containers'} />
                )}
                
                {hasPermission('expenses:read') && (
                  <NavLink href="/expenses" label="النفقات" icon="💸" active={pathname === '/expenses'} />
                )}
                
                {hasPermission('sales:read') && (
                  <NavLink href="/sales" label="المبيعات" icon="💰" active={pathname === '/sales'} />
                )}
                
                {hasPermission('installments:read') && (
                  <NavLink href="/installments" label="الأقساط" icon="📋" active={pathname === '/installments'} />
                )}
                
                {hasPermission('reports:read') && (
                  <NavLink href="/reports" label="الميزانية والتقارير" icon="🏛️" active={pathname === '/reports'} />
                )}

                {profile.role === 'admin' && (
                  <NavLink href="/users" label="إدارة المستخدمين" icon="👥" active={pathname === '/users'} />
                )}
              </>
            )}
            {loading && (
              <div className="text-center py-8 text-slate-400 text-sm">جاري تحميل القائمة...</div>
            )}
          </nav>

          <div className="absolute bottom-6 left-6 right-6 space-y-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-destructive hover:bg-red-50 hover:text-red-600 transition-colors"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 ml-2" />
              تسجيل الخروج
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Nav */}
          <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-slate-600 dark:text-slate-400"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="text-slate-600 dark:text-slate-400 flex items-center gap-3">
              <span>مرحباً بك في نظام إدارة الاستيراد</span>
              {!loading && profile && (
                <span className="text-xs bg-[#0A7C6E]/10 text-[#0A7C6E] font-medium px-2 py-0.5 rounded-full">
                  {profile.role === 'admin' ? 'مدير عام' : profile.role === 'user' ? 'موظف عمليات' : 'مشاهد'}
                </span>
              )}
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-auto bg-[#FAFAFA]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
        active
          ? 'bg-[#0A7C6E]/10 text-[#0A7C6E] font-semibold'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm">{label}</span>
    </Link>
  );
}
