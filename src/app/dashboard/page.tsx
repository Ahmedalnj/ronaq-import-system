"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { RtlLayout } from '@/components/shared/layout';
import {
  DashboardMetricsCards,
  SalesChart,
  CarStatusChart,
  ProfitTrendChart,
} from '@/components/dashboard/dashboard-charts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardMetrics {
  totalCapital: number;
  totalCars: number;
  soldCars: number;
  availableCars: number;
  totalProfit: number;
  remainingLiabilities: number;
  totalExpenses: number;
  totalSales: number;
  averageExchangeRate: number;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) {
      setMetrics(null);
      setError(false);
      return;
    }

    let active = true;
    setMetrics(null);
    setError(false);

    (async () => {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) throw new Error('Failed to fetch metrics');
        const data = await response.json();
        if (active) setMetrics(data);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        if (active) setError(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  const metricsLoading = Boolean(userId) && metrics === null && !error;

  if (authLoading || metricsLoading) {
    return (
      <RtlLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">جاري التحميل...</h1>
          </div>
        </div>
      </RtlLayout>
    );
  }

  if (error || !metrics) {
    return (
      <RtlLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-red-600">
              {user ? 'خطأ في تحميل البيانات' : 'يرجى تسجيل الدخول'}
            </h1>
          </div>
        </div>
      </RtlLayout>
    );
  }

  return (
    <RtlLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            مرحباً بك! 👋
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            إليك نظرة عامة على نشاطك اليوم
          </p>
        </div>

        {/* Metrics Cards */}
        <DashboardMetricsCards metrics={metrics} />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesChart />
          <CarStatusChart />
        </div>

        {/* Additional Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProfitTrendChart />
          <Card>
            <CardHeader>
              <CardTitle>ملخص سريع</CardTitle>
              <CardDescription>إحصائيات أساسية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm text-slate-600 dark:text-slate-400">معدل الصرف</span>
                  <span className="font-semibold">
                    {metrics.averageExchangeRate.toFixed(2)} ليبي/$
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    نسبة المبيعات
                  </span>
                  <span className="font-semibold">
                    {metrics.totalCars > 0
                      ? Math.round((metrics.soldCars / metrics.totalCars) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    متوسط الربح للسيارة
                  </span>
                  <span className="font-semibold">
                    {metrics.soldCars > 0
                      ? Math.round(metrics.totalProfit / metrics.soldCars).toLocaleString('ar-LY')
                      : 0}{' '}
                    ليبي
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>إجراءات سريعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'إضافة رحلة', emoji: '✈️', href: '/trips' },
                { label: 'إضافة سيارة', emoji: '🚗', href: '/cars' },
                { label: 'تسجيل مبيعة', emoji: '💰', href: '/sales' },
                { label: 'تسجيل نفقة', emoji: '💸', href: '/expenses' },
              ].map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-center"
                >
                  <div className="text-2xl mb-2">{action.emoji}</div>
                  <span className="text-sm font-medium">{action.label}</span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </RtlLayout>
  );
}
