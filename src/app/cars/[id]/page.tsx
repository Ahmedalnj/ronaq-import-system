"use client";

import { useEffect, useState, use } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { RtlLayout } from '@/components/shared/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader, ArrowRight, Upload, Trash2, Maximize2, X, ChevronLeft, ChevronRight, DollarSign, ShieldAlert, Award, Pencil, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/db/client';

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
  purchase_price_krw?: number;
  exchange_rate_usd_krw?: number;
}

export default function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Lightbox and Gallery States
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [sellingPrice, setSellingPrice] = useState('');
  const [carStatus, setCarStatus] = useState<Car['status']>('available');
  const [containerExpenses, setContainerExpenses] = useState<any[]>([]);

  const getExpenseLabel = (type: string) => {
    const labels: Record<string, string> = {
      shipping: 'شحن بحري واصل',
      customs: 'رسوم جمركية',
      clearance: 'تخليص جمركي',
      link_fees: 'رسوم الربط والتوثيق',
      transportation: 'نقل وتوزيع داخلي',
      office: 'مصاريف مكاتب وإدارية',
      other: 'مصاريف متنوعة أخرى',
    };
    return labels[type] || type;
  };

  const supabase = createClient();

  // Trips and Containers Lists for Selector Dropdowns
  interface Trip {
    id: string;
    trip_name: string;
    average_exchange_rate?: number | null;
  }
  interface Container {
    id: string;
    container_number?: string;
  }
  const [trips, setTrips] = useState<Trip[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);

  // Full Details Edit State
  const [showFullEditForm, setShowFullEditForm] = useState(false);
  const [editingCar, setEditingCar] = useState({
    vin_number: '',
    car_name: '',
    brand: 'كوري',
    model: 'غير معروف',
    year: new Date().getFullYear(),
    color: 'غير محدد',
    purchase_price_krw: 0,
    exchange_rate_usd_krw: 1350,
    purchase_price_usd: 0,
    exchange_rate: 6.50,
    trip_id: '',
    container_id: '',
    selling_price: '',
    status: 'available' as Car['status'],
  });

  // Deletion States
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch Trips & Containers list for dropdown selectors
  useEffect(() => {
    if (!user) return;
    const fetchTripsAndContainers = async () => {
      try {
        const tripsRes = await fetch('/api/trips');
        if (tripsRes.ok) {
          const tripsData = await tripsRes.json();
          setTrips(tripsData);
        }
        const { data: containerData } = await supabase
          .from('containers')
          .select('id, container_number');
        if (containerData) {
          setContainers(containerData);
        }
      } catch (err) {
        console.error('Failed to load trips or containers:', err);
      }
    };
    fetchTripsAndContainers();
  }, [user]);

  // Start Edit Mode Handler (Pre-fills state with current car details)
  const startFullEditMode = () => {
    if (!car) return;
    setEditingCar({
      vin_number: car.vin_number || '',
      car_name: car.car_name || '',
      brand: car.brand || 'كوري',
      model: car.model || 'غير معروف',
      year: car.year || new Date().getFullYear(),
      color: car.color || 'غير محدد',
      purchase_price_krw: car.purchase_price_krw || 0,
      exchange_rate_usd_krw: car.exchange_rate_usd_krw || 1350,
      purchase_price_usd: car.purchase_price_usd || 0,
      exchange_rate: car.exchange_rate || 6.50,
      trip_id: car.trip_id || '',
      container_id: car.container_id || '',
      selling_price: car.selling_price?.toString() || '',
      status: car.status || 'available',
    });
    setShowFullEditForm(true);
  };

  // Automatically calculate prices when KRW, Exchange Rate, or Trip changes in editing mode
  useEffect(() => {
    if (!showFullEditForm) return;
    const krw = Number(editingCar.purchase_price_krw || 0);
    const rateUsdKrw = Number(editingCar.exchange_rate_usd_krw || 1350);
    
    // Calculate USD Price
    const computedUsd = rateUsdKrw > 0 ? (krw / rateUsdKrw) : 0;
    
    // Find selected trip's exchange rate or fallback to default
    let activeExchangeRate = 6.50;
    if (editingCar.trip_id) {
      const selectedTrip = trips.find(t => t.id === editingCar.trip_id);
      if (selectedTrip && selectedTrip.average_exchange_rate) {
        activeExchangeRate = Number(selectedTrip.average_exchange_rate);
      }
    }

    // Update state only if values changed to prevent infinite loops
    if (
      Math.abs(editingCar.purchase_price_usd - computedUsd) > 0.01 || 
      Math.abs(editingCar.exchange_rate - activeExchangeRate) > 0.01
    ) {
      setEditingCar(prev => ({
        ...prev,
        purchase_price_usd: Number(computedUsd.toFixed(2)),
        exchange_rate: activeExchangeRate,
      }));
    }
  }, [editingCar.purchase_price_krw, editingCar.exchange_rate_usd_krw, editingCar.trip_id, showFullEditForm, trips]);

  // Delete Car Handler
  const handleDeleteCar = async () => {
    if (!car) return;
    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/cars?id=${car.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل في حذف السيارة');
      }

      setSuccess('تم حذف السيارة بنجاح! جاري تحويلك للمخزون...');
      setTimeout(() => {
        window.location.href = '/cars';
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'فشل حذف السيارة');
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  // Update Full Details Submit Handler
  const handleFullEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!car) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/cars', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: car.id,
          ...editingCar,
          purchase_price_usd: Number(editingCar.purchase_price_usd),
          purchase_price_krw: Number(editingCar.purchase_price_krw),
          exchange_rate_usd_krw: Number(editingCar.exchange_rate_usd_krw),
          exchange_rate: Number(editingCar.exchange_rate),
          year: Number(editingCar.year),
          selling_price: editingCar.selling_price ? Number(editingCar.selling_price) : undefined,
          image_urls: car.image_urls, // Retain existing images
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل في تحديث بيانات السيارة');
      }

      // Reload data to show updated calculations
      const updatedCar = await response.json();
      setCar(updatedCar);
      setSuccess('تم تحديث كامل بيانات السيارة بنجاح وإعادة احتساب تكلفة الهبوط!');
      setShowFullEditForm(false);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تعديل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchCarDetails = async () => {
      try {
        const response = await fetch(`/api/cars`);
        if (!response.ok) throw new Error('فشل في تحميل تفاصيل السيارة');
        const data: Car[] = await response.json();
        const foundCar = data.find((c) => c.id === id);
        if (!foundCar) throw new Error('السيارة غير موجودة في النظام');
        setCar(foundCar);
        setSellingPrice(foundCar.selling_price?.toString() || '');
        setCarStatus(foundCar.status);

        // Fetch container expenses
        if (foundCar.container_id) {
          const expResponse = await fetch('/api/expenses');
          if (expResponse.ok) {
            const expData = await expResponse.json();
            const filtered = expData.filter((e: any) => e.container_id === foundCar.container_id);
            setContainerExpenses(filtered);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCarDetails();
  }, [user, id]);

  const moneyFormat = (val: number, isUsd = false) => {
    return isUsd
      ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      : `${val.toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل`;
  };

  // Image Upload Handler to Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !car) return;
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const urls: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        
        // Basic Image Compression (Simulated here by size checks or simple constraints)
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          throw new Error('صيغة الملف غير مدعومة. يرجى رفع صور بصيغة JPG, PNG, WEBP فقط');
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${car.id}/${Math.random().toString(36).substring(2)}.${fileExt}`;
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

        urls.push(publicUrl);
      }

      // Update database array
      const updatedUrls = [...(car.image_urls || []), ...urls];
      const { error: dbError } = await supabase
        .from('cars')
        .update({ image_urls: updatedUrls })
        .eq('id', car.id);

      if (dbError) throw dbError;

      setCar({ ...car, image_urls: updatedUrls });
      setSuccess('تم رفع الصور وإضافتها للمعرض بنجاح!');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء رفع الصور');
    } finally {
      setUploading(false);
    }
  };

  // Delete Image Handler
  const handleDeleteImage = async (indexToDelete: number) => {
    if (!car) return;
    setError('');
    setSuccess('');

    try {
      const urlToRemove = car.image_urls[indexToDelete];
      const updatedUrls = car.image_urls.filter((_, idx) => idx !== indexToDelete);

      // 1. Remove from database
      const { error: dbError } = await supabase
        .from('cars')
        .update({ image_urls: updatedUrls })
        .eq('id', car.id);

      if (dbError) throw dbError;

      // 2. Try to remove from storage (extract path from public URL)
      try {
        const path = urlToRemove.split('/public/car-images/')[1];
        if (path) {
          await supabase.storage.from('car-images').remove([path]);
        }
      } catch (storageErr) {
        console.error('Failed to delete file from storage bucket:', storageErr);
      }

      setCar({ ...car, image_urls: updatedUrls });
      if (activeImageIndex >= updatedUrls.length && updatedUrls.length > 0) {
        setActiveImageIndex(updatedUrls.length - 1);
      }
      setSuccess('تم حذف الصورة بنجاح!');
    } catch (err: any) {
      setError(err.message || 'فشل حذف الصورة');
    }
  };

  // Reorder Images Handler (Move image left/right)
  const handleReorderImage = async (index: number, direction: 'left' | 'right') => {
    if (!car) return;
    const newUrls = [...car.image_urls];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newUrls.length) return;

    // Swap elements
    const temp = newUrls[index];
    newUrls[index] = newUrls[targetIndex];
    newUrls[targetIndex] = temp;

    try {
      const { error: dbError } = await supabase
        .from('cars')
        .update({ image_urls: newUrls })
        .eq('id', car.id);

      if (dbError) throw dbError;

      setCar({ ...car, image_urls: newUrls });
      setActiveImageIndex(targetIndex);
    } catch (err: any) {
      setError(err.message || 'فشل إعادة ترتيب الصور');
    }
  };

  // Update Car Details Handler (Quick update from pricing card)
  const handleUpdateDetails = async () => {
    if (!car) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const sellPriceNum = sellingPrice ? parseFloat(sellingPrice) : undefined;

      const response = await fetch('/api/cars', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: car.id,
          vin_number: car.vin_number,
          car_name: car.car_name,
          brand: car.brand,
          model: car.model,
          year: car.year,
          color: car.color,
          purchase_price_usd: car.purchase_price_usd,
          purchase_price_krw: car.purchase_price_krw,
          exchange_rate_usd_krw: car.exchange_rate_usd_krw,
          exchange_rate: car.exchange_rate,
          trip_id: car.trip_id,
          container_id: car.container_id,
          selling_price: sellPriceNum,
          status: carStatus,
          image_urls: car.image_urls,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل في تحديث السعر والحالة');
      }

      const updated = await response.json();
      setCar(updated);
      setSuccess('تم تحديث البيانات المالية والحالة بنجاح!');
      setEditMode(false);
    } catch (err: any) {
      setError(err.message || 'فشل تحديث البيانات');
    } finally {
      setLoading(false);
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

  if (error && !car) {
    return (
      <RtlLayout>
        <div className="p-8 space-y-4">
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">{error}</div>
          <Link href="/cars" className="flex items-center gap-2 text-[#0A7C6E] hover:underline">
            <ArrowRight size={20} /> العودة إلى قائمة السيارات
          </Link>
        </div>
      </RtlLayout>
    );
  }

  if (!car) return null;

  const currentImages = car.image_urls && car.image_urls.length > 0
    ? car.image_urls
    : ['/placeholder-car.png']; // Fallback if no images

  return (
    <RtlLayout>
      <div className="p-8 space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Link href="/cars" className="hover:text-slate-800 dark:hover:text-slate-200">السيارات</Link>
              <span>/</span>
              <span className="text-slate-800 dark:text-slate-200">{car.car_name}</span>
            </div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              🚗 {car.car_name}
              <span className="text-sm font-mono font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded">
                VIN: {car.vin_number}
              </span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={startFullEditMode} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white border-0">
              <Pencil size={18} /> تعديل البيانات الكاملة
            </Button>
            <Button onClick={() => setDeleteConfirm(true)} className="gap-2 bg-red-600 hover:bg-red-700 text-white border-0" disabled={deleting}>
              <Trash2 size={18} /> حذف السيارة
            </Button>
            <Link href="/cars">
              <Button variant="outline" className="gap-2">
                <ArrowRight size={18} /> العودة للقائمة
              </Button>
            </Link>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 p-4 rounded-lg">{success}</div>}

        {/* Gallery & Quick Overview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Gallery View (Left side - 7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Main Active Image Display */}
            <div className="relative aspect-video rounded-xl bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden group">
              <img
                src={currentImages[activeImageIndex]}
                alt={car.car_name}
                className="w-full h-full object-contain cursor-zoom-in"
                onClick={() => setLightboxOpen(true)}
                loading="lazy"
              />
              
              {/* Image Controls overlay */}
              <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full shadow pointer-events-auto"
                  onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : currentImages.length - 1))}
                  disabled={currentImages.length <= 1}
                >
                  <ChevronRight size={20} />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full shadow pointer-events-auto"
                  onClick={() => setActiveImageIndex((prev) => (prev < currentImages.length - 1 ? prev + 1 : 0))}
                  disabled={currentImages.length <= 1}
                >
                  <ChevronLeft size={20} />
                </Button>
              </div>

              {/* Zoom Button Overlay */}
              <Button
                variant="secondary"
                size="icon"
                className="absolute bottom-4 left-4 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setLightboxOpen(true)}
              >
                <Maximize2 size={18} />
              </Button>
            </div>

            {/* Thumbnails Gallery */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {car.image_urls && car.image_urls.map((img, idx) => (
                <div
                  key={idx}
                  className={`relative shrink-0 w-24 aspect-video rounded-lg border-2 overflow-hidden cursor-pointer group transition ${
                    activeImageIndex === idx ? 'border-[#0A7C6E]' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  onClick={() => setActiveImageIndex(idx)}
                >
                  <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                  
                  {/* Action overlays on thumbnails */}
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      className="p-1 text-white hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(idx);
                      }}
                      title="حذف الصورة"
                    >
                      <Trash2 size={14} />
                    </button>
                    {idx > 0 && (
                      <button
                        type="button"
                        className="p-1 text-white hover:text-[#8fdcd0]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReorderImage(idx, 'left');
                        }}
                        title="تحريك للأمام"
                      >
                        <ChevronRight size={14} />
                      </button>
                    )}
                    {idx < car.image_urls.length - 1 && (
                      <button
                        type="button"
                        className="p-1 text-white hover:text-[#8fdcd0]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReorderImage(idx, 'right');
                        }}
                        title="تحريك للخلف"
                      >
                        <ChevronLeft size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Upload New Image Button */}
              <label className="shrink-0 w-24 aspect-video rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#0A7C6E] flex flex-col items-center justify-center cursor-pointer transition">
                {uploading ? (
                  <Loader className="w-5 h-5 animate-spin text-[#0A7C6E]" />
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-[10px] text-slate-500 mt-1">إضافة صور</span>
                  </>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            </div>

          </div>

          {/* Quick Financial Overview (Right side - 5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Status & Pricing Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">💰 الحالة والبيانات المالية</CardTitle>
                    <CardDescription>عرض وتعديل أسعار البيع وحالات السيارات</CardDescription>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                    car.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                    car.status === 'available' ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {car.status === 'available' ? 'متاحة للبيع' :
                     car.status === 'sold' ? 'تم البيع' :
                     car.status === 'reserved' ? 'محجوزة' :
                     car.status === 'installment' ? 'بالتقسيط' : 'في الشحن'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {editMode ? (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">سعر البيع بالدينار</span>
                      <Input
                        type="number"
                        placeholder="سعر البيع المقدر"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">حالة السيارة</span>
                      <select
                        value={carStatus}
                        onChange={(e) => setCarStatus(e.target.value as Car['status'])}
                        className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white"
                      >
                        <option value="available">متاحة</option>
                        <option value="reserved">محجوزة</option>
                        <option value="sold">مباعة</option>
                        <option value="installment">تقسيط</option>
                        <option value="in_transit">في الشحن</option>
                      </select>
                    </label>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleUpdateDetails} className="flex-1">حفظ التغييرات</Button>
                      <Button variant="outline" onClick={() => setEditMode(false)}>إلغاء</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-slate-500">التكلفة النهائية (واصل):</span>
                      <span className="font-bold text-slate-900 dark:text-white">{moneyFormat(car.final_cost)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-slate-500">سعر البيع:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {car.selling_price ? moneyFormat(car.selling_price) : 'لم يحدد بعد'}
                      </span>
                    </div>
                    {car.selling_price && (
                      <>
                        <div className="flex justify-between py-2 text-sm">
                          <span className="text-slate-500">صافي الربح الفعلي:</span>
                          <span className={`font-bold ${Number(car.profit) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {moneyFormat(car.profit || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 text-sm">
                          <span className="text-slate-500">هامش الربح %:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {car.profit_margin?.toFixed(2)}%
                          </span>
                        </div>
                      </>
                    )}
                    <Button variant="outline" className="w-full mt-2" onClick={() => setEditMode(true)}>
                      تعديل السعر والحالة
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Car Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">📋 معلومات السيارة الأساسية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">الشركة المصنعة:</span>
                  <span className="font-semibold">{car.brand}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">الموديل والسنة:</span>
                  <span className="font-semibold">{car.model} ({car.year})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">لون الهيكل:</span>
                  <span className="font-semibold">{car.color}</span>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Detailed Landed Cost Allocations Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Purchase Pricing Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                تفاصيل الشراء
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">قيمة الشراء بالدولار:</span>
                <span className="font-semibold">{moneyFormat(car.purchase_price_usd, true)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">سعر صرف الدولار:</span>
                <span className="font-semibold">{car.exchange_rate} ليدي/$</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">قيمة الشراء بالدينار:</span>
                <span className="font-bold text-slate-900 dark:text-white">{moneyFormat(car.purchase_price_lyd)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Allocation Breakdown Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                توزيع المصاريف والتكلفة (Allocations)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">نصيب الشحن والربط واصل:</span>
                <span className="font-semibold text-orange-600 text-left">
                  <span className="block">+{moneyFormat(car.shipping_allocation, true)}</span>
                  <span className="block text-[10px] text-slate-400 font-normal">
                    المعادل: {moneyFormat(car.shipping_allocation * car.exchange_rate)}
                  </span>
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">نصيب الرسوم الجمركية:</span>
                <span className="font-semibold text-blue-600">+{moneyFormat(car.customs_allocation)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">نصيب مصاريف الرحلة العامة:</span>
                <span className="font-semibold text-purple-600">+{moneyFormat(car.expense_allocation)}</span>
              </div>
              {Number(car.other_allocation) > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">نصيب التوزيعات الأخرى:</span>
                  <span className="font-semibold text-slate-600">+{moneyFormat(car.other_allocation)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totals & Ratios Summary */}
          <Card className="bg-slate-50/50 dark:bg-slate-800/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-600" />
                التكلفة الإجمالية الواصلة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500">التكلفة النهائية الإجمالية (Landed Cost)</p>
                <p className="text-3xl font-extrabold text-[#0A7C6E] mt-1">{moneyFormat(car.final_cost)}</p>
              </div>

              {/* Preliminary / Estimated Cost Hint */}
              {containerExpenses.filter(e => e.status !== 'paid').length > 0 ? (
                <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-950/50 p-3 rounded-lg text-xs space-y-2 text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert size={14} className="text-amber-600 shrink-0" />
                    <span>⚠️ التكلفة تقديرية وليست نهائية</span>
                  </div>
                  <p className="leading-relaxed font-medium">
                    نظراً لأن بعض تكاليف شحن أو ربط أو جمرك الحاوية ما زالت مسجلة كديون (غير مسددة بالكامل بعد). قد يتغير سعر التكلفة النهائي بالتوازي مع أسعار صرف السداد الفعلية:
                  </p>
                  <ul className="list-disc list-inside space-y-1 font-semibold text-[11px] pr-1">
                    {containerExpenses.filter(e => e.status !== 'paid').map((e, idx) => (
                      <li key={idx}>
                        {getExpenseLabel(e.expense_type)}: {e.status === 'unpaid' ? 'غير مدفوع (دين)' : 'سداد جزئي'}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : car.container_id && containerExpenses.length > 0 ? (
                <div className="bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/40 p-3 rounded-lg text-xs text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
                  <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                  <span>تأكيد: تم سداد جميع مصاريف الحاوية والتكلفة نهائية 100%</span>
                </div>
              ) : null}

              <div className="text-xs text-slate-500 leading-relaxed text-center">
                * تم حساب هذه الأرقام وتوزيع المصاريف على السيارات بشكل تناسبي وديناميكي بناءً على سعر الشراء لكل سيارة في الحاوية والرحلة.
              </div>
            </CardContent>
          </Card>

        </div>

      </div>

      {/* Fullscreen Lightbox Image Viewer */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 select-none">
          
          {/* Lightbox Header */}
          <div className="flex justify-between items-center text-white">
            <span className="text-sm font-medium">{car.car_name} ({activeImageIndex + 1} من {currentImages.length})</span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 rounded-full"
              onClick={() => setLightboxOpen(false)}
            >
              <X size={24} />
            </Button>
          </div>

          {/* Main Large Image in Lightbox */}
          <div className="flex-1 flex items-center justify-center relative">
            
            {/* Nav Left Button */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 rounded-full shadow pointer-events-auto z-10"
              onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : currentImages.length - 1))}
              disabled={currentImages.length <= 1}
            >
              <ChevronRight size={24} />
            </Button>

            <img
              src={currentImages[activeImageIndex]}
              alt={car.car_name}
              className="max-w-full max-h-[80vh] object-contain rounded"
            />

            {/* Nav Right Button */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 rounded-full shadow pointer-events-auto z-10"
              onClick={() => setActiveImageIndex((prev) => (prev < currentImages.length - 1 ? prev + 1 : 0))}
              disabled={currentImages.length <= 1}
            >
              <ChevronLeft size={24} />
            </Button>

          </div>

          {/* Lightbox Footer (Thumbnails index) */}
          <div className="flex gap-2 justify-center overflow-x-auto pb-4">
            {currentImages.map((img, idx) => (
              <div
                key={idx}
                className={`w-16 aspect-video rounded border overflow-hidden cursor-pointer transition ${
                  activeImageIndex === idx ? 'border-white scale-105' : 'border-white/20'
                }`}
                onClick={() => setActiveImageIndex(idx)}
              >
                <img src={img} alt="Thumb" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>

        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2 font-bold text-xl">
                <Trash2 className="w-6 h-6" />
                تأكيد حذف السيارة نهائياً
              </CardTitle>
              <CardDescription>
                تحذير: لا يمكن التراجع عن هذا الإجراء وسيتم مسح السيارة وكافة صورها تماماً من النظام.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                هل أنت متأكد من رغبتك في حذف السيارة <strong>{car.car_name}</strong> ذات رقم الهيكل <strong>{car.vin_number}</strong>؟
              </p>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleDeleteCar} className="flex-1 bg-red-600 hover:bg-red-700 text-white" disabled={deleting}>
                  {deleting ? 'جاري الحذف...' : 'تأكيد الحذف النهائي'}
                </Button>
                <Button variant="outline" onClick={() => setDeleteConfirm(false)} disabled={deleting}>
                  إلغاء
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Full Details Edit Modal */}
      {showFullEditForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-950">
            <CardHeader>
              <CardTitle className="text-xl font-bold">تعديل بيانات السيارة الكاملة</CardTitle>
              <CardDescription>قم بتحديث أي من بيانات السيارة، وسيتم إعادة احتساب التكاليف بالدولار والدينار تلقائياً.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFullEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm text-slate-500 mb-1 block font-medium">اسم السيارة</span>
                    <Input
                      type="text"
                      required
                      value={editingCar.car_name}
                      onChange={(e) => setEditingCar({ ...editingCar, car_name: e.target.value })}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm text-slate-500 mb-1 block font-medium">رقم الهيكل (VIN)</span>
                    <Input
                      type="text"
                      required
                      value={editingCar.vin_number}
                      onChange={(e) => setEditingCar({ ...editingCar, vin_number: e.target.value })}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm text-slate-500 mb-1 block font-medium">الرحلة المرتبطة</span>
                    <select
                      required
                      className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white text-sm text-slate-900"
                      value={editingCar.trip_id}
                      onChange={(e) => setEditingCar({ ...editingCar, trip_id: e.target.value })}
                    >
                      <option value="">-- اختر رحلة الاستيراد --</option>
                      {trips.map((t) => (
                        <option key={t.id} value={t.id}>{t.trip_name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm text-slate-500 mb-1 block font-medium">الحاوية المرتبطة (اختياري)</span>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white text-sm text-slate-900"
                      value={editingCar.container_id}
                      onChange={(e) => setEditingCar({ ...editingCar, container_id: e.target.value })}
                    >
                      <option value="">لا يوجد حاوية</option>
                      {containers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.container_number || c.id.substring(0, 8)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm text-slate-500 mb-1 block font-medium">حالة السيارة</span>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white text-sm text-slate-900"
                      value={editingCar.status}
                      onChange={(e) => setEditingCar({ ...editingCar, status: e.target.value as Car['status'] })}
                    >
                      <option value="available">متاحة للبيع</option>
                      <option value="reserved">محجوزة</option>
                      <option value="sold">تم البيع</option>
                      <option value="installment">بالتقسيط</option>
                      <option value="in_transit">في الشحن</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm text-slate-500 mb-1 block font-medium">سعر البيع بالدينار (اختياري)</span>
                    <Input
                      type="number"
                      value={editingCar.selling_price}
                      onChange={(e) => setEditingCar({ ...editingCar, selling_price: e.target.value })}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 bg-blue-50/10 p-3 rounded-lg border border-blue-100">
                  <label className="block">
                    <span className="text-sm text-slate-600 mb-1 block font-bold">₩ سعر الشراء بالوون الكوري</span>
                    <Input
                      type="number"
                      min="0"
                      required
                      value={editingCar.purchase_price_krw || ''}
                      onChange={(e) => setEditingCar({ ...editingCar, purchase_price_krw: Number(e.target.value) })}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm text-slate-600 mb-1 block font-bold">📈 سعر صرف الدولار مقابل الوون (KRW/$)</span>
                    <Input
                      type="number"
                      min="0"
                      required
                      value={editingCar.exchange_rate_usd_krw || ''}
                      onChange={(e) => setEditingCar({ ...editingCar, exchange_rate_usd_krw: Number(e.target.value) })}
                    />
                  </label>
                </div>

                {/* Computed dynamic values previews */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/10 p-3 rounded-lg border border-emerald-100">
                  <div className="block">
                    <span className="text-sm text-emerald-800 mb-1 block font-medium">💵 سعر السيارة بالدولار (تقريبي)</span>
                    <div className="w-full h-10 px-3 flex items-center rounded-md border border-emerald-200 bg-white font-extrabold text-emerald-700">
                      {editingCar.purchase_price_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} $
                    </div>
                  </div>

                  <div className="block">
                    <span className="text-sm text-emerald-800 mb-1 block font-medium">💰 سعر السيارة بالدينار (حسب سعر الصرف)</span>
                    <div className="w-full h-10 px-3 flex items-center rounded-md border border-emerald-200 bg-white font-extrabold text-[#0A7C6E]">
                      {(editingCar.purchase_price_usd * editingCar.exchange_rate).toLocaleString('ar-LY', { minimumFractionDigits: 2 })} د.ل
                    </div>
                  </div>
                </div>

                {editingCar.trip_id && (
                  <div className="text-xs text-slate-500 italic px-1">
                    * سعر الصرف المستخدم للرحلة الحالية: {editingCar.exchange_rate.toFixed(3)} د.ل/$
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button type="submit" className="flex-1 bg-[#0A7C6E] hover:bg-[#086156]">
                    حفظ التغييرات
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowFullEditForm(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </RtlLayout>
  );
}
