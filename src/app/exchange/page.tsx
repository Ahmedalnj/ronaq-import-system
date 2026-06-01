"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { RtlLayout } from '@/components/shared/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { confirmDelete, getErrorMessage, notify } from '@/lib/notify';
import { Loader, Plus, RefreshCw, Trash2, Calendar, DollarSign, ArrowRight, Pencil } from 'lucide-react';

interface Trip {
  id: string;
  trip_name: string;
}

interface ExchangeTransaction {
  id: string;
  trip_id: string;
  description?: string;
  amount_usd: number;
  exchange_rate: number;
  amount_lyd: number;
  date: string;
  created_at: string;
  trips?: {
    trip_name: string;
  };
}

export default function ExchangePage() {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<ExchangeTransaction[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    trip_id: '',
    description: '',
    amount_usd: 0,
    exchange_rate: 6.50,
    date: new Date().toISOString().split('T')[0],
  });

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/exchange-transactions');
      if (!response.ok) throw new Error('فشل في تحميل سجل الصرف');
      const data = await response.json();
      setTransactions(data);
    } catch (err: unknown) {
      notify.error(getErrorMessage(err));
    }
  };

  const fetchTrips = async () => {
    try {
      const response = await fetch('/api/trips');
      if (!response.ok) throw new Error('فشل في جلب الرحلات');
      const data = await response.json();
      setTrips(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      Promise.all([fetchTransactions(), fetchTrips()]).finally(() => {
        setLoading(false);
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!formData.trip_id) {
        throw new Error('يرجى تحديد الرحلة المرتبطة بعملية الصرف');
      }
      if (formData.amount_usd <= 0 || formData.exchange_rate <= 0) {
        throw new Error('يرجى إدخال قيم موجبة صالحة للمبالغ وأسعار الصرف');
      }

      const method = editingId ? 'PUT' : 'POST';
      const bodyData = editingId 
        ? {
            id: editingId,
            ...formData,
            amount_usd: Number(formData.amount_usd),
            exchange_rate: Number(formData.exchange_rate),
          }
        : {
            ...formData,
            amount_usd: Number(formData.amount_usd),
            exchange_rate: Number(formData.exchange_rate),
          };

      const response = await fetch('/api/exchange-transactions', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل في حفظ عملية الصرف');
      }

      notify.success(editingId ? 'تم تعديل عملية الصرف وتحديث رأس مال الرحلة تلقائياً بنجاح!' : 'تم إضافة عملية شراء الدولار وتحديث رأس مال الرحلة تلقائياً بنجاح!');
      setShowAddForm(false);
      setEditingId(null);
      setFormData({
        trip_id: '',
        description: '',
        amount_usd: 0,
        exchange_rate: 6.50,
        date: new Date().toISOString().split('T')[0],
      });
      fetchTransactions();
    } catch (err: unknown) {
      notify.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tx: ExchangeTransaction) => {
    setEditingId(tx.id);
    setFormData({
      trip_id: tx.trip_id,
      description: tx.description || '',
      amount_usd: tx.amount_usd,
      exchange_rate: tx.exchange_rate,
      date: tx.date,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    await confirmDelete(
      'حذف عملية الصرف هذه؟',
      async () => {
        const response = await fetch(`/api/exchange-transactions?id=${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('فشل في حذف العملية');
        await fetchTransactions();
      },
      {
        description: 'سيتم تخفيض رأس مال الرحلة المرتبطة تلقائياً.',
        successMessage: 'تم حذف عملية الصرف وتحديث الحسابات بنجاح!',
      }
    );
  };

  const lydFormat = (val: number) => {
    return `${val.toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل`;
  };

  const usdFormat = (val: number) => {
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  // Summary Aggregations
  const totalUsdPurchased = transactions.reduce((sum, tx) => sum + Number(tx.amount_usd), 0);
  const totalSpentLyd = transactions.reduce((sum, tx) => sum + Number(tx.amount_lyd), 0);
  const averageGlobalRate = totalUsdPurchased > 0 ? (totalSpentLyd / totalUsdPurchased) : 0;

  return (
    <RtlLayout>
      <div className="p-8 space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">🔄 الصرف وتحويل العملات</h1>
            <p className="text-slate-600 mt-2">
              تسجيل عمليات شراء الدولار بالدينار؛ يتشكل رأس مال الرحلة تلقائياً كإجمالي مشتريات الدولار المرتبطة بها
            </p>
          </div>
          <Button size="lg" onClick={() => setShowAddForm(true)} className="gap-2 bg-[#0A7C6E] hover:bg-[#086156]">
            <Plus className="w-5 h-5" />
            تسجيل عملية صرف جديدة
          </Button>
        </div>

        {/* Dashboard Metrics for Exchange */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#0A7C6E]/5 border border-[#0A7C6E]/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">💵 إجمالي الدولار المشترى</CardTitle>
              <DollarSign className="w-5 h-5 text-[#0A7C6E]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0A7C6E]">
                {usdFormat(totalUsdPurchased)}
              </div>
              <p className="text-xs text-slate-500 mt-1">يُمثل ميزانية رأس المال الكلية المستوردة</p>
            </CardContent>
          </Card>

          <Card className="bg-[#F59E0B]/5 border border-[#F59E0B]/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">💰 إجمالي المبلغ بالدينار المدفوع</CardTitle>
              <RefreshCw className="w-5 h-5 text-[#F59E0B]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#F59E0B]">
                {lydFormat(totalSpentLyd)}
              </div>
              <p className="text-xs text-slate-500 mt-1">كلفة الشراء الفعلية من السوق الموازي</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 border border-slate-200/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">📈 متوسط سعر الصرف العام</CardTitle>
              <RefreshCw className="w-5 h-5 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">
                {averageGlobalRate > 0 ? `${averageGlobalRate.toFixed(4)} د.ل/$` : '0.00 د.ل/$'}
              </div>
              <p className="text-xs text-slate-500 mt-1">معدل الصرف المرجح لكافة العمليات</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Exchange Modal Form */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
            <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-[#0A7C6E]" />
                  {editingId ? 'تعديل عملية الصرف وشراء العملة' : 'تسجيل عملية صرف وشراء عملة'}
                </CardTitle>
                <CardDescription>
                  اربط هذه العملية برحلة معينة ليتم تلقائياً تجميع الدولارات المشتراة وتعيينها كـ "رأس مال الرحلة" واحتساب متوسط صرفها بدقة.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block font-medium">الرحلة المستهدفة</span>
                      <select
                        required
                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                        value={formData.trip_id}
                        onChange={(e) => setFormData({ ...formData, trip_id: e.target.value })}
                      >
                        <option value="">-- اختر رحلة الاستيراد --</option>
                        {trips.map((t) => (
                          <option key={t.id} value={t.id}>{t.trip_name}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block font-medium">تاريخ العملية</span>
                      <Input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4 bg-emerald-50/10 p-3 rounded-lg border border-emerald-100">
                    <label className="block">
                      <span className="text-sm text-emerald-800 mb-1 block font-bold">🟢 المبلغ المشتري بالدولار ($)</span>
                      <Input
                        type="number"
                        min="1"
                        placeholder="e.g. 10000"
                        required
                        value={formData.amount_usd || ''}
                        onChange={(e) => setFormData({ ...formData, amount_usd: Number(e.target.value) })}
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm text-emerald-800 mb-1 block font-bold">🟢 سعر صرف الدولار (د.ل)</span>
                      <Input
                        type="number"
                        step="0.001"
                        min="0.1"
                        placeholder="e.g. 6.450"
                        required
                        value={formData.exchange_rate || ''}
                        onChange={(e) => setFormData({ ...formData, exchange_rate: Number(e.target.value) })}
                      />
                    </label>
                  </div>

                  {formData.amount_usd > 0 && formData.exchange_rate > 0 && (
                    <div className="bg-slate-50 p-3 rounded-md text-sm border border-slate-100 flex justify-between items-center">
                      <span className="text-slate-500 font-medium">المبلغ المعادل بالدينار الليبي:</span>
                      <span className="font-extrabold text-[#0A7C6E] text-lg">
                        {lydFormat(formData.amount_usd * formData.exchange_rate)}
                      </span>
                    </div>
                  )}

                  <label className="block">
                    <span className="text-sm text-slate-500 mb-1 block font-medium">البيان / ملاحظات الصرف</span>
                    <Input
                      type="text"
                      placeholder="شراء دولار نقداً من الصراف، دفعة مخصصة للمزاد..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </label>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" className="flex-1 bg-[#0A7C6E] hover:bg-[#086156]" disabled={submitting}>
                      {submitting ? 'جاري الحفظ...' : (editingId ? 'حفظ التعديلات' : 'تسجيل العملية وحساب الميزانية')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingId(null);
                        setFormData({
                          trip_id: '',
                          description: '',
                          amount_usd: 0,
                          exchange_rate: 6.50,
                          date: new Date().toISOString().split('T')[0],
                        });
                      }}
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Exchange Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>📋 سجل فواتير وعمليات الصرف</CardTitle>
            <CardDescription>أرشيف تحويل الأموال وتغذية رؤوس أموال الرحلات المستوردة</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {transactions.length === 0 ? (
              <div className="p-12 text-center text-slate-500">لا توجد عمليات صرف مسجلة بعد في النظام.</div>
            ) : (
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-sm">
                    <th className="pb-3 pr-2">التاريخ</th>
                    <th className="pb-3">الرحلة المرتبطة</th>
                    <th className="pb-3">البيان</th>
                    <th className="pb-3">المبلغ المشترى ($)</th>
                    <th className="pb-3">سعر الصرف</th>
                    <th className="pb-3">المبلغ الفعلي المدفوع (د.ل)</th>
                    <th className="pb-3 pl-2">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 pr-2 font-mono text-slate-500">
                        {new Date(tx.date).toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </td>
                      <td className="py-4 font-semibold text-slate-900">
                        {tx.trips?.trip_name || 'غير معروف'}
                      </td>
                      <td className="py-4 text-slate-600">
                        {tx.description || 'عملية شراء عملة'}
                      </td>
                      <td className="py-4 font-semibold text-emerald-600">{usdFormat(tx.amount_usd)}</td>
                      <td className="py-4 font-mono font-medium text-slate-600">{tx.exchange_rate.toFixed(3)} د.ل/$</td>
                      <td className="py-4 font-bold text-slate-800">{lydFormat(tx.amount_lyd)}</td>
                      <td className="py-4 pl-2">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 text-[#0A7C6E] hover:text-[#086156] border-[#0A7C6E]/20 hover:bg-[#0A7C6E]/5"
                            onClick={() => handleEdit(tx)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 text-red-600 hover:text-red-700 border-red-100 hover:bg-red-50"
                            onClick={() => handleDelete(tx.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

      </div>
    </RtlLayout>
  );
}
