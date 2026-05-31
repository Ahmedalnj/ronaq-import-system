"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { RtlLayout } from '@/components/shared/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader, AlertTriangle, CheckCircle, Calendar, Phone, Car } from 'lucide-react';
import { createClient } from '@/lib/db/client';

interface Installment {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  installment_dates: string[];
  status: 'fully_paid' | 'partial' | 'overdue';
  created_at: string;
  car_id: string;
  car?: {
    car_name: string;
    brand: string;
    model: string;
  };
}

export default function InstallmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    const fetchInstallments = async () => {
      try {
        // Query installments and join cars table
        const { data, error: queryError } = await supabase
          .from('installments')
          .select('*, car:cars(car_name, brand, model)');

        if (queryError) throw queryError;
        setInstallments(data as Installment[]);
      } catch (err: any) {
        setError(err.message || 'فشل في جلب الأقساط من قاعدة البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchInstallments();
  }, [user]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      fully_paid: 'bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-900/30',
      partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/30',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/30',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      fully_paid: 'خالص بالكامل',
      partial: 'سداد جزئي نشط',
      overdue: 'متأخرات ومستحقات',
    };
    return labels[status] || status;
  };

  const moneyFormat = (val: number) => {
    return `${val.toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل`;
  };

  if (authLoading || loading) {
    return (
      <RtlLayout>
        <div className="flex items-center justify-center h-full">
          <Loader className="w-8 h-8 animate-spin text-[#0A7C6E]" />
        </div>
      </RtlLayout>
    );
  }

  return (
    <RtlLayout>
      <div className="p-8 space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">📋 سجل وجدولة الأقساط</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            مراقبة أقساط المشترين للسيارات المبيعة بالتقسيط وجدولة دفعاتها الشهرية ومراجعة المتأخرات
          </p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}

        {/* Installment Cards */}
        {installments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-slate-500">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-bold mb-2">لا توجد سيارات مبيعة بالتقسيط</h3>
              <p className="text-slate-500">
                عند تسجيل عملية بيع سيارة جديدة واختيار نوع الدفع "بيع بالتقسيط" ستظهر أقساط الزبون وجدول الدفعات هنا تلقائياً.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {installments.map((inst) => (
              <Card key={inst.id} className="border border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl font-bold">{inst.customer_name}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1.5"><Phone size={14} /> {inst.customer_phone}</span>
                        <span className="flex items-center gap-1.5"><Car size={14} /> {inst.car?.brand} {inst.car?.car_name} {inst.car?.model}</span>
                      </CardDescription>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold self-start md:self-center ${getStatusColor(inst.status)}`}>
                      {getStatusLabel(inst.status)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Financial details */}
                    <div className="space-y-2 border-l border-slate-100 dark:border-slate-800/80 pl-6">
                      <h4 className="text-sm font-semibold text-slate-400">الملخص المالي</h4>
                      <div className="flex justify-between py-1 text-sm">
                        <span className="text-slate-500">مجموع الأقساط الإجمالي:</span>
                        <span className="font-bold">{moneyFormat(inst.total_amount)}</span>
                      </div>
                      <div className="flex justify-between py-1 text-sm">
                        <span className="text-slate-500">ما تم سداده بالفعل:</span>
                        <span className="font-bold text-green-600">-{moneyFormat(inst.paid_amount)}</span>
                      </div>
                      <div className="flex justify-between py-1 text-sm border-t border-slate-100 dark:border-slate-800/80 pt-2">
                        <span className="text-slate-500">المبلغ المتبقي للتحصيل:</span>
                        <span className="font-bold text-red-600">{moneyFormat(inst.remaining_amount)}</span>
                      </div>
                    </div>

                    {/* Schedule detail */}
                    <div className="space-y-3 md:col-span-2">
                      <h4 className="text-sm font-semibold text-slate-400 flex items-center gap-1.5">
                        <Calendar size={16} /> مواعيد دفعات الأقساط المحددة
                      </h4>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {inst.installment_dates && inst.installment_dates.map((date, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm"
                          >
                            <span className="bg-[#0A7C6E]/10 text-[#0A7C6E] w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold">
                              {idx + 1}
                            </span>
                            <span className="font-mono font-medium">
                              {new Date(date).toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      </div>
    </RtlLayout>
  );
}
