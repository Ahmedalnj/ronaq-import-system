"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { RtlLayout } from '@/components/shared/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader, Plus, Ship, Package, Trash2, Edit, Calendar, DollarSign, RefreshCw } from 'lucide-react';

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

export default function ContainersPage() {
  const { user, loading: authLoading } = useAuth();
  const [containers, setContainers] = useState<Container[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Exchange rate for previewing overall container costs in LYD on the client side
  const [customRate, setCustomRate] = useState(6.50);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContainer, setEditingContainer] = useState<Container | null>(null);

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
    } catch (err: any) {
      setError(err.message);
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
    setError('');
    setSuccess('');

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

      setSuccess(editingContainer ? 'تم تحديث الحاوية بنجاح!' : 'تم إضافة الحاوية الجديدة والعمليات المالية تلقائياً بنجاح!');
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (container: Container) => {
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

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذه الحاوية؟ سيؤدي ذلك لحذف المصاريف والبيانات المالية المرتبطة بها.')) return;
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/containers?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('فشل في حذف الحاوية');

      setSuccess('تم حذف الحاوية بنجاح!');
      fetchContainers();
    } catch (err: any) {
      setError(err.message);
    }
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

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 p-4 rounded-lg">{success}</div>}

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
            <CardDescription>عرض وتعديل الحاويات ومصاريف التخليص الجمركي والشحن التابع لها بمختلف العملات</CardDescription>
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
                      <tr key={container.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pr-2 font-mono font-medium">
                          {container.container_number || `Container #${container.id.substring(0, 8)}`}
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
                              onClick={() => handleEdit(container)}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-8 h-8 text-red-600 hover:text-red-700 border-red-100 hover:bg-red-50"
                              onClick={() => handleDelete(container.id)}
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

      </div>
    </RtlLayout>
  );
}
