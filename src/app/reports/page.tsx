"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { RtlLayout } from '@/components/shared/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader, TrendingUp, DollarSign, Activity, AlertTriangle, CheckCircle2, Landmark, Scale, Briefcase, ShieldAlert } from 'lucide-react';

interface CarReport {
  id: string;
  car_name: string;
  brand: string;
  model: string;
  year: number;
  vin_number: string;
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
  status: string;
}

interface TripFinancial {
  id: string;
  trip_name: string;
  capital_usd: number;
  spent_lyd: number;
  exchange_rate: number | null;
  expenses_lyd: number;
  status: string;
}

interface ReportsData {
  averageLandedCost: number;
  totalInventoryValue: number;
  highestCostCars: CarReport[];
  mostProfitableCars: CarReport[];
  lowestMarginCars: CarReport[];
  totalCarsCount: number;
  // Treasury & Debts details
  totalUsdCapital: number;
  totalLydSpentCapital: number;
  treasuryAverageRate: number;
  totalUsdCarPurchases: number;
  outstandingUsdDebt: number;
  outstandingLydDebt: number;
  totalLiabilitiesLyd: number;
  tripFinancials: TripFinancial[];
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchReports = async () => {
      try {
        const response = await fetch('/api/reports');
        if (!response.ok) throw new Error('فشل في تحميل التقارير المحاسبية');
        const reportData = await response.json();
        setData(reportData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user]);

  const moneyFormat = (val: number, currency: 'LYD' | 'USD' = 'LYD') => {
    return currency === 'USD'
      ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `${val.toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل`;
  };

  if (authLoading || loading) {
    return (
      <RtlLayout>
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <Loader className="w-10 h-10 animate-spin text-[#0A7C6E]" />
          <p className="text-slate-600 dark:text-slate-400">جاري إعداد وتحليل الميزانية والميزان التجاري الفعلي...</p>
        </div>
      </RtlLayout>
    );
  }

  if (error || !data) {
    return (
      <RtlLayout>
        <div className="p-8">
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg text-center space-y-2">
            <AlertTriangle className="w-12 h-12 mx-auto" />
            <h2 className="text-xl font-bold">حدث خطأ في جلب تقارير التكلفة</h2>
            <p>{error || 'يرجى التأكد من اتصال قاعدة البيانات والمحاولة مجدداً.'}</p>
          </div>
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
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">🏦 الخزينة والميزانية العمومية (General Ledger)</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              إدارة حركة رأس المال المجمع بالدولار والالتزامات المستحقة وتدفق صرف الدينار الليبي
            </p>
          </div>
        </div>

        {/* Dashboard Dynamic Accounting Balance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Treasury Capital Asset */}
          <Card className="bg-gradient-to-br from-[#0A7C6E]/5 to-[#0A7C6E]/10 border-[#0A7C6E]/20 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-[#0A7C6E]">
                <Landmark size={18} />
                الخزينة ورأس المال الكلي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-black text-[#0A7C6E]">
                {moneyFormat(data.totalUsdCapital, 'USD')}
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                المعادل بالخزينة: {moneyFormat(data.totalLydSpentCapital)}
              </p>
              <div className="bg-[#0A7C6E]/10 px-2.5 py-1 rounded text-xs text-[#0A7C6E] font-bold inline-block mt-1">
                📈 متوسط صرف الخزينة: {data.treasuryAverageRate.toFixed(3)} د.ل/$
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Multi-Currency Liabilities */}
          <Card className="bg-gradient-to-br from-red-50/40 to-red-100/20 border-red-200/60 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-red-700">
                <Scale size={18} />
                الالتزامات والديون الخارجية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-black text-red-700">
                {moneyFormat(data.totalLiabilitiesLyd)}
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 font-semibold border-t border-red-200/30 pt-1.5 mt-1">
                <div>💵 ذمة شحن بالدولار: <span className="text-red-700 block font-bold">{moneyFormat(data.outstandingUsdDebt, 'USD')}</span></div>
                <div>🏛️ ذمة جمرك بالدينار: <span className="text-red-700 block font-bold">{moneyFormat(data.outstandingLydDebt)}</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Inventory Landed Assets */}
          <Card className="bg-gradient-to-br from-[#FF6B35]/5 to-[#FF6B35]/10 border-[#FF6B35]/20 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-[#FF6B35]">
                <Briefcase size={18} />
                موجودات مخزون السيارات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-black text-[#FF6B35]">
                {moneyFormat(data.totalInventoryValue)}
              </div>
              <p className="text-xs text-slate-500 font-semibold">
                التكلفة الإجمالية واصل للسيارات غير المباعة
              </p>
              <div className="bg-[#FF6B35]/10 px-2.5 py-1 rounded text-xs text-[#FF6B35] font-bold inline-block mt-1">
                🚗 المخزون: {data.totalCarsCount} سيارات مسجلة
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trip-by-trip Capital Budget Ledger */}
        <Card className="border border-slate-200/80">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <Landmark className="w-5 h-5 text-[#0A7C6E]" />
              ميزانيات ورأس مال رحلات الاستيراد التراكمي
            </CardTitle>
            <CardDescription>عرض تفصيلي لرأس المال المدفوع بالدولار وتكلفته بالدينار الليبي لكل رحلة على حدة</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {data.tripFinancials.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">لا توجد رحلات استيراد مسجلة.</div>
            ) : (
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                    <th className="py-3 px-4">اسم الرحلة</th>
                    <th className="py-3 px-4">رأس المال الفعلي ($)</th>
                    <th className="py-3 px-4">تكلفة التغذية بالدينار (د.ل)</th>
                    <th className="py-3 px-4">مصاريف الرحلة العامة (د.ل)</th>
                    <th className="py-3 px-4">سعر الصرف المعتمد للرحلة</th>
                    <th className="py-3 px-4">حالة الرحلة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.tripFinancials.map((trip) => (
                    <tr key={trip.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-800">{trip.trip_name}</td>
                      <td className="py-4 px-4 font-bold text-emerald-600">{moneyFormat(trip.capital_usd, 'USD')}</td>
                      <td className="py-4 px-4 font-semibold text-slate-800">{moneyFormat(trip.spent_lyd)}</td>
                      <td className="py-4 px-4">
                        {trip.expenses_lyd > 0 ? (
                          <span className="font-semibold text-purple-700">
                            {moneyFormat(trip.expenses_lyd)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">لا توجد مصاريف عامة</span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-amber-600">
                        {trip.exchange_rate ? `${trip.exchange_rate.toFixed(3)} د.ل/$` : 'لا يوجد صفقات صرف'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                          trip.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {trip.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Landed Cost Ratios Analysis Engine */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Most Profitable Cars */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-[#0A7C6E] flex items-center gap-2 text-lg">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                السيارات الأكثر صافي ربحية
              </CardTitle>
              <CardDescription>الترتيب التنازلي للسيارات بعد طرح تكلفة الهبوط الفعلية من سعر البيع</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold">
                    <th className="py-3 px-4">السيارة</th>
                    <th className="py-3 px-4">التكلفة (واصل)</th>
                    <th className="py-3 px-4">سعر البيع</th>
                    <th className="py-3 px-4">صافي الربح الفعلي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.mostProfitableCars.map((car) => (
                    <tr key={car.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {car.car_name}
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{car.vin_number}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">{moneyFormat(car.final_cost)}</td>
                      <td className="py-3.5 px-4 font-bold">{car.selling_price ? moneyFormat(car.selling_price) : '-'}</td>
                      <td className="py-3.5 px-4 font-black text-[#0A7C6E]">
                        {car.profit ? moneyFormat(car.profit) : '0.00'}
                        <span className="block text-[10px] text-slate-400 font-semibold">({car.profit_margin?.toFixed(1)}% هامش)</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Lowest Profit Margin sold cars */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-amber-600 flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                السيارات الأقل هامش ربح
              </CardTitle>
              <CardDescription>متابعة وتحليل السيارات المباعة بأدنى هوامش للمراجعة السعرية</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold">
                    <th className="py-3 px-4">السيارة</th>
                    <th className="py-3 px-4">التكلفة (واصل)</th>
                    <th className="py-3 px-4">سعر البيع</th>
                    <th className="py-3 px-4">هامش الربح %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.lowestMarginCars.map((car) => (
                    <tr key={car.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {car.car_name}
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{car.brand} {car.model}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">{moneyFormat(car.final_cost)}</td>
                      <td className="py-3.5 px-4 font-bold">{car.selling_price ? moneyFormat(car.selling_price) : '-'}</td>
                      <td className="py-3.5 px-4 font-black text-amber-600">
                        {car.profit_margin?.toFixed(2)}%
                        <span className="block text-[10px] text-slate-400 font-semibold">({car.profit ? moneyFormat(car.profit) : '0'} ربح)</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Landed Cost Breakdown - Highest Cost Cars Table */}
        <Card className="border border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              السيارات الأعلى تكلفة هبوط شاملة مصاريفها الفردية
            </CardTitle>
            <CardDescription>الترتيب التنازلي للسيارات الأكبر كلفة مع عرض توزيعات الشحن والربط والجمارك الفردية بالتفصيل</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-semibold">
                  <th className="py-3 px-4">السيارة والمعلومات</th>
                  <th className="py-3 px-4">الشراء (دولار $)</th>
                  <th className="py-3 px-4">نصيب الشحن والربط ($)</th>
                  <th className="py-3 px-4">سعر الصرف المطبق</th>
                  <th className="py-3 px-4">نصيب الجمارك والتخليص (د.ل)</th>
                  <th className="py-3 px-4">نصيب الرحلة العامة (د.ل)</th>
                  <th className="py-3 px-4">التكلفة النهائية الكلية (د.ل)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.highestCostCars.map((car) => (
                  <tr key={car.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-800">
                      {car.car_name}
                      <span className="block text-[10px] text-slate-500 font-mono mt-0.5">VIN: {car.vin_number}</span>
                    </td>
                    <td className="py-4 px-4 font-semibold">{moneyFormat(car.purchase_price_usd, 'USD')}</td>
                    <td className="py-4 px-4 font-semibold text-orange-600">+{moneyFormat(car.shipping_allocation, 'USD')}</td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-600">{car.exchange_rate.toFixed(3)} د.ل</td>
                    <td className="py-4 px-4 font-semibold text-blue-600">+{moneyFormat(car.customs_allocation)}</td>
                    <td className="py-4 px-4 font-semibold text-purple-600">+{moneyFormat(car.expense_allocation + car.other_allocation)}</td>
                    <td className="py-4 px-4 font-extrabold text-slate-900">{moneyFormat(car.final_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Treasury Principles - Educational Alert Panel */}
        <Card className="border-amber-200 dark:border-amber-950 bg-amber-50/20 dark:bg-amber-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-800 dark:text-amber-300 text-md flex items-center gap-2 font-bold">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              💡 تنبيه ومفهوم الميزانية ومخاطر الصرف
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed font-medium">
            <p>
              يتم إدارة تعامل رأس المال والعملات بين الدولار والدينار بموجب <strong>مبدأ الميزانية المتكاملة (Unified Treasury Balance Sheet)</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pr-2">
              <li>
                <strong>رأس مال الرحلة الكلي</strong>: هو حاصل مجموع عمليات شراء وتغذية الدولار المرتبطة بهذه الرحلة والمدفوعة بالدينار.
              </li>
              <li>
                <strong>الالتزامات (المستحقات)</strong>: تُسجل كلفة الشحن والجمارك بمجرد إدخال الحاوية كـ "دين" لتظهر فوراً في الميزانية. لا يتم سداد الديون محاسبياً إلا عند تحويل الكاش وتسجيل سعر الصرف الفعلي لمشتريات سداد الديون، حيث يُعاد احتساب نصيب الشحن والربط للسيارات بناءً على الصرف الفعلي المدفوع به لضمان ربحية صافية واقعية 100%.
              </li>
              <li>
                <strong>الأرباح الصافية الحقيقية</strong>:
                <code className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded font-mono font-bold mr-1 text-[#0A7C6E]">
                  الأرباح الصافية = إجمالي المبيعات المحصلة - التكلفة النهائية الفعلية للسيارات واصل - الالتزامات والديون المتبقية
                </code>
              </li>
            </ul>
          </CardContent>
        </Card>

      </div>
    </RtlLayout>
  );
}
