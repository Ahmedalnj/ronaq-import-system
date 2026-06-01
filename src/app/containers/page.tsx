"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { RtlLayout } from '@/components/shared/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { confirmDelete, getErrorMessage, notify } from '@/lib/notify';
import { Loader, Plus, Ship, Package, Trash2, Edit, DollarSign, RefreshCw, X, Car, Receipt, Eye } from 'lucide-react';

interface Trip {
  id: string;
  trip_name: string;
}

interface Container {
  id: string;
  trip_id: string;
  container_number: string;
  shipping_cost: number; // in USD
  customs_cost: number;  // in LYD
  clearance_cost: number; // in LYD
  port_fees: number;      // in LYD
  link_fees: number;      // in USD
  notes?: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'cleared';
  created_at: string;
  cars_count: number;
  trips?: {
    trip_name: string;
  };
}

interface ContainerExpense {
  id: string;
  expense_type: string;
  currency: 'USD' | 'LYD' | 'EUR';
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'paid' | 'partial' | 'unpaid';
  date: string;
  notes?: string;
}

interface ContainerCar {
  id: string;
  car_name: string;
  brand: string;
  model: string;
  year: number;
  vin_number: string;
  status: string;
  final_cost: number;
  purchase_price_lyd: number;
}

interface ContainerDetails {
  container: Container;
  expenses: ContainerExpense[];
  cars: ContainerCar[];
  summary: {
    cars_count: number;
    cars_capacity: number;
    expenses_count: number;
    expenses_total_usd: number;
    expenses_total_lyd: number;
    container_shipping_usd: number;
    container_link_usd: number;
    container_customs_lyd: number;
    container_clearance_lyd: number;
    container_port_lyd: number;
  };
}

export default function ContainersPage() {
  const { user, loading: authLoading } = useAuth();
  const [containers, setContainers] = useState<Container[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Exchange rate for previewing overall container costs in LYD on the client side
  const [customRate, setCustomRate] = useState(6.50);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContainer, setEditingContainer] = useState<Container | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [containerDetails, setContainerDetails] = useState<ContainerDetails | null>(null);

  const [formData, setFormData] = useState({
    trip_id: '',
    container_number: '',
    shipping_cost: 0,
    customs_cost: 0,
    clearance_cost: 0,
    port_fees: 0,
    link_fees: 0,
    notes: '',
    status: 'pending' as Container['status'],
    cars_count: 6,
  });

  const fetchContainers = async () => {
    try {
      const response = await fetch('/api/containers');
      if (!response.ok) throw new Error('فشل في جلب قائمة الحاويات');
      const data = await response.json();
      setContainers(data);
    } catch (err: unknown) {
      notify.error(getErrorMessage(err));
    }
  };

  const fetchTrips = async () => {
    try {
      const response = await fetch('/api/trips');
      if (!response.ok) throw new Error('فشل في جلب قائمة الرحلات');
      const data = await response.json();
      setTrips(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      Promise.all([fetchContainers(), fetchTrips()]).finally(() => {
        setLoading(false);
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!formData.trip_id) {
        throw new Error('يرجى تحديد الرحلة المرتبطة بالحاوية');
      }

      const url = '/api/containers';
      const method = editingContainer ? 'PUT' : 'POST';
      const body = editingContainer
        ? { id: editingContainer.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          shipping_cost: Number(body.shipping_cost),
          customs_cost: Number(body.customs_cost),
          clearance_cost: Number(body.clearance_cost),
          port_fees: Number(body.port_fees),
          link_fees: Number(body.link_fees),
          cars_count: Number(body.cars_count) || 6,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل في حفظ الحاوية');
      }

      notify.success(editingContainer ? 'تم تحديث الحاوية بنجاح!' : 'تم إضافة الحاوية الجديدة والعمليات المالية تلقائياً بنجاح!');
      setShowAddForm(false);
      setEditingContainer(null);
      setFormData({
        trip_id: '',
        container_number: '',
        shipping_cost: 0,
        customs_cost: 0,
        clearance_cost: 0,
        port_fees: 0,
        link_fees: 0,
        notes: '',
        status: 'pending',
        cars_count: 6,
      });
      fetchContainers();
    } catch (err: unknown) {
      notify.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openContainerDetails = async (container: Container) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setContainerDetails(null);

    try {
      const response = await fetch(`/api/containers/${container.id}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل في جلب تفاصيل الحاوية');
      }
      const data = await response.json();
      setContainerDetails(data);
    } catch (err: unknown) {
      notify.error(getErrorMessage(err, 'فشل في جلب تفاصيل الحاوية'));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const getExpenseTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      shipping: 'شحن بحري',
      customs: 'جمارك',
      clearance: 'تخليص',
      link_fees: 'رسوم ربط',
      transportation: 'نقل',
      office: 'مكتب',
      other: 'أخرى',
    };
    return labels[type] || type;
  };

  const getExpenseStatusLabel = (status: ContainerExpense['status']) => {
    switch (status) {
      case 'paid':
        return 'مدفوع';
      case 'partial':
        return 'مدفوع جزئياً';
      default:
        return 'غير مدفوع';
    }
  };

  const getCarStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'متاحة';
      case 'reserved':
        return 'محجوزة';
      case 'sold':
        return 'مباعة';
      case 'installment':
        return 'تقسيط';
      case 'in_transit':
        return 'في الطريق';
      default:
        return status;
    }
  };

  const handleEdit = (container: Container, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingContainer(container);
    setFormData({
      trip_id: container.trip_id,
      container_number: container.container_number || '',
      shipping_cost: container.shipping_cost,
      customs_cost: container.customs_cost,
      clearance_cost: container.clearance_cost || 0,
      port_fees: container.port_fees || 0,
      link_fees: container.link_fees,
      notes: container.notes || '',
      status: container.status,
      cars_count: container.cars_count || 6,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await confirmDelete(
      'حذف هذه الحاوية؟',
      async () => {
        const response = await fetch(`/api/containers?id=${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('فشل في حذف الحاوية');
        await fetchContainers();
      },
      {
        description: 'سيؤدي ذلك لحذف المصاريف والبيانات المالية المرتبطة بها.',
        successMessage: 'تم حذف الحاوية بنجاح!',
      }
    );
  };

  const lydFormat = (val: number) => {
    return `${val.toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل`;
  };

  const usdFormat = (val: number) => {
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusLabel = (status: Container['status']) => {
    switch (status) {
      case 'pending':
        return 'قيد الانتظار';
      case 'in_transit':
        return 'في الشحن';
      case 'delivered':
        return 'وصلت للميناء';
      case 'cleared':
        return 'مخلّصة جمركياً';
      default:
        return status;
    }
  };

  const getStatusColor = (status: Container['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'in_transit':
        return 'bg-amber-50 text-amber-800 border-amber-200/60';
      case 'delivered':
        return 'bg-blue-50 text-blue-800 border-blue-200/60';
      case 'cleared':
        return 'bg-green-50 text-green-800 border-green-200/60';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
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

  // Summary Metrics (in their original currencies)
  const totalShippingUsd = containers.reduce((sum, c) => sum + Number(c.shipping_cost), 0);
  const totalLinkUsd = containers.reduce((sum, c) => sum + Number(c.link_fees), 0);
  const totalCustomsLyd = containers.reduce((sum, c) => sum + Number(c.customs_cost), 0);
  const totalClearanceLyd = containers.reduce((sum, c) => sum + Number(c.clearance_cost + c.port_fees), 0);

  // Total container cost overall in LYD based on custom exchange rate
  const totalCostLydEstimated = 
    ((totalShippingUsd + totalLinkUsd) * customRate) + totalCustomsLyd + totalClearanceLyd;

  return (
    <RtlLayout>
      <div className="p-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">📦 الحاويات البحرية (Containers)</h1>
            <p className="text-slate-600 mt-2">
              شحن الحاويات والرسوم بالدولار ($)، والتخليص والجمارك والخدمات بالدينار الليبي (د.ل)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-500">سعر الصرف التقديري:</span>
              <Input
                type="number"
                step="0.01"
                className="w-16 h-7 text-xs p-1 text-center font-bold text-[#0A7C6E] focus-visible:ring-0"
                value={customRate}
                onChange={(e) => setCustomRate(Number(e.target.value))}
              />
              <span className="font-semibold text-slate-500">د.ل/$</span>
            </div>
            <Button size="lg" onClick={() => { setEditingContainer(null); setShowAddForm(true); }} className="gap-2 bg-[#0A7C6E] hover:bg-[#086156]">
              <Plus className="w-5 h-5" />
              إضافة حاوية جديدة
            </Button>
          </div>
        </div>

        {/* Dashboard Metrics for Containers */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-slate-50 border border-slate-200/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">📦 إجمالي الحاويات</CardTitle>
              <Package className="w-5 h-5 text-[#0A7C6E]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">
                {containers.length} حاويات
              </div>
              <p className="text-xs text-slate-500 mt-1">المقيدة في النظام</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0A7C6E]/5 border border-[#0A7C6E]/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">🚢 تكلفة الشحن والربط البحرية</CardTitle>
              <Ship className="w-5 h-5 text-[#0A7C6E]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#0A7C6E]">
                {usdFormat(totalShippingUsd + totalLinkUsd)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                شحن: {usdFormat(totalShippingUsd)} | ربط: {usdFormat(totalLinkUsd)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#F59E0B]/5 border border-[#F59E0B]/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">🏛️ الجمارك والتخليص المحلي</CardTitle>
              <DollarSign className="w-5 h-5 text-[#F59E0B]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#F59E0B]">
                {lydFormat(totalCustomsLyd + totalClearanceLyd)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                جمارك: {lydFormat(totalCustomsLyd)} | تخليص: {lydFormat(totalClearanceLyd)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#FF6B35]/5 border border-[#FF6B35]/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">📊 إجمالي التكاليف التقديرية</CardTitle>
              <RefreshCw className="w-5 h-5 text-[#FF6B35]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#FF6B35]">
                {lydFormat(totalCostLydEstimated)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                محسوب بسعر صرف {customRate} د.ل
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add/Edit Container Modal Form */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
            <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#0A7C6E]" />
                  {editingContainer ? 'تعديل بيانات الحاوية' : 'إضافة حاوية شحن جديدة'}
                </CardTitle>
                <CardDescription>
                  يرجى الانتباه إلى العملات: مصاريف الشحن والربط بالدولار ($)، الجمارك والتخليص والموانئ بالدينار (د.ل).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block font-medium">الرحلة المرتبطة</span>
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
                      <span className="text-sm text-slate-500 mb-1 block font-medium">حالة الحاوية</span>
                      <select
                        required
                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Container['status'] })}
                      >
                        <option value="pending">قيد الانتظار (Pending)</option>
                        <option value="in_transit">في الشحن البحري (In Transit)</option>
                        <option value="delivered">وصلت للميناء (Delivered)</option>
                        <option value="cleared">تم تخليصها وجمركتها (Cleared)</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block font-medium">رقم الحاوية</span>
                      <Input
                        type="text"
                        placeholder="مثال: MSCU9821034"
                        required
                        value={formData.container_number || ''}
                        onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block font-bold">🎯 عدد السيارات داخل الحاوية</span>
                      <Input
                        type="number"
                        min="1"
                        required
                        value={formData.cars_count}
                        onChange={(e) => setFormData({ ...formData, cars_count: parseInt(e.target.value) || 6 })}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block font-medium">الرسوم الجمركية (د.ل)</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0.00"
                        required
                        value={formData.customs_cost || ''}
                        onChange={(e) => setFormData({ ...formData, customs_cost: Number(e.target.value) })}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4 bg-emerald-50/20 p-3 rounded-lg border border-emerald-100">
                    <label className="block">
                      <span className="text-sm text-emerald-800 mb-1 block font-bold">🟢 تكلفة الشحن (بالدولار $)</span>
                      <Input
                        type="number"
                        min="0"
                        required
                        placeholder="e.g. 4500"
                        value={formData.shipping_cost || ''}
                        onChange={(e) => setFormData({ ...formData, shipping_cost: Number(e.target.value) })}
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm text-emerald-800 mb-1 block font-bold">🟢 رسوم الربط (بالدولار $)</span>
                      <Input
                        type="number"
                        min="0"
                        required
                        placeholder="e.g. 250"
                        value={formData.link_fees || ''}
                        onChange={(e) => setFormData({ ...formData, link_fees: Number(e.target.value) })}
                      />
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" className="flex-1 bg-[#0A7C6E] hover:bg-[#086156]" disabled={submitting}>
                      {submitting ? 'جاري الحفظ...' : 'حفظ بيانات الحاوية'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingContainer(null);
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

        {/* Containers List Display */}
        <Card>
          <CardHeader>
            <CardTitle>📋 سجل الحاويات البحرية</CardTitle>
            <CardDescription>اضغط على أي حاوية لعرض مصاريفها والسيارات الموجودة فيها</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {containers.length === 0 ? (
              <div className="p-12 text-center text-slate-500">لا توجد حاويات شحن مضافة حتى الآن.</div>
            ) : (
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-sm">
                    <th className="pb-3 pr-2">الحاوية</th>
                    <th className="pb-3">الرحلة</th>
                    <th className="pb-3">السيارات</th>
                    <th className="pb-3">شحن بحري ($)</th>
                    <th className="pb-3">رسوم ربط ($)</th>
                    <th className="pb-3">جمارك وموانئ (د.ل)</th>
                    <th className="pb-3">تخليص وخدمات (د.ل)</th>
                    <th className="pb-3">التكلفة الكلية (د.ل)</th>
                    <th className="pb-3">الحالة</th>
                    <th className="pb-3 pl-2">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {containers.map((container) => {
                    const totalLydCost = 
                      ((Number(container.shipping_cost) + Number(container.link_fees)) * customRate) + 
                      Number(container.customs_cost) + Number(container.clearance_cost) + Number(container.port_fees);
                    return (
                      <tr
                        key={container.id}
                        className="hover:bg-[#0A7C6E]/5 transition-colors cursor-pointer"
                        onClick={() => openContainerDetails(container)}
                      >
                        <td className="py-4 pr-2 font-mono font-medium text-[#0A7C6E]">
                          <span className="inline-flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 opacity-70" />
                            {container.container_number || `Container #${container.id.substring(0, 8)}`}
                          </span>
                        </td>
                        <td className="py-4 font-semibold text-slate-900">
                          {container.trips?.trip_name || 'غير معروف'}
                        </td>
                        <td className="py-4 font-bold text-slate-700">
                          {container.cars_count || 6} سيارات
                        </td>
                        <td className="py-4 font-semibold text-emerald-600">{usdFormat(container.shipping_cost)}</td>
                        <td className="py-4 font-medium text-emerald-600">{usdFormat(container.link_fees)}</td>
                        <td className="py-4 text-blue-600 font-semibold">{lydFormat(container.customs_cost + container.port_fees)}</td>
                        <td className="py-4 text-slate-600">{lydFormat(container.clearance_cost)}</td>
                        <td className="py-4 font-bold text-slate-800">{lydFormat(totalLydCost)}</td>
                        <td className="py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(container.status)}`}>
                            {getStatusLabel(container.status)}
                          </span>
                        </td>
                        <td className="py-4 pl-2">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-8 h-8 text-blue-600 hover:text-blue-700 border-blue-100 hover:bg-blue-50"
                              onClick={(e) => handleEdit(container, e)}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-8 h-8 text-red-600 hover:text-red-700 border-red-100 hover:bg-red-50"
                              onClick={(e) => handleDelete(container.id, e)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Container details modal */}
        {detailOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
            <Card className="w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
              <CardHeader className="border-b border-slate-100 flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Package className="w-5 h-5 text-[#0A7C6E]" />
                    {containerDetails?.container.container_number || 'تفاصيل الحاوية'}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {containerDetails?.container.trips?.trip_name && (
                      <span>الرحلة: {containerDetails.container.trips.trip_name} · </span>
                    )}
                    اضغط على صف الحاوية لعرض المصاريف والسيارات
                  </CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                {detailLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader className="w-8 h-8 animate-spin text-[#0A7C6E]" />
                    <p className="text-slate-500 text-sm mt-3">جاري تحميل التفاصيل...</p>
                  </div>
                ) : containerDetails ? (
                  <>
                    {/* Container cost summary */}
                    <div>
                      <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-[#0A7C6E]" />
                        مصاريف الحاوية (من بيانات الحاوية)
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                          <p className="text-xs text-emerald-700">شحن بحري</p>
                          <p className="font-bold text-emerald-800">{usdFormat(containerDetails.summary.container_shipping_usd)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                          <p className="text-xs text-emerald-700">رسوم ربط</p>
                          <p className="font-bold text-emerald-800">{usdFormat(containerDetails.summary.container_link_usd)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                          <p className="text-xs text-blue-700">جمارك</p>
                          <p className="font-bold text-blue-800">{lydFormat(containerDetails.summary.container_customs_lyd)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                          <p className="text-xs text-blue-700">تخليص</p>
                          <p className="font-bold text-blue-800">{lydFormat(containerDetails.summary.container_clearance_lyd)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                          <p className="text-xs text-blue-700">رسوم ميناء</p>
                          <p className="font-bold text-blue-800">{lydFormat(containerDetails.summary.container_port_lyd)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <p className="text-xs text-slate-600">حالة الحاوية</p>
                          <p className="font-bold text-slate-800">{getStatusLabel(containerDetails.container.status)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Linked expenses */}
                    <div>
                      <h3 className="font-bold text-slate-800 mb-3 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-[#F59E0B]" />
                          سجل المصاريف المرتبطة ({containerDetails.expenses.length})
                        </span>
                        <span className="text-xs font-normal text-slate-500">
                          {usdFormat(containerDetails.summary.expenses_total_usd)} + {lydFormat(containerDetails.summary.expenses_total_lyd)}
                        </span>
                      </h3>
                      {containerDetails.expenses.length === 0 ? (
                        <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4 text-center">
                          لا توجد مصاريف مسجلة في جدول المصاريف لهذه الحاوية.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-100">
                          <table className="w-full text-right text-sm">
                            <thead>
                              <tr className="bg-slate-50 text-slate-600">
                                <th className="px-3 py-2">النوع</th>
                                <th className="px-3 py-2">المبلغ</th>
                                <th className="px-3 py-2">المدفوع</th>
                                <th className="px-3 py-2">المتبقي</th>
                                <th className="px-3 py-2">الحالة</th>
                                <th className="px-3 py-2">التاريخ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {containerDetails.expenses.map((exp) => (
                                <tr key={exp.id}>
                                  <td className="px-3 py-2 font-medium">{getExpenseTypeLabel(exp.expense_type)}</td>
                                  <td className="px-3 py-2">
                                    {exp.currency === 'USD' ? usdFormat(exp.amount) : lydFormat(exp.amount)}
                                  </td>
                                  <td className="px-3 py-2 text-green-700">
                                    {exp.currency === 'USD' ? usdFormat(exp.paid_amount) : lydFormat(exp.paid_amount)}
                                  </td>
                                  <td className="px-3 py-2 text-amber-700">
                                    {exp.currency === 'USD' ? usdFormat(exp.remaining_amount) : lydFormat(exp.remaining_amount)}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      exp.status === 'paid' ? 'bg-green-100 text-green-800' :
                                      exp.status === 'partial' ? 'bg-amber-100 text-amber-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {getExpenseStatusLabel(exp.status)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-slate-500 text-xs">
                                    {new Date(exp.date).toLocaleDateString('ar-LY')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Cars in container */}
                    <div>
                      <h3 className="font-bold text-slate-800 mb-3 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-[#0A7C6E]" />
                          السيارات في الحاوية ({containerDetails.summary.cars_count} / {containerDetails.summary.cars_capacity})
                        </span>
                      </h3>
                      {containerDetails.cars.length === 0 ? (
                        <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4 text-center">
                          لا توجد سيارات مرتبطة بهذه الحاوية بعد. يمكنك ربط السيارات من صفحة السيارات.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-100">
                          <table className="w-full text-right text-sm">
                            <thead>
                              <tr className="bg-slate-50 text-slate-600">
                                <th className="px-3 py-2">السيارة</th>
                                <th className="px-3 py-2">VIN</th>
                                <th className="px-3 py-2">الحالة</th>
                                <th className="px-3 py-2">التكلفة النهائية</th>
                                <th className="px-3 py-2"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {containerDetails.cars.map((car) => (
                                <tr key={car.id} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2 font-semibold">
                                    {car.car_name || `${car.brand} ${car.model}`}
                                    <span className="text-xs text-slate-400 block">{car.year}</span>
                                  </td>
                                  <td className="px-3 py-2 font-mono text-xs" dir="ltr">{car.vin_number}</td>
                                  <td className="px-3 py-2">
                                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{getCarStatusLabel(car.status)}</span>
                                  </td>
                                  <td className="px-3 py-2 font-bold">{lydFormat(Number(car.final_cost || car.purchase_price_lyd))}</td>
                                  <td className="px-3 py-2">
                                    <Link
                                      href={`/cars/${car.id}`}
                                      className="text-xs text-[#0A7C6E] hover:underline font-semibold"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      عرض التفاصيل ←
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </RtlLayout>
  );
}
