"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { RtlLayout } from '@/components/shared/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { confirmDelete, getErrorMessage, notify } from '@/lib/notify';
import { Loader, Plus, Printer, CheckCircle, TrendingUp, AlertTriangle, Trash2 } from 'lucide-react';

interface Sale {
  id: string;
  car_id: string;
  customer_name: string;
  customer_phone: string;
  selling_price: number;
  paid_amount: number;
  remaining_amount: number;
  payment_type: 'cash' | 'bank_transfer' | 'installment';
  date: string;
  notes?: string;
  car?: {
    car_name: string;
    brand: string;
    model: string;
    year: number;
    final_cost: number;
  };
}

interface Car {
  id: string;
  car_name: string;
  brand: string;
  model: string;
  year: number;
  final_cost: number;
  status: string;
}

export default function SalesPage() {
  const { user, loading: authLoading } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSale, setNewSale] = useState({
    car_id: '',
    customer_name: '',
    customer_phone: '',
    selling_price: 0,
    paid_amount: 0,
    payment_type: 'cash' as Sale['payment_type'],
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const fetchSalesAndCars = async () => {
    try {
      const [salesRes, carsRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/cars')
      ]);

      if (!salesRes.ok) throw new Error('فشل في جلب قائمة المبيعات');
      const salesData = await salesRes.json();
      setSales(salesData);

      if (carsRes.ok) {
        const carsData = await carsRes.json();
        setCars(carsData);
      }
    } catch (err: unknown) {
      notify.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSalesAndCars();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const priceNum = Number(newSale.selling_price);
      const paidNum = Number(newSale.paid_amount);
      const remainingNum = priceNum - paidNum;

      if (!newSale.car_id) {
        throw new Error('يرجى اختيار السيارة المراد بيعها');
      }

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSale,
          selling_price: priceNum,
          paid_amount: paidNum,
          remaining_amount: remainingNum,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل في تسجيل فاتورة البيع');
      }

      notify.success('تم تسجيل عملية بيع السيارة وإصدار الفاتورة وتوزيع الأرباح والعمولات بنجاح!');
      setShowAddForm(false);
      setNewSale({
        car_id: '',
        customer_name: '',
        customer_phone: '',
        selling_price: 0,
        paid_amount: 0,
        payment_type: 'cash',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      fetchSalesAndCars();
    } catch (err: unknown) {
      notify.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSale = async (id: string) => {
    await confirmDelete(
      'إلغاء عملية البيع هذه؟',
      async () => {
        const response = await fetch(`/api/sales?id=${id}`, { method: 'DELETE' });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'فشل في إلغاء عملية البيع');
        }
        await fetchSalesAndCars();
      },
      {
        description: 'سيتم إرجاع السيارة كـ «متاحة» وحذف الأقساط المرتبطة تلقائياً.',
        successMessage: 'تم إلغاء عملية البيع وإرجاع السيارة للمخزون!',
      }
    );
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      cash: 'نقداً',
      bank_transfer: 'تحويل مصرفي',
      installment: 'بيع بالتقسيط',
    };
    return labels[type] || type;
  };

  const moneyFormat = (val: number) => {
    return `${val.toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل`;
  };

  // Printable Invoice PDF generation (triggering simple print view of invoice)
  const handlePrintInvoice = (sale: Sale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>فاتورة مبيعات - ${sale.customer_name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #0A7C6E; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 26px; font-weight: bold; color: #0A7C6E; margin: 0; }
            .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: bold; border-right: 4px solid #0A7C6E; padding-right: 10px; margin-bottom: 15px; color: #1e293b; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; }
            .field { font-size: 14px; }
            .label { color: #64748b; font-weight: 500; }
            .value { font-weight: bold; }
            .totals-box { margin-top: 40px; border-top: 2px solid #e2e8f0; padding-top: 20px; text-align: left; }
            .total-row { display: flex; justify-content: space-between; font-size: 16px; margin-bottom: 8px; }
            .final-total { font-size: 20px; font-weight: bold; color: #0A7C6E; border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 8px; }
            .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div class="title">✨ رونق للاستيراد والمبيعات</div>
            <div class="subtitle">فاتورة بيع سيارة محاسبية معتمدة</div>
          </div>
          
          <div class="section">
            <div class="section-title">بيانات العميل المشتري</div>
            <div class="grid">
              <div class="field"><span class="label">اسم الزبون: </span><span class="value">${sale.customer_name}</span></div>
              <div class="field"><span class="label">رقم الهاتف: </span><span class="value">${sale.customer_phone}</span></div>
              <div class="field"><span class="label">تاريخ الشراء: </span><span class="value">${new Date(sale.date).toLocaleDateString('ar-LY')}</span></div>
              <div class="field"><span class="label">رقم الفاتورة: </span><span class="value">INV-${sale.id.substring(0, 8).toUpperCase()}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">بيانات المركبة المباعة</div>
            <div class="grid">
              <div class="field"><span class="label">اسم السيارة: </span><span class="value">${sale.car?.car_name || 'غير معروف'}</span></div>
              <div class="field"><span class="label">الموديل والسنة: </span><span class="value">${sale.car?.brand || ''} ${sale.car?.model || ''} (${sale.car?.year || ''})</span></div>
              <div class="field"><span class="label">طريقة الدفع: </span><span class="value">${getPaymentTypeLabel(sale.payment_type)}</span></div>
            </div>
          </div>

          <div class="totals-box">
            <div class="total-row"><span>سعر البيع الإجمالي:</span><strong>${moneyFormat(sale.selling_price)}</strong></div>
            <div class="total-row"><span>المبلغ المدفوع (مقدماً):</span><strong style="color: #16a34a;">-${moneyFormat(sale.paid_amount)}</strong></div>
            <div class="total-row final-total"><span>المبلغ المتبقي بذمة العميل:</span><strong>${moneyFormat(sale.remaining_amount)}</strong></div>
          </div>

          <div class="footer">
            نشكركم على ثقتكم بنا. تم إصدار هذه الفاتورة محاسبياً عبر نظام رونق لاستيراد السيارات في ليبيا.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Get available cars (not sold or currently processing)
  const availableCars = cars.filter((c) => c.status !== 'sold');

  const totalSalesVolume = sales.reduce((sum, s) => sum + Number(s.selling_price || 0), 0);
  const totalReceivables = sales.reduce((sum, s) => sum + Number(s.remaining_amount || 0), 0);

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">💰 المبيعات والفواتير</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              تسجيل عمليات بيع السيارات، إصدار الفواتير المطبوعة، ومتابعة مديونيات المشترين
            </p>
          </div>
          <Button size="lg" onClick={() => setShowAddForm(true)} className="gap-2 bg-[#0A7C6E] hover:bg-[#086156]">
            <Plus className="w-5 h-5" />
            تسجيل مبيعة جديدة
          </Button>
        </div>

        {/* Dashboard Metrics for Sales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">📈 إجمالي حجم المبيعات الإجمالي</CardTitle>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                {moneyFormat(totalSalesVolume)}
              </div>
              <p className="text-xs text-slate-500 mt-1">القيمة الكلية للسيارات المباعة للعملاء</p>
            </CardContent>
          </Card>

          <Card className="bg-amber-50/30 dark:bg-amber-950/10 border-amber-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">⚠️ الأقساط والمديونيات المتبقية بذمة العملاء</CardTitle>
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {moneyFormat(totalReceivables)}
              </div>
              <p className="text-xs text-slate-500 mt-1">مستحقات آجلة قيد التحصيل والتقسيط</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 border border-slate-200 dark:bg-slate-800/40 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">🚗 عدد السيارات المباعة</CardTitle>
              <CheckCircle className="w-5 h-5 text-[#0A7C6E]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {sales.length} سيارات مباعة
              </div>
              <p className="text-xs text-slate-500 mt-1">تم تسويتها ونقل ملكيتها بنجاح</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Sale Modal Form */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>تسجيل عملية بيع وإصدار فاتورة</CardTitle>
                <CardDescription>اختر السيارة وحدد معلومات المشتري. سيقوم النظام بتسجيل الأقساط والالتزامات تلقائياً.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="block">
                    <span className="text-sm text-slate-500 mb-1 block">اختر السيارة للبيع</span>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white text-sm"
                      value={newSale.car_id}
                      onChange={(e) => setNewSale({ ...newSale, car_id: e.target.value })}
                      required
                    >
                      <option value="">-- اختر السيارة --</option>
                      {availableCars.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.car_name} (التكلفة: {moneyFormat(c.final_cost)})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">اسم العميل</span>
                      <Input
                        type="text"
                        placeholder="اسم المشتري الكامل"
                        required
                        value={newSale.customer_name}
                        onChange={(e) => setNewSale({ ...newSale, customer_name: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">رقم الهاتف</span>
                      <Input
                        type="text"
                        placeholder="رقم هاتف العميل"
                        required
                        value={newSale.customer_phone}
                        onChange={(e) => setNewSale({ ...newSale, customer_phone: e.target.value })}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">سعر البيع النهائي</span>
                      <Input
                        type="number"
                        placeholder="مثال: 25000"
                        required
                        value={newSale.selling_price || ''}
                        onChange={(e) => setNewSale({ ...newSale, selling_price: Number(e.target.value) })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">المبلغ المدفوع (مقدماً)</span>
                      <Input
                        type="number"
                        placeholder="المبلغ المستلم"
                        required
                        value={newSale.paid_amount || ''}
                        onChange={(e) => setNewSale({ ...newSale, paid_amount: Number(e.target.value) })}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">طريقة الدفع</span>
                      <select
                        className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white text-sm"
                        value={newSale.payment_type}
                        onChange={(e) => setNewSale({ ...newSale, payment_type: e.target.value as Sale['payment_type'] })}
                      >
                        <option value="cash">نقداً (كاش)</option>
                        <option value="bank_transfer">تحويل مصرفي</option>
                        <option value="installment">بيع بالتقسيط</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">تاريخ الفاتورة</span>
                      <Input
                        type="date"
                        required
                        value={newSale.date}
                        onChange={(e) => setNewSale({ ...newSale, date: e.target.value })}
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-sm text-slate-500 mb-1 block">شروط إضافية أو ملاحظات</span>
                    <textarea
                      className="w-full min-h-[80px] p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white text-sm"
                      placeholder="أي شروط للضمان، مواعيد دفع الأقساط المتبقية..."
                      value={newSale.notes}
                      onChange={(e) => setNewSale({ ...newSale, notes: e.target.value })}
                    />
                  </label>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" className="flex-1 bg-[#0A7C6E] hover:bg-[#086156]" disabled={submitting}>
                      {submitting ? 'جاري التسجيل...' : 'تسجيل البيع وإصدار الفاتورة'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                      إلغاء
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sales Table Log */}
        <Card>
          <CardHeader>
            <CardTitle>📋 فواتير وسجلات المبيعات المعتمدة</CardTitle>
            <CardDescription>ملخص المبيعات، المدفوعات المستلمة، الفواتير القابلة للطباعة PDF</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {sales.length === 0 ? (
              <div className="p-12 text-center text-slate-500">لا توجد عمليات مبيعات مسجلة بعد في النظام.</div>
            ) : (
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 text-sm">
                    <th className="pb-3 pr-2">السيارة المباعة</th>
                    <th className="pb-3">الزبون</th>
                    <th className="pb-3">سعر البيع</th>
                    <th className="pb-3">المدفوع المستلم</th>
                    <th className="pb-3">المتبقي التحصيل</th>
                    <th className="pb-3">نوع السداد</th>
                    <th className="pb-3 pl-2">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 pr-2 font-medium">
                        {sale.car?.car_name || 'سيارة مسجلة'}
                        <span className="block text-xs text-slate-500 mt-1 font-mono">{sale.car?.brand || ''} {sale.car?.model || ''}</span>
                      </td>
                      <td className="py-4">
                        {sale.customer_name}
                        <span className="block text-xs text-slate-500 mt-1 font-mono">{sale.customer_phone}</span>
                      </td>
                      <td className="py-4 font-semibold text-slate-900 dark:text-white">{moneyFormat(sale.selling_price)}</td>
                      <td className="py-4 text-green-600 font-medium">+{moneyFormat(sale.paid_amount)}</td>
                      <td className="py-4 text-red-600 font-semibold">
                        {Number(sale.remaining_amount) > 0 ? moneyFormat(sale.remaining_amount) : 'مسدد بالكامل'}
                      </td>
                      <td className="py-4 font-medium text-slate-700 dark:text-slate-300">
                        {getPaymentTypeLabel(sale.payment_type)}
                      </td>
                      <td className="py-4 pl-2">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrintInvoice(sale)}
                            className="gap-1 text-[#0A7C6E] border-[#0A7C6E]/20 hover:bg-[#0A7C6E] hover:text-white text-xs font-bold"
                          >
                            <Printer size={12} /> طباعة
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSale(sale.id)}
                            className="gap-1 text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 text-xs font-bold"
                          >
                            <Trash2 size={12} /> إلغاء البيع
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
