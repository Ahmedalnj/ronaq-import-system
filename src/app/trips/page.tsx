"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { RtlLayout } from '@/components/shared/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { confirmDelete, getErrorMessage, notify } from '@/lib/notify';
import { Loader, Plus, Ship, Activity, DollarSign, Calendar, Edit, Trash2 } from 'lucide-react';

interface Trip {
  id: string;
  trip_name: string;
  start_date: string;
  end_date?: string;
  capital: number;
  spent_lyd?: number;
  average_exchange_rate?: number | null;
  status: string;
  notes?: string;
  created_at: string;
  planned_cars_count: number;
}

export default function TripsPage() {
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [newTrip, setNewTrip] = useState({
    trip_name: '',
    start_date: '',
    end_date: '',
    notes: '',
    planned_cars_count: 1,
    status: 'open' as 'open' | 'closed',
  });

  const fetchTrips = async () => {
    try {
      const response = await fetch('/api/trips');
      if (!response.ok) throw new Error('فشل في جلب قائمة الرحلات');
      const data = await response.json();
      setTrips(data);
    } catch (err: unknown) {
      notify.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTrips();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = '/api/trips';
      const method = editingTrip ? 'PUT' : 'POST';
      const payload = editingTrip 
        ? { id: editingTrip.id, ...newTrip }
        : { ...newTrip, capital: 0 };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          planned_cars_count: Number(payload.planned_cars_count) || 1,
          end_date: payload.end_date || null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل في حفظ الرحلة الجديدة');
      }

      notify.success(editingTrip ? 'تم تحديث الرحلة بنجاح!' : 'تم إضافة الرحلة الجديدة بنجاح!');
      setShowAddForm(false);
      setEditingTrip(null);
      setNewTrip({
        trip_name: '',
        start_date: '',
        end_date: '',
        notes: '',
        planned_cars_count: 1,
        status: 'open',
      });
      fetchTrips();
    } catch (err: unknown) {
      notify.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setNewTrip({
      trip_name: trip.trip_name,
      start_date: trip.start_date,
      end_date: trip.end_date || '',
      notes: trip.notes || '',
      planned_cars_count: trip.planned_cars_count || 1,
      status: trip.status as 'open' | 'closed',
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    await confirmDelete(
      'حذف هذه الرحلة نهائياً؟',
      async () => {
        const response = await fetch(`/api/trips?id=${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('فشل في حذف الرحلة');
        await fetchTrips();
      },
      {
        description: 'سيؤدي ذلك لحذف الحاويات والعمليات المالية والسيارات المرتبطة بها.',
        successMessage: 'تم حذف الرحلة بنجاح!',
      }
    );
  };

  const usdFormat = (val: number) => {
    return `${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
  };

  const lydFormat = (val: number) => {
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">✈️ الرحلات والاستيراد</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              إدارة الرحلات وتتبع رأس المال المجمع من الصرف ومصروفات الحاويات
            </p>
          </div>
          <Button size="lg" onClick={() => setShowAddForm(true)} className="gap-2 bg-[#0A7C6E] hover:bg-[#086156]">
            <Plus className="w-5 h-5" />
            إضافة رحلة جديدة
          </Button>
        </div>

        {/* Add Trip Modal Form */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>{editingTrip ? 'تعديل بيانات رحلة الاستيراد' : 'إضافة رحلة استيراد جديدة'}</CardTitle>
                <CardDescription>أدخل اسم وتواريخ الرحلة للبدء. يتم احتساب رأس المال تلقائياً من عمليات الصرف والعملات.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">اسم الرحلة</span>
                      <Input
                        type="text"
                        placeholder="مثال: رحلة كوريا الثالثة"
                        required
                        value={newTrip.trip_name}
                        onChange={(e) => setNewTrip({ ...newTrip, trip_name: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block font-bold">🎯 السيارات المستهدفة بالرحلة</span>
                      <Input
                        type="number"
                        min="1"
                        required
                        value={newTrip.planned_cars_count}
                        onChange={(e) => setNewTrip({ ...newTrip, planned_cars_count: parseInt(e.target.value) || 1 })}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">تاريخ البدء</span>
                      <Input
                        type="date"
                        required
                        value={newTrip.start_date}
                        onChange={(e) => setNewTrip({ ...newTrip, start_date: e.target.value })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">تاريخ الانتهاء</span>
                      <Input
                        type="date"
                        value={newTrip.end_date}
                        onChange={(e) => setNewTrip({ ...newTrip, end_date: e.target.value })}
                      />
                    </label>
                  </div>

                  {editingTrip && (
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block font-medium">حالة الرحلة</span>
                      <select
                        required
                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                        value={newTrip.status}
                        onChange={(e) => setNewTrip({ ...newTrip, status: e.target.value as 'open' | 'closed' })}
                      >
                        <option value="open">مفتوحة (Open)</option>
                        <option value="closed">مغلقة (Closed)</option>
                      </select>
                    </label>
                  )}

                  <label className="block">
                    <span className="text-sm text-slate-500 mb-1 block">ملاحظات</span>
                    <textarea
                      className="w-full min-h-[80px] p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white text-sm"
                      placeholder="أي ملاحظات إضافية..."
                      value={newTrip.notes}
                      onChange={(e) => setNewTrip({ ...newTrip, notes: e.target.value })}
                    />
                  </label>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" className="flex-1 bg-[#0A7C6E] hover:bg-[#086156]" disabled={submitting}>
                      {submitting ? 'جاري حفظ التغييرات...' : 'حفظ الرحلة'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingTrip(null);
                        setNewTrip({
                          trip_name: '',
                          start_date: '',
                          end_date: '',
                          notes: '',
                          planned_cars_count: 1,
                          status: 'open',
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

        {/* Trips List Display */}
        {trips.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-bold mb-2">لا توجد رحلات استيراد مضافة</h3>
              <p className="text-slate-500 mb-6">
                ابدأ بإنشاء رحلتك الأولى لتتمكن من إضافة السيارات وربط الفواتير والمصاريف بها.
              </p>
              <Button onClick={() => setShowAddForm(true)} className="bg-[#0A7C6E] hover:bg-[#086156]">إنشاء أول رحلة</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Card key={trip.id} className="hover:shadow-md transition-shadow duration-200 border border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Ship className="w-5 h-5 text-[#0A7C6E]" />
                      {trip.trip_name}
                    </CardTitle>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                      trip.status === 'open'
                        ? 'bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-400'
                    }`}>
                      {trip.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Financial metrics & Dates */}
                  <div className="space-y-2 text-sm divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500 flex items-center gap-1.5"><DollarSign size={16} /> رأس المال المشترى:</span>
                      <span className="font-semibold text-[#0A7C6E]">{usdFormat(trip.capital || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500 flex items-center gap-1.5"><DollarSign size={16} /> التكلفة بالدينار:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{lydFormat(trip.spent_lyd || 0)}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500 flex items-center gap-1.5"><Activity size={16} /> السيارات المستهدفة:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{trip.planned_cars_count || 1} سيارات</span>
                    </div>
                    {trip.average_exchange_rate ? (
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500 flex items-center gap-1.5"><Activity size={16} /> سعر الصرف المعتمد:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{trip.average_exchange_rate.toFixed(3)} د.ل/$</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500 flex items-center gap-1.5"><Calendar size={16} /> تاريخ البدء:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {new Date(trip.start_date).toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    {trip.end_date && (
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500 flex items-center gap-1.5"><Calendar size={16} /> تاريخ الانتهاء:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {new Date(trip.end_date).toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>

                  {trip.notes && (
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      <strong>ملاحظات:</strong> {trip.notes}
                    </div>
                  )}

                  {/* Actions buttons */}
                  <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 h-8 text-blue-600 hover:text-blue-700 border-blue-100 hover:bg-blue-50 text-xs font-bold"
                      onClick={() => handleEdit(trip)}
                    >
                      <Edit size={12} />
                      تعديل
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 h-8 text-red-600 hover:text-red-700 border-red-100 hover:bg-red-50 text-xs font-bold"
                      onClick={() => handleDelete(trip.id)}
                    >
                      <Trash2 size={12} />
                      حذف
                    </Button>
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
