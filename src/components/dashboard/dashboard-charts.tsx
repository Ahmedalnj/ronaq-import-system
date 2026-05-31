"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DashboardMetrics {
  totalCapital: number;
  totalCars: number;
  soldCars: number;
  availableCars: number;
  totalProfit: number;
  remainingLiabilities: number;
  totalExpenses: number;
  totalSales: number;
  averageExchangeRate: number;
}

interface DashboardChartsProps {
  metrics: DashboardMetrics;
}

const COLORS = ['#0A7C6E', '#F59E0B', '#FF6B35', '#086156', '#0fb9a6'];

const mockMonthlySales = [
  { month: 'يناير', sales: 2400, profit: 240 },
  { month: 'فبراير', sales: 1398, profit: 221 },
  { month: 'مارس', sales: 9800, profit: 229 },
  { month: 'أبريل', sales: 3908, profit: 200 },
  { month: 'مايو', sales: 4800, profit: 221 },
  { month: 'يونيو', sales: 3800, profit: 250 },
];

const mockCarStatus = [
  { name: 'متاح', value: 12 },
  { name: 'مباع', value: 8 },
  { name: 'محجوز', value: 5 },
  { name: 'بالتقسيط', value: 3 },
];

export function DashboardMetricsCards({ metrics }: DashboardChartsProps) {
  const cards = [
    {
      title: 'رأس المال الإجمالي ($)',
      value: formatCurrency(metrics.totalCapital, 'USD'),
      icon: '💼',
      color: 'bg-slate-50 border border-slate-200/80',
    },
    {
      title: 'إجمالي السيارات',
      value: metrics.totalCars,
      icon: '🚗',
      color: 'bg-slate-50 border border-slate-200/80',
    },
    {
      title: 'السيارات المباعة',
      value: metrics.soldCars,
      icon: '✅',
      color: 'bg-[#0A7C6E]/5 border border-[#0A7C6E]/20',
    },
    {
      title: 'السيارات المتاحة',
      value: metrics.availableCars,
      icon: '📦',
      color: 'bg-slate-50 border border-slate-200/80',
    },
    {
      title: 'إجمالي الربح',
      value: formatCurrency(metrics.totalProfit, 'LYD'),
      icon: '📈',
      color: 'bg-[#0A7C6E]/10 border border-[#0A7C6E]/30',
    },
    {
      title: 'الالتزامات المتبقية',
      value: formatCurrency(metrics.remainingLiabilities, 'LYD'),
      icon: '⚠️',
      color: 'bg-[#FF6B35]/5 border border-[#FF6B35]/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, idx) => (
        <Card key={idx} className={card.color}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {card.title}
                </p>
                <p className="text-2xl font-bold mt-2">
                  {card.value}
                </p>
              </div>
              <span className="text-4xl">{card.icon}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SalesChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>المبيعات الشهرية</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={mockMonthlySales}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="sales" fill="#0A7C6E" name="المبيعات" />
            <Bar dataKey="profit" fill="#F59E0B" name="الربح" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CarStatusChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>حالة السيارات</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={mockCarStatus}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {mockCarStatus.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ProfitTrendChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>اتجاه الربح</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockMonthlySales}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="profit" stroke="#FF6B35" strokeWidth={2} name="الربح" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
