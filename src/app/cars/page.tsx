"use client";

import { useState, useEffect, useMemo } from 'react';
import { containerFullMessage } from '@/lib/containers/capacity';
import type { CarPurchaseMode } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { RtlLayout } from '@/components/shared/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader, Plus, Search, Filter, ShieldAlert, Award, FileDown, Check } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/db/client';

interface Trip {
  id: string;
  trip_name: string;
  average_exchange_rate?: number | null;
}

interface Container {
  id: string;
  container_number?: string;
  cars_count?: number;
}

interface Car {
  id: string;
  vin_number: string;
  car_name: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  purchase_price_usd: number;
  exchange_rate: number;
  purchase_price_lyd: number;
  shipping_allocation: number;
  customs_allocation: number;
  expense_allocation: number;
  other_allocation: number;
  final_cost: number;
  selling_price?: number;
  profit?: number;
  profit_margin?: number;
  status: 'available' | 'reserved' | 'sold' | 'installment' | 'in_transit';
  image_urls: string[];
  trip_id?: string;
  container_id?: string;
}

export default function CarsPage() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const [cars, setCars] = useState<Car[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Basic image checks
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('صيغة الملف غير مدعومة. يرجى رفع صور بصيغة JPG, PNG, WEBP فقط');
      return;
    }

    setImageUploading(true);
    setError('');
    setSuccess('');

    try {
      const fileExt = file.name.split('.').pop();
      // Generate a unique path
      const fileName = `new-cars/${Math.random().toString(36).substring(2)}/${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to supabase storage bucket 'car-images'
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('car-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('car-images')
        .getPublicUrl(filePath);

      setNewCar(prev => ({ ...prev, image_url: publicUrl }));
      setImagePreview(publicUrl);
      setSuccess('تم رفع صورة السيارة بنجاح!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setImageUploading(false);
    }
  };


  // Filtering and Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tripFilter, setTripFilter] = useState('all');
  const [profitabilityFilter, setProfitabilityFilter] = useState('all'); // 'all', 'high' (margin > 15%), 'low' (margin <= 15%)

  // Add Car Dialog State
  const [showAddForm, setShowAddForm] = useState(false);
  const defaultNewCar = () => ({
    purchase_mode: 'import' as CarPurchaseMode,
    vin_number: '',
    car_name: '',
    brand: 'كوري',
    model: 'غير معروف',
    year: new Date().getFullYear(),
    color: 'غير محدد',
    purchase_price_krw: 0,
    exchange_rate_usd_krw: 1350,
    purchase_price_usd: 0,
    purchase_price_lyd: 0,
    exchange_rate: 6.50,
    trip_id: '',
    container_id: '',
    external_container_ref: '',
    shipping_allocation: 0,
    link_fees_allocation: 0,
    customs_allocation: 0,
    clearance_allocation: 0,
    expense_allocation: 0,
    image_url: '',
  });

  const [newCar, setNewCar] = useState(defaultNewCar);

  // Automatically calculate prices when KRW, Exchange Rate, or Trip changes
  useEffect(() => {
    if (newCar.purchase_mode !== 'import') return;

    const krw = Number(newCar.purchase_price_krw || 0);
    const rateUsdKrw = Number(newCar.exchange_rate_usd_krw || 1350);
    const computedUsd = rateUsdKrw > 0 ? krw / rateUsdKrw : 0;

    let activeExchangeRate = 6.5;
    if (newCar.trip_id) {
      const selectedTrip = trips.find((t) => t.id === newCar.trip_id);
      if (selectedTrip?.average_exchange_rate) {
        activeExchangeRate = Number(selectedTrip.average_exchange_rate);
      }
    }

    if (
      Math.abs(newCar.purchase_price_usd - computedUsd) > 0.01 ||
      Math.abs(newCar.exchange_rate - activeExchangeRate) > 0.01
    ) {
      setNewCar((prev) => ({
        ...prev,
        purchase_price_usd: Number(computedUsd.toFixed(2)),
        exchange_rate: activeExchangeRate,
      }));
    }
  }, [
    newCar.purchase_mode,
    newCar.purchase_price_krw,
    newCar.exchange_rate_usd_krw,
    newCar.trip_id,
    trips,
  ]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [carsRes, tripsRes, containersRes] = await Promise.all([
          fetch('/api/cars'),
          fetch('/api/trips'),
          fetch('/api/expenses').then(async (res) => {
            // Get containers if endpoint exists or just query all containers from DB via Supabase
            // To be safe, we fetch cars to map or let the user select.
            // Let's get containers directly from database since we have client supabase.
            return { ok: true, json: async () => [] };
          })
        ]);

        if (!carsRes.ok) throw new Error('فشل في جلب قائمة السيارات');
        const carsData = await carsRes.json();
        setCars(carsData);

        if (tripsRes.ok) {
          const tripsData = await tripsRes.json();
          setTrips(tripsData);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchContainers = async () => {
      try {
        const response = await fetch('/api/containers');
        if (response.ok) {
          const data = await response.json();
          setContainers(data);
        }
      } catch (e) {
        console.error('Failed to load containers for selection:', e);
      }
    };
    fetchContainers();
  }, [user]);

  const containerUsage = useMemo(() => {
    const map: Record<string, number> = {};
    for (const car of cars) {
      if (car.container_id) {
        map[car.container_id] = (map[car.container_id] || 0) + 1;
      }
    }
    return map;
  }, [cars]);

  const getContainerSlotInfo = (containerId: string) => {
    const container = containers.find((c) => c.id === containerId);
    const capacity = Number(container?.cars_count) || 6;
    const used = containerUsage[containerId] || 0;
    return { capacity, used, isFull: used >= capacity, label: container?.container_number };
  };

  const handleAddCarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (newCar.purchase_mode === 'import' && newCar.container_id) {
        const slot = getContainerSlotInfo(newCar.container_id);
        if (slot.isFull) {
          throw new Error(
            containerFullMessage(slot.label || newCar.container_id.substring(0, 8), slot.capacity)
          );
        }
      }

      if (newCar.purchase_mode === 'local' && !Number(newCar.purchase_price_lyd)) {
        throw new Error('أدخل سعر الشراء بالدينار للشراء المحلي');
      }

      const response = await fetch('/api/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCar,
          purchase_price_usd: Number(newCar.purchase_price_usd),
          purchase_price_lyd: Number(newCar.purchase_price_lyd),
          purchase_price_krw: Number(newCar.purchase_price_krw),
          exchange_rate_usd_krw: Number(newCar.exchange_rate_usd_krw),
          exchange_rate: Number(newCar.exchange_rate),
          year: Number(newCar.year),
          shipping_allocation: Number(newCar.shipping_allocation),
          link_fees_allocation: Number(newCar.link_fees_allocation),
          customs_allocation: Number(newCar.customs_allocation),
          clearance_allocation: Number(newCar.clearance_allocation),
          expense_allocation: Number(newCar.expense_allocation),
          trip_id: newCar.purchase_mode === 'local' ? null : newCar.trip_id || null,
          container_id:
            newCar.purchase_mode === 'local' ? null : newCar.container_id || null,
          external_container_ref:
            newCar.purchase_mode === 'shared_container'
              ? newCar.external_container_ref || null
              : null,
          image_urls: newCar.image_url ? [newCar.image_url] : [],
          status: 'available',
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل في إدخال السيارة الجديدة');
      }

      const addedCar = await response.json();
      setCars([addedCar, ...cars]);
      setSuccess('تم إضافة السيارة الجديدة بنجاح! سيتم حساب تكاليفها تلقائياً.');
      setShowAddForm(false);
      setImagePreview('');
      setNewCar(defaultNewCar());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Comprehensive Search and Filters Application
  const filteredCars = cars.filter((car) => {
    const matchesSearch =
      car.car_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.vin_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.model.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBrand = !brandFilter || car.brand.toLowerCase().includes(brandFilter.toLowerCase());
    const matchesModel = !modelFilter || car.model.toLowerCase().includes(modelFilter.toLowerCase());
    const matchesYear = !yearFilter || car.year.toString() === yearFilter;
    const matchesStatus = statusFilter === 'all' || car.status === statusFilter;
    const matchesTrip = tripFilter === 'all' || car.trip_id === tripFilter;

    let matchesProfitability = true;
    if (profitabilityFilter === 'high') {
      matchesProfitability = car.profit_margin !== undefined && car.profit_margin >= 15;
    } else if (profitabilityFilter === 'low') {
      matchesProfitability = car.profit_margin !== undefined && car.profit_margin < 15;
    }

    return matchesSearch && matchesBrand && matchesModel && matchesYear && matchesStatus && matchesTrip && matchesProfitability;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      available: 'bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-900/30',
      sold: 'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30',
      reserved: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/30',
      installment: 'bg-purple-100 text-purple-800 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30',
      in_transit: 'bg-orange-100 text-orange-800 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const statusLabels: Record<string, string> = {
    available: 'متاحة للبيع',
    sold: 'تم البيع',
    reserved: 'محجوزة',
    installment: 'بالتقسيط',
    in_transit: 'في الطريق',
  };

  const moneyFormat = (val: number, isUsd = false) => {
    return isUsd
      ? `$${val.toLocaleString('en-US')}`
      : `${val.toLocaleString('ar-LY')} د.ل`;
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">🚗 إدارة السيارات وتكلفة الهبوط</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              توزيع المصاريف والشحن والجمارك تلقائياً بالتناسب للوصول للتكلفة الحقيقية
            </p>
          </div>
          <Button size="lg" onClick={() => setShowAddForm(true)} className="gap-2 bg-[#0A7C6E] hover:bg-[#086156]">
            <Plus className="w-5 h-5" />
            إضافة سيارة جديدة
          </Button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 p-4 rounded-lg">{success}</div>}

        {/* Add Car Dialog Modal */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
            <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>إضافة سيارة جديدة للمخزون</CardTitle>
                <CardDescription>
                  اختر نوع الشراء: استيراد، شراء محلي بالدينار، أو سيارات في حاوية طرف آخر بتكلفة لكل سيارة.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddCarSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'import', label: 'استيراد (كوري/دولار)' },
                        { id: 'local', label: 'شراء محلي (د.ل)' },
                        { id: 'shared_container', label: 'حاوية مشتركة / لكل سيارة' },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() =>
                          setNewCar((prev) => ({
                            ...defaultNewCar(),
                            purchase_mode: mode.id,
                            vin_number: prev.vin_number,
                            car_name: prev.car_name,
                          }))
                        }
                        className={`p-3 rounded-lg border text-sm font-bold transition-colors ${
                          newCar.purchase_mode === mode.id
                            ? 'border-[#0A7C6E] bg-[#0A7C6E]/10 text-[#0A7C6E]'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block font-medium">اسم السيارة</span>
                      <Input
                        type="text"
                        placeholder="مثال: هيونداي أوانتي"
                        required
                        value={newCar.car_name}
                        onChange={(e) => setNewCar({ ...newCar, car_name: e.target.value })}
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block font-medium">رقم الهيكل (VIN)</span>
                      <Input
                        type="text"
                        placeholder="أدخل 17 حرفاً ورقماً"
                        required
                        value={newCar.vin_number}
                        onChange={(e) => setNewCar({ ...newCar, vin_number: e.target.value })}
                      />
                    </label>
                  </div>

                  {newCar.purchase_mode === 'local' && (
                    <label className="block p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <span className="text-sm text-blue-800 mb-1 block font-bold">سعر الشراء المحلي (د.ل)</span>
                      <Input
                        type="number"
                        min="0"
                        required
                        placeholder="مثال: 85000"
                        value={newCar.purchase_price_lyd || ''}
                        onChange={(e) =>
                          setNewCar({ ...newCar, purchase_price_lyd: Number(e.target.value) })
                        }
                      />
                      <p className="text-xs text-blue-700 mt-2">
                        لا حاجة لرحلة أو حاوية — التكلفة النهائية = سعر الشراء + أي مصاريف إضافية أدناه.
                      </p>
                    </label>
                  )}

                  {newCar.purchase_mode === 'import' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <label className="block">
                          <span className="text-sm text-slate-500 mb-1 block font-medium">سعر الشراء (KRW)</span>
                          <Input
                            type="number"
                            min="0"
                            value={newCar.purchase_price_krw || ''}
                            onChange={(e) =>
                              setNewCar({ ...newCar, purchase_price_krw: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm text-slate-500 mb-1 block font-medium">سعر الصرف KRW/USD</span>
                          <Input
                            type="number"
                            min="0"
                            value={newCar.exchange_rate_usd_krw || ''}
                            onChange={(e) =>
                              setNewCar({ ...newCar, exchange_rate_usd_krw: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-sm text-slate-500 mb-1 block font-medium">السعر بالدولار (محسوب)</span>
                          <Input type="number" readOnly value={newCar.purchase_price_usd} className="bg-white" />
                        </label>
                        <label className="block">
                          <span className="text-sm text-slate-500 mb-1 block font-medium">سعر الصرف USD/LYD</span>
                          <Input type="number" readOnly value={newCar.exchange_rate} className="bg-white" />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block">
                          <span className="text-sm text-slate-500 mb-1 block font-medium">الرحلة (اختياري)</span>
                          <select
                            className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                            value={newCar.trip_id}
                            onChange={(e) => setNewCar({ ...newCar, trip_id: e.target.value })}
                          >
                            <option value="">بدون رحلة</option>
                            {trips.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.trip_name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-sm text-slate-500 mb-1 block font-medium">حاويتك (اختياري)</span>
                          <select
                            className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                            value={newCar.container_id}
                            onChange={(e) => setNewCar({ ...newCar, container_id: e.target.value })}
                          >
                            <option value="">بدون حاوية</option>
                            {containers.map((c) => {
                              const capacity = Number(c.cars_count) || 6;
                              const used = containerUsage[c.id] || 0;
                              const isFull = used >= capacity;
                              return (
                                <option key={c.id} value={c.id} disabled={isFull}>
                                  {c.container_number || c.id.substring(0, 8)} ({used}/{capacity})
                                  {isFull ? ' — ممتلئة' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </label>
                      </div>
                    </>
                  )}

                  {newCar.purchase_mode === 'shared_container' && (
                    <div className="space-y-4 p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                      <p className="text-sm text-amber-900 font-medium">
                        سيارة أو سيارتان في حاوية شخص آخر — أدخل تكلفة الشحن والربط والجمارك{' '}
                        <strong>لهذه السيارة فقط</strong> (وليس للحاوية كاملة).
                      </p>
                      <label className="block">
                        <span className="text-sm text-slate-600 mb-1 block">مرجع الحاوية (اسم المالك / رقم)</span>
                        <Input
                          type="text"
                          placeholder="مثال: حاوية أبو محمد MSCU123"
                          value={newCar.external_container_ref}
                          onChange={(e) =>
                            setNewCar({ ...newCar, external_container_ref: e.target.value })
                          }
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm text-slate-600 mb-1 block">ربط بحاوية بالنظام (اختياري — لا يحسب ضمن السعة)</span>
                        <select
                          className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                          value={newCar.container_id}
                          onChange={(e) => setNewCar({ ...newCar, container_id: e.target.value })}
                        >
                          <option value="">بدون ربط</option>
                          {containers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.container_number || c.id.substring(0, 8)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm text-slate-600 mb-1 block">الرحلة (اختياري)</span>
                        <select
                          className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                          value={newCar.trip_id}
                          onChange={(e) => setNewCar({ ...newCar, trip_id: e.target.value })}
                        >
                          <option value="">بدون رحلة</option>
                          {trips.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.trip_name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <label className="block">
                          <span className="text-xs text-emerald-800 font-bold">شحن ($)</span>
                          <Input
                            type="number"
                            min="0"
                            value={newCar.shipping_allocation || ''}
                            onChange={(e) =>
                              setNewCar({ ...newCar, shipping_allocation: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-emerald-800 font-bold">ربط ($)</span>
                          <Input
                            type="number"
                            min="0"
                            value={newCar.link_fees_allocation || ''}
                            onChange={(e) =>
                              setNewCar({ ...newCar, link_fees_allocation: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-slate-600 font-bold">سعر الصرف</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={newCar.exchange_rate || ''}
                            onChange={(e) =>
                              setNewCar({ ...newCar, exchange_rate: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-blue-800 font-bold">جمارك (د.ل)</span>
                          <Input
                            type="number"
                            min="0"
                            value={newCar.customs_allocation || ''}
                            onChange={(e) =>
                              setNewCar({ ...newCar, customs_allocation: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-blue-800 font-bold">تخليص (د.ل)</span>
                          <Input
                            type="number"
                            min="0"
                            value={newCar.clearance_allocation || ''}
                            onChange={(e) =>
                              setNewCar({ ...newCar, clearance_allocation: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-slate-600 font-bold">أخرى (د.ل)</span>
                          <Input
                            type="number"
                            min="0"
                            value={newCar.expense_allocation || ''}
                            onChange={(e) =>
                              setNewCar({ ...newCar, expense_allocation: Number(e.target.value) })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="block">
                    <span className="text-sm text-slate-500 mb-1 block font-medium">صورة السيارة (تحميل ملف)</span>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageFileChange}
                          disabled={imageUploading}
                          className="file:bg-emerald-50 file:text-emerald-700 file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-4 file:hover:bg-emerald-100 cursor-pointer"
                        />
                        {imageUploading && (
                          <Loader className="w-5 h-5 animate-spin text-[#0A7C6E]" />
                        )}
                      </div>
                      
                      {imagePreview && (
                        <div className="relative w-full h-40 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview('');
                              setNewCar(prev => ({ ...prev, image_url: '' }));
                            }}
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 text-xs shadow-md transition-colors w-7 h-7 flex items-center justify-center"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {newCar.purchase_mode === 'import' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/10 p-3 rounded-lg border border-emerald-100">
                      <div className="block">
                        <span className="text-sm text-emerald-800 mb-1 block font-medium">تقدير بالدولار</span>
                        <div className="w-full h-10 px-3 flex items-center rounded-md border border-emerald-200 bg-white font-extrabold text-emerald-700">
                          {newCar.purchase_price_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} $
                        </div>
                      </div>
                      <div className="block">
                        <span className="text-sm text-emerald-800 mb-1 block font-medium">تقدير بالدينار</span>
                        <div className="w-full h-10 px-3 flex items-center rounded-md border border-emerald-200 bg-white font-extrabold text-[#0A7C6E]">
                          {(newCar.purchase_price_usd * newCar.exchange_rate).toLocaleString('ar-LY', {
                            minimumFractionDigits: 2,
                          })}{' '}
                          د.ل
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      type="submit"
                      className="flex-1 bg-[#0A7C6E] hover:bg-[#086156]"
                      disabled={
                        submitting ||
                        Boolean(
                          newCar.purchase_mode === 'import' &&
                            newCar.container_id &&
                            getContainerSlotInfo(newCar.container_id).isFull
                        )
                      }
                    >
                      {submitting ? 'جاري الحفظ والاحتساب...' : 'حفظ السيارة'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => {
                      setShowAddForm(false);
                      setImagePreview('');
                    }}>
                      إلغاء
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search & Comprehensive Filters Card */}
        <Card className="bg-slate-50/50 dark:bg-slate-800/10 border-slate-200/80 dark:border-slate-800/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-500" />
              أدوات البحث والفلترة المتقدمة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="ابحث عن سيارة بالاسم، الماركة، أو رقم الهيكل (VIN)..."
                className="pr-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Grid of Dropdowns */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Input
                type="text"
                placeholder="الماركة (تويوتا)"
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
              />
              <Input
                type="text"
                placeholder="الموديل (كورولا)"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
              />
              <Input
                type="number"
                placeholder="السنة"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              />
              <select
                className="h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">كل الحالات</option>
                <option value="available">متاحة للبيع</option>
                <option value="sold">مباعة</option>
                <option value="reserved">محجوزة</option>
                <option value="installment">تقسيط</option>
                <option value="in_transit">في الشحن</option>
              </select>
              <select
                className="h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white text-sm"
                value={tripFilter}
                onChange={(e) => setTripFilter(e.target.value)}
              >
                <option value="all">كل الرحلات</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>{t.trip_name}</option>
                ))}
              </select>
              <select
                className="h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white text-sm"
                value={profitabilityFilter}
                onChange={(e) => setProfitabilityFilter(e.target.value)}
              >
                <option value="all">كل الهوامش</option>
                <option value="high">أرباح ممتازة (&gt;= 15%)</option>
                <option value="low">أرباح منخفضة (&lt; 15%)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Cars List View - Cards and Table layout */}
        {filteredCars.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-4">
              <div className="text-6xl">🚫</div>
              <h3 className="text-xl font-bold">لم نجد أي سيارة مطابقة</h3>
              <p className="text-slate-500">جرب تعديل خيارات الفلترة أو ابدأ بإضافة سيارة جديدة للمخزون.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCars.map((car) => {
              const mainImage = car.image_urls && car.image_urls.length > 0
                ? car.image_urls[0]
                : null;

              return (
                <Link key={car.id} href={`/cars/${car.id}`} className="block">
                  <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col h-full bg-white dark:bg-slate-900 group">
                    {/* Thumbnail Display */}
                    <div className="h-48 relative bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={car.car_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="text-center space-y-2">
                          <span className="text-6xl block">🚗</span>
                          <span className="text-xs text-slate-400 block">اضغط لرفع معرض صور</span>
                        </div>
                      )}
                      <span className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${getStatusColor(car.status)}`}>
                        {statusLabels[car.status] || car.status}
                      </span>
                    </div>

                    <CardHeader className="p-4 pb-2">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-bold group-hover:text-[#0A7C6E] transition-colors">
                          {car.car_name}
                        </CardTitle>
                        <CardDescription className="text-xs font-mono">
                          VIN: {car.vin_number}
                        </CardDescription>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-slate-100 dark:border-slate-800 py-2">
                        <div>
                          <span className="text-slate-500 block">الشراء:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{moneyFormat(car.purchase_price_usd, true)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">التكلفة (واصل):</span>
                          <span className="font-bold text-slate-900 dark:text-white">{moneyFormat(car.final_cost)}</span>
                        </div>
                      </div>

                      {/* Selling / Profit Metrics */}
                      <div className="flex justify-between items-center text-sm pt-1">
                        {car.selling_price ? (
                          <>
                            <div>
                              <span className="text-xs text-slate-500 block">البيع:</span>
                              <span className="font-semibold">{moneyFormat(car.selling_price)}</span>
                            </div>
                            <div className="text-left">
                              <span className="text-xs text-slate-500 block">صافي الربح:</span>
                              <span className={`font-bold ${Number(car.profit) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {moneyFormat(car.profit || 0)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">غير مباعة بعد (اضغط لتعديل سعر البيع)</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

      </div>
    </RtlLayout>
  );
}
