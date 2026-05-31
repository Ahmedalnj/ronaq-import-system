# ✨ رونق - نظام إدارة الاستيراد والمحاسبة

نظام متكامل احترافي لإدارة استيراد السيارات والمحاسبة الشخصية، مستوحى من أنظمة ERP مثل ERPNext و Odoo لكن مبسط وموجّه للاستخدام الشخصي.

## ✨ المميزات الرئيسية

### 📊 لوحة التحكم

- عرض شامل للمقاييس الأساسية
- رسوم بيانية توضيحية للمبيعات والأرباح
- إحصائيات حالة السيارات
- ملخص سريع للعمليات

### ✈️ إدارة الرحلات

- إنشاء وتحرير رحلات الاستيراد
- تتبع رأس المال لكل رحلة
- حساب الأرباح والخسائر
- تتبع الالتزامات المتبقية

### 🚗 إدارة السيارات

- نظام مخزون متقدم
- إدارة تفاصيل السيارة (VIN، الماركة، الموديل، إلخ)
- حساب التكاليف تلقائياً
- تحديد حالة السيارة (متاحة، محجوزة، مباعة، إلخ)
- رفع صور السيارات

### 💸 إدارة النفقات

- تصنيفات متعددة للنفقات
- تتبع الدفعات والالتزامات
- حساب المبالغ المتبقية تلقائياً
- دعم عملات متعددة (ليدي، دولار، يورو)

### 💰 إدارة المبيعات والأقساط

- تسجيل المبيعات بسهولة
- تتبع الأقساط والدفعات
- إصدار الفواتير
- طباعة PDF للفواتير

### 📈 النظام المحاسبي

- تتبع رأس المال
- حساب التدفق النقدي
- حساب الأرباح الصافية
- ملخص الالتزامات

### 📱 التصميم

- واجهة عربية RTL كاملة
- دعم الوضع الليلي والمضيء
- تصميم مستجيب (Responsive)
- تجربة مستخدم سلسة وسريعة

## 🛠 التكنولوجيا المستخدمة

- **Next.js 16** - إطار عمل React
- **TypeScript** - لغة البرمجة
- **Tailwind CSS** - تنسيق CSS
- **Shadcn UI** - مكونات واجهة المستخدم
- **Supabase** - قاعدة البيانات والمصادقة
- **React Hook Form** - إدارة النماذج
- **Zod** - التحقق من البيانات
- **Recharts** - الرسوم البيانية
- **Lucide Icons** - الأيقونات

## 🚀 البدء السريع

### 1. المتطلبات

- Node.js 18+
- npm أو yarn

### 2. التثبيت

```bash
# استنساخ المشروع
git clone <repository-url>
cd ronaq-import-system

# تثبيت المكتبات
npm install

# إنشاء ملف البيئة
cp .env.example .env.local
```

### 3. إعداد Supabase

#### أ) إنشاء حساب Supabase

1. انتقل إلى [supabase.com](https://supabase.com)
2. سجل حساباً جديداً
3. أنشئ مشروع جديد

#### ب) إعداد قاعدة البيانات

1. انسخ محتوى `DATABASE_SCHEMA.sql`
2. في Supabase، انتقل إلى **SQL Editor**
3. أنشئ query جديد والصق الكود
4. اضغط **Execute**

#### ج) إعداد المتغيرات البيئية

في ملف `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_postgresql_url
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

يمكنك الحصول على هذه البيانات من:

- **Settings** → **API** في Supabase Dashboard

### 4. تشغيل المشروع

```bash
# بدء خادم التطوير
npm run dev

# ثم افتح
http://localhost:3000
```

### 5. إنشاء حساب أول

1. انتقل إلى صفحة التسجيل
2. أنشئ حساباً جديداً
3. ستتم إعادة توجيهك إلى لوحة التحكم

## 📁 هيكل المشروع

```
ronaq-import-system/
├── src/
│   ├── app/                    # صفحات Next.js
│   │   ├── auth/              # صفحات المصادقة
│   │   ├── dashboard/         # لوحة التحكم
│   │   ├── trips/             # إدارة الرحلات
│   │   ├── cars/              # إدارة السيارات
│   │   ├── expenses/          # إدارة النفقات
│   │   ├── sales/             # إدارة المبيعات
│   │   ├── installments/      # إدارة الأقساط
│   │   ├── reports/           # التقارير
│   │   ├── api/               # مسارات API
│   │   ├── layout.tsx         # التخطيط الرئيسي
│   │   ├── globals.css        # الأنماط العامة
│   │   └── page.tsx           # الصفحة الرئيسية
│   │
│   ├── components/
│   │   ├── ui/                # مكونات واجهة المستخدم
│   │   ├── shared/            # المكونات المشتركة
│   │   ├── dashboard/         # مكونات لوحة التحكم
│   │   ├── forms/             # النماذج
│   │   └── tables/            # الجداول
│   │
│   ├── lib/
│   │   ├── db/                # إعدادات قاعدة البيانات
│   │   ├── utils/             # دوال مساعدة
│   │   └── validations/       # مخططات التحقق
│   │
│   ├── hooks/                 # React Hooks مخصصة
│   ├── types/                 # أنواع TypeScript
│   └── accounting.ts          # منطق المحاسبة
│
├── public/                    # الملفات الثابتة
├── DATABASE_SCHEMA.sql        # مخطط قاعدة البيانات
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

## 🗄️ مخطط قاعدة البيانات

### الجداول الرئيسية

#### users

معلومات المستخدم والمصادقة

#### trips

رحلات الاستيراد

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key)
- trip_name: TEXT
- start_date: DATE
- end_date: DATE (Optional)
- capital: DECIMAL
- status: TEXT ('open' | 'closed')
```

#### cars

مخزون السيارات

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key)
- vin_number: TEXT (UNIQUE)
- car_name: TEXT
- brand: TEXT
- model: TEXT
- year: INTEGER
- purchase_price_usd: DECIMAL
- exchange_rate: DECIMAL
- final_cost: DECIMAL (محسوب)
- selling_price: DECIMAL (Optional)
- status: TEXT
- trip_id: UUID (Foreign Key, Optional)
```

#### expenses

النفقات والتكاليف

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key)
- trip_id: UUID (Foreign Key, Optional)
- expense_type: TEXT
- amount: DECIMAL
- paid_amount: DECIMAL
- remaining_amount: DECIMAL (محسوب)
- status: TEXT ('paid' | 'partial' | 'unpaid')
- date: DATE
```

#### liabilities

الالتزامات المالية

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key)
- expense_id: UUID (Foreign Key)
- total_amount: DECIMAL
- paid_amount: DECIMAL
- remaining_amount: DECIMAL (محسوب)
- status: TEXT
```

#### sales

المبيعات

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key)
- car_id: UUID (Foreign Key)
- customer_name: TEXT
- selling_price: DECIMAL
- paid_amount: DECIMAL
- payment_type: TEXT ('cash' | 'bank_transfer' | 'installment')
- date: DATE
```

#### installments

الأقساط

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key)
- sale_id: UUID (Foreign Key)
- car_id: UUID (Foreign Key)
- total_amount: DECIMAL
- paid_amount: DECIMAL
- remaining_amount: DECIMAL (محسوب)
- status: TEXT
```

## 📖 دليل الاستخدام

### إضافة رحلة جديدة

1. انتقل إلى **الرحلات** من القائمة الجانبية
2. اضغط **إضافة رحلة جديدة**
3. ملء البيانات:
   - اسم الرحلة
   - تاريخ البداية
   - رأس المال
4. اضغط **حفظ**

### إضافة سيارة جديدة

1. انتقل إلى **السيارات**
2. اضغط **إضافة سيارة جديدة**
3. ملء البيانات المطلوبة:
   - رقم الهيكل (VIN)
   - ماركة وموديل السيارة
   - سنة الصنع
   - السعر بالدولار
   - معدل الصرف
4. ستُحسب التكاليف تلقائياً
5. اضغط **حفظ**

### تسجيل مبيعة

1. انتقل إلى **المبيعات**
2. اضغط **تسجيل مبيعة جديدة**
3. اختر السيارة
4. أدخل بيانات العميل
5. أدخل سعر البيع وطريقة الدفع
6. اضغط **حفظ**

## 🔐 الأمان

- تشفير البيانات في قاعدة البيانات
- مصادقة آمنة عبر Supabase Auth
- صلاحيات على مستوى الصفوف (RLS)
- كل مستخدم يرى فقط بياناته الخاصة

## 🎨 الألوان والأيقونات

### الألوان الأساسية

- Blue: #3b82f6 (الأساسي)
- Green: #10b981 (الإيجابي)
- Red: #ef4444 (التنبيهات)
- Orange: #f59e0b (التحذيرات)

### الأيقونات

استخدام [Lucide Icons](https://lucide.dev)

## 📝 معادلات المحاسبة

### تكلفة السيارة النهائية

```
Final Cost = (Purchase Price USD × Exchange Rate) + Shipping + Customs + Expenses
```

### الربح

```
Profit = Selling Price - Final Cost - Remaining Liabilities
```

### صافي الربح

```
Net Profit = Total Sales - Total Costs - Total Remaining Liabilities
```

### المبلغ المتبقي

```
Remaining = Total Amount - Paid Amount
```

## 🚀 الخطوات التالية

### المميزات المخطط إضافتها

- [ ] نظام الإشعارات
- [ ] سجل النشاط
- [ ] تحميل الفواتير PDF
- [ ] تحميل التقارير Excel
- [ ] نظام الأذونات المتقدم
- [ ] تحليلات متقدمة
- [ ] API عام
- [ ] تطبيق جوال

## 🐛 المشاكل والدعم

إذا واجهت أي مشاكل:

1. تحقق من أن البيانات البيئية صحيحة
2. تأكد من تشغيل قاعدة البيانات
3. افحص console للأخطاء

## 📄 الترخيص

هذا المشروع مرخص تحت MIT License

## 👨‍💻 المطور

تم تطويره بواسطة فريق التطوير المتخصص

---

**نصيحة:** احفظ نسخة احتياطية من قاعدة البيانات بانتظام! ✨
