"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { RtlLayout } from '@/components/shared/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CAR_EXPENSE_LABELS } from '@/lib/cars/car-expenses';
import { Loader, Plus, DollarSign, Wallet, FileText, Edit, Trash2, Package, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Expense {
  id: string;
  trip_id?: string;
  container_id?: string;
  expense_type: string;
  currency: 'LYD' | 'USD' | 'EUR';
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'paid' | 'partial' | 'unpaid';
  date: string;
  notes?: string;
  exchange_rate?: number | null;
  car_id?: string | null;
  containers?: {
    id: string;
    container_number: string;
    trips?: { trip_name: string } | null;
  } | null;
  cars?: {
    id: string;
    car_name: string;
    vin_number?: string;
  } | null;
}

interface Trip {
  id: string;
  trip_name: string;
}

interface Container {
  id: string;
  container_number: string;
  trips?: { trip_name: string };
}

const NO_CONTAINER_KEY = '__no_container__';
const CAR_EXPENSE_PREFIX = 'car:';

interface ExpenseGroup {
  key: string;
  containerId: string | null;
  label: string;
  tripName?: string;
  expenses: Expense[];
  remainingUsd: number;
  remainingLyd: number;
  remainingEur: number;
  unpaidCount: number;
  allPaid: boolean;
}

export default function ExpensesPage() {
  const { user, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    trip_id: '',
    container_id: '',
    expense_type: 'shipping',
    currency: 'LYD' as Expense['currency'],
    amount: 0,
    paid_amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [showPayModal, setShowPayModal] = useState(false);
  const [payingExpense, setPayingExpense] = useState<Expense | null>(null);
  const [payFormData, setPayFormData] = useState({
    paid_amount: 0,
    exchange_rate: '' as string | number,
    notes: '',
  });

  const handleOpenPayModal = (expense: Expense) => {
    setPayingExpense(expense);
    setPayFormData({
      paid_amount: expense.paid_amount || 0,
      exchange_rate: expense.exchange_rate || '',
      notes: expense.notes || '',
    });
    setShowPayModal(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingExpense) return;
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const paidNum = Number(payFormData.paid_amount);
      const amountNum = payingExpense.amount;
      const remainingNum = amountNum - paidNum;

      let status: Expense['status'] = 'unpaid';
      if (paidNum >= amountNum) status = 'paid';
      else if (paidNum > 0) status = 'partial';

      const exchangeRateNum = payingExpense.currency === 'USD' && payFormData.exchange_rate 
        ? Number(payFormData.exchange_rate) 
        : null;

      const response = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payingExpense.id,
          expense_type: payingExpense.expense_type,
          currency: payingExpense.currency,
          amount: payingExpense.amount,
          paid_amount: paidNum,
          remaining_amount: remainingNum,
          status,
          date: payingExpense.date,
          notes: payFormData.notes,
          trip_id: payingExpense.trip_id || null,
          container_id: payingExpense.container_id || null,
          exchange_rate: exchangeRateNum,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل في تحديث حالة السداد');
      }

      setSuccess('تم تسجيل سداد الدفعة وتحديث التكاليف بنجاح!');
      setShowPayModal(false);
      setPayingExpense(null);
      fetchExpenses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses');
      if (!response.ok) throw new Error('فشل في جلب قائمة المصاريف والنفقات');
      const data = await response.json();
      setExpenses(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا المصروف نهائياً؟ سيتم حذف جميع الالتزامات المرتبطة به وإعادة احتساب تكاليف السيارات تلقائياً.')) {
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/expenses?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل في حذف المصروف');
      }

      setSuccess('تم حذف المصروف وإعادة احتساب التكاليف بنجاح!');
      await fetchExpenses();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchDropdowns = async () => {
      try {
        const [tripsRes, containersRes] = await Promise.all([
          fetch('/api/trips'),
          fetch('/api/containers'),
        ]);

        if (tripsRes.ok) {
          const tripsData = await tripsRes.json();
          setTrips(tripsData);
        }
        if (containersRes.ok) {
          const containersData = await containersRes.json();
          setContainers(containersData);
        }
      } catch (err) {
        console.error('Failed to load filters dropdown data:', err);
      }
    };

    fetchExpenses();
    fetchDropdowns();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const amountNum = Number(newExpense.amount);
      const paidNum = Number(newExpense.paid_amount);
      const remainingNum = amountNum - paidNum;
      
      let status: Expense['status'] = 'unpaid';
      if (paidNum >= amountNum) status = 'paid';
      else if (paidNum > 0) status = 'partial';

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newExpense,
          amount: amountNum,
          paid_amount: paidNum,
          remaining_amount: remainingNum,
          status,
          trip_id: newExpense.trip_id || null,
          container_id: newExpense.container_id || null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل في تسجيل المصروف');
      }

      setSuccess('تم تسجيل المصروف والنفقة بنجاح، وجرى تحديث حساب الالتزامات والمستحقات المتبقية.');
      setShowAddForm(false);
      setNewExpense({
        trip_id: '',
        container_id: '',
        expense_type: 'shipping',
        currency: 'LYD',
        amount: 0,
        paid_amount: 0,
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      fetchExpenses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getExpenseLabel = (type: string) => {
    const labels: Record<string, string> = {
      shipping: 'شحن بحري واصل',
      customs: 'رسوم جمركية',
      clearance: 'تخليص جمركي',
      link_fees: 'رسوم الربط والتوثيق',
      transportation: 'نقل وتوزيع داخلي',
      office: 'مصاريف مكاتب وإدارية',
      other: 'مصاريف متنوعة أخرى',
      ...CAR_EXPENSE_LABELS,
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-900/30',
      partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/30',
      unpaid: 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900/30',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      paid: 'مدفوع بالكامل',
      partial: 'مدفوع جزئياً',
      unpaid: 'غير مدفوع',
    };
    return labels[status] || status;
  };

  const moneyFormat = (val: number, currency: string = 'LYD') => {
    return `${val.toLocaleString('ar-LY', { minimumFractionDigits: 2 })} ${currency === 'LYD' ? 'د.ل' : currency === 'USD' ? '$' : '€'}`;
  };

  const totalLiabilitiesAmount = expenses.reduce((sum, e) => sum + Number(e.remaining_amount || 0), 0);
  const totalPaidAmount = expenses.reduce((sum, e) => sum + Number(e.paid_amount || 0), 0);
  const totalExpensesAmount = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const expenseGroups = useMemo(() => {
    const map = new Map<string, Expense[]>();

    for (const expense of expenses) {
      const key = expense.car_id
        ? `${CAR_EXPENSE_PREFIX}${expense.car_id}`
        : expense.container_id || NO_CONTAINER_KEY;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(expense);
    }

    const groups: ExpenseGroup[] = Array.from(map.entries()).map(([key, groupExpenses]) => {
      const first = groupExpenses[0];
      const containerMeta = first?.containers;
      const carMeta = first?.cars;
      const remainingUsd = groupExpenses
        .filter((e) => e.currency === 'USD')
        .reduce((s, e) => s + Number(e.remaining_amount || 0), 0);
      const remainingLyd = groupExpenses
        .filter((e) => e.currency === 'LYD')
        .reduce((s, e) => s + Number(e.remaining_amount || 0), 0);
      const remainingEur = groupExpenses
        .filter((e) => e.currency === 'EUR')
        .reduce((s, e) => s + Number(e.remaining_amount || 0), 0);
      const unpaidCount = groupExpenses.filter((e) => e.status !== 'paid').length;

      return {
        key,
        containerId: key === NO_CONTAINER_KEY ? null : key,
        label: key.startsWith(CAR_EXPENSE_PREFIX)
          ? `🚗 مصاريف السيارة: ${carMeta?.car_name || carMeta?.vin_number || 'سيارة'}`
          : key === NO_CONTAINER_KEY
            ? 'مصاريف عامة (بدون حاوية)'
            : containerMeta?.container_number || `حاوية ${key.substring(0, 8)}`,
        tripName: containerMeta?.trips?.trip_name,
        expenses: groupExpenses,
        remainingUsd,
        remainingLyd,
        remainingEur,
        unpaidCount,
        allPaid: unpaidCount === 0,
      };
    });

    return groups.sort((a, b) => {
      if (a.allPaid !== b.allPaid) return a.allPaid ? 1 : -1;
      const aDue = a.remainingUsd + a.remainingLyd + a.remainingEur;
      const bDue = b.remainingUsd + b.remainingLyd + b.remainingEur;
      return bDue - aDue;
    });
  }, [expenses]);

  const containersWithUnpaid = expenseGroups.filter((g) => !g.allPaid && g.containerId).length;

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isGroupExpanded = (group: ExpenseGroup) => {
    if (expandedGroups[group.key] !== undefined) return expandedGroups[group.key];
    return !group.allPaid;
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
            <h1 className="text-4xl font-bold">💸 المصاريف والالتزامات المالية</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              تتبع تكاليف الشحن والجمارك والمصاريف التشغيلية ومراقبة المستحقات والديون المتبقية
            </p>
          </div>
          <Button size="lg" onClick={() => setShowAddForm(true)} className="gap-2 bg-[#0A7C6E] hover:bg-[#086156]">
            <Plus className="w-5 h-5" />
            تسجيل مصروف جديد
          </Button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 p-4 rounded-lg">{success}</div>}

        {/* Dashboard Liabilities Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-red-50/30 dark:bg-red-950/10 border-red-200 dark:border-red-950">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">🚨 إجمالي الالتزامات والديون المتبقية</CardTitle>
              <DollarSign className="w-5 h-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                {moneyFormat(totalLiabilitiesAmount)}
              </div>
              <p className="text-xs text-slate-500 mt-1">مستحقات غير مدفوعة يجب سدادها للموردين والجمارك</p>
            </CardContent>
          </Card>

          <Card className="bg-green-50/30 dark:bg-green-950/10 border-green-200 dark:border-green-950">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">✅ المصاريف المدفوعة والمسددة</CardTitle>
              <Wallet className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {moneyFormat(totalPaidAmount)}
              </div>
              <p className="text-xs text-slate-500 mt-1">إجمالي ما تم سداده وصرفه بالفعل للشركاء والموردين</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">📋 إجمالي حجم النفقات الإجمالية</CardTitle>
              <FileText className="w-5 h-5 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {moneyFormat(totalExpensesAmount)}
              </div>
              <p className="text-xs text-slate-500 mt-1">إجمالي كافة تكاليف الاستيراد المسجلة بالنظام</p>
            </CardContent>
          </Card>
        </div>

        {containersWithUnpaid > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-lg flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">حاويات تحتاج سداد</p>
              <p className="mt-0.5 text-amber-800">
                {containersWithUnpaid} حاوية بها مصاريف غير مدفوعة أو مدفوعة جزئياً — راجع المجموعات أدناه.
              </p>
            </div>
          </div>
        )}

        {/* Add Expense Modal Form */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>تسجيل مصروف أو نفقة جديدة</CardTitle>
                <CardDescription>سيقوم محرك التكاليف بتحميل حصة هذا المصروف تلقائياً للسيارات.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">تصنيف المصروف</span>
                      <select
                        className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white text-sm"
                        value={newExpense.expense_type}
                        onChange={(e) => setNewExpense({ ...newExpense, expense_type: e.target.value })}
                      >
                        <option value="shipping">شحن واصل</option>
                        <option value="customs">رسوم جمركية</option>
                        <option value="clearance">تخليص جمركي</option>
                        <option value="link_fees">رسوم الربط</option>
                        <option value="transportation">النقل الداخلي</option>
                        <option value="office">مصاريف مكتب</option>
                        <option value="other">أخرى متنوعة</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">العملة</span>
                      <select
                        className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white text-sm"
                        value={newExpense.currency}
                        onChange={(e) => setNewExpense({ ...newExpense, currency: e.target.value as Expense['currency'] })}
                      >
                        <option value="LYD">دينار ليبي (LYD)</option>
                        <option value="USD">دولار أمريكي (USD)</option>
                        <option value="EUR">يورو (EUR)</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">المبلغ الإجمالي للمصروف</span>
                      <Input
                        type="number"
                        placeholder="مثال: 5000"
                        required
                        value={newExpense.amount || ''}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">المبلغ المدفوع (المسدد)</span>
                      <Input
                        type="number"
                        placeholder="المبلغ المسدد حالياً"
                        required
                        value={newExpense.paid_amount || ''}
                        onChange={(e) => setNewExpense({ ...newExpense, paid_amount: Number(e.target.value) })}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">الرحلة المرتبطة</span>
                      <select
                        className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white text-sm"
                        value={newExpense.trip_id}
                        onChange={(e) => setNewExpense({ ...newExpense, trip_id: e.target.value })}
                      >
                        <option value="">لا يوجد رحلة</option>
                        {trips.map((t) => (
                          <option key={t.id} value={t.id}>{t.trip_name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">الحاوية المرتبطة</span>
                      <select
                        className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white text-sm"
                        value={newExpense.container_id}
                        onChange={(e) => setNewExpense({ ...newExpense, container_id: e.target.value })}
                      >
                        <option value="">بدون حاوية</option>
                        {containers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.container_number || c.id.substring(0, 8)}
                            {c.trips?.trip_name ? ` — ${c.trips.trip_name}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block">تاريخ المصروف</span>
                      <Input
                        type="date"
                        required
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-sm text-slate-500 mb-1 block">ملاحظات</span>
                    <textarea
                      className="w-full min-h-[80px] p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white text-sm"
                      placeholder="تفاصيل الفاتورة أو الجهة المستلمة..."
                      value={newExpense.notes}
                      onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                    />
                  </label>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" className="flex-1 bg-[#0A7C6E] hover:bg-[#086156]" disabled={submitting}>
                      {submitting ? 'جاري التسجيل...' : 'تسجيل وحساب المصروف'}
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

        {/* Edit / Pay Expense Modal */}
        {showPayModal && payingExpense && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#0A7C6E]" />
                  <span>تعديل وسداد المصروف</span>
                </CardTitle>
                <CardDescription>
                  المصروف الحالي: {getExpenseLabel(payingExpense.expense_type)} ({moneyFormat(payingExpense.amount, payingExpense.currency)})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePaySubmit} className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg text-sm space-y-1.5 border border-slate-200/50">
                    <div className="flex justify-between">
                      <span className="text-slate-500">القيمة الكلية:</span>
                      <span className="font-semibold">{moneyFormat(payingExpense.amount, payingExpense.currency)}</span>
                    </div>
                    <div className="flex justify-between text-red-600 font-medium">
                      <span className="text-slate-500">المتبقي المطلوب سداده:</span>
                      <span>{moneyFormat(payingExpense.remaining_amount, payingExpense.currency)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm text-slate-500 mb-1 block font-medium">المبلغ المدفوع التراكمي</span>
                      <Input
                        type="number"
                        min="0"
                        max={payingExpense.amount}
                        step="0.01"
                        required
                        placeholder="المبلغ المسدد بالكامل"
                        value={payFormData.paid_amount}
                        onChange={(e) => setPayFormData({ ...payFormData, paid_amount: Number(e.target.value) })}
                      />
                    </label>

                    {payingExpense.currency === 'USD' ? (
                      <label className="block">
                        <span className="text-sm text-amber-700 mb-1 block font-bold">🟢 سعر الصرف مقابل الدينار</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          required
                          placeholder="مثال: 6.540"
                          value={payFormData.exchange_rate}
                          onChange={(e) => setPayFormData({ ...payFormData, exchange_rate: e.target.value })}
                        />
                      </label>
                    ) : (
                      <div className="flex items-center justify-center text-xs text-slate-400 pt-6">
                        العملة بالدينار الليبي
                      </div>
                    )}
                  </div>

                  <label className="block">
                    <span className="text-sm text-slate-500 mb-1 block font-medium">ملاحظات السداد / تعديل الملاحظات</span>
                    <textarea
                      className="w-full min-h-[80px] p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white text-sm"
                      placeholder="جهة السداد، تفاصيل التحويل..."
                      value={payFormData.notes}
                      onChange={(e) => setPayFormData({ ...payFormData, notes: e.target.value })}
                    />
                  </label>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" className="flex-1 bg-[#0A7C6E] hover:bg-[#086156]" disabled={submitting}>
                      {submitting ? 'جاري الحفظ والتحصيل...' : 'حفظ عملية السداد'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setShowPayModal(false); setPayingExpense(null); }}>
                      إلغاء
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Expenses grouped by container */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#0A7C6E]" />
              النفقات مجمّعة حسب الحاوية
            </CardTitle>
            <CardDescription>
              كل حاوية تعرض ما تم سداده وما تبقى — الحاويات غير المسددة تظهر في الأعلى
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {expenses.length === 0 ? (
              <div className="p-12 text-center text-slate-500">لا توجد مصاريف أو فواتير مسجلة بعد في النظام.</div>
            ) : (
              expenseGroups.map((group) => {
                const expanded = isGroupExpanded(group);
                const hasDue =
                  group.remainingUsd > 0 || group.remainingLyd > 0 || group.remainingEur > 0;

                return (
                  <div
                    key={group.key}
                    className={`rounded-xl border overflow-hidden ${
                      group.allPaid
                        ? 'border-green-200 bg-green-50/20'
                        : 'border-amber-200 bg-amber-50/30'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      className="w-full flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 text-right hover:bg-white/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {group.containerId ? (
                          <Package className={`w-5 h-5 mt-0.5 ${group.allPaid ? 'text-green-600' : 'text-amber-600'}`} />
                        ) : (
                          <FileText className="w-5 h-5 mt-0.5 text-slate-500" />
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{group.label}</p>
                          {group.tripName && (
                            <p className="text-xs text-slate-500 mt-0.5">الرحلة: {group.tripName}</p>
                          )}
                          <p className="text-xs text-slate-500 mt-1">
                            {group.expenses.length} مصروف · {group.unpaidCount} بحاجة سداد
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 md:gap-4">
                        {group.allPaid ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            مسددة بالكامل
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                            <AlertCircle className="w-3.5 h-3.5" />
                            يتطلب سداد
                          </span>
                        )}
                        {hasDue && (
                          <div className="text-xs font-semibold text-red-700 space-y-0.5">
                            <p className="text-slate-500 font-normal">المتبقي للسداد:</p>
                            {group.remainingUsd > 0 && <p>{moneyFormat(group.remainingUsd, 'USD')}</p>}
                            {group.remainingLyd > 0 && <p>{moneyFormat(group.remainingLyd, 'LYD')}</p>}
                            {group.remainingEur > 0 && <p>{moneyFormat(group.remainingEur, 'EUR')}</p>}
                          </div>
                        )}
                        {expanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {expanded && (
                      <div className="border-t border-slate-200/80 bg-white overflow-x-auto">
                        <table className="w-full text-right text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600">
                              <th className="px-4 py-2">المصروف</th>
                              <th className="px-4 py-2">الإجمالي</th>
                              <th className="px-4 py-2">المدفوع</th>
                              <th className="px-4 py-2">المتبقي</th>
                              <th className="px-4 py-2">الحالة</th>
                              <th className="px-4 py-2">التاريخ</th>
                              <th className="px-4 py-2">العمليات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {group.expenses.map((expense) => (
                              <tr key={expense.id} className="hover:bg-slate-50/80">
                                <td className="px-4 py-3 font-medium">
                                  {getExpenseLabel(expense.expense_type)}
                                  {expense.notes && (
                                    <span className="block text-xs text-slate-500 font-normal mt-0.5">{expense.notes}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">{moneyFormat(expense.amount, expense.currency)}</td>
                                <td className="px-4 py-3 text-green-600">
                                  {moneyFormat(expense.paid_amount, expense.currency)}
                                </td>
                                <td className="px-4 py-3 font-semibold text-red-600">
                                  {Number(expense.remaining_amount) > 0
                                    ? moneyFormat(expense.remaining_amount, expense.currency)
                                    : '—'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(expense.status)}`}>
                                    {getStatusLabel(expense.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-500 text-xs">
                                  {new Date(expense.date).toLocaleDateString('ar-LY')}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1 flex-wrap">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs text-[#0A7C6E] border-[#0A7C6E]/20"
                                      onClick={() => handleOpenPayModal(expense)}
                                    >
                                      <Edit size={11} className="ml-1" />
                                      سداد
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs text-red-600 border-red-100"
                                      onClick={() => handleDeleteExpense(expense.id)}
                                    >
                                      <Trash2 size={11} className="ml-1" />
                                      حذف
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

      </div>
    </RtlLayout>
  );
}
