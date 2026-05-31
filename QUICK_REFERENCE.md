# 📖 دليل سريع للمطورين

## 🚀 البدء السريع

```bash
# 1. التثبيت
npm install

# 2. تشغيل الخادم
npm run dev

# 3. افتح
http://localhost:3000
```

## 📁 المجلدات الرئيسية

```
src/
├── app/          # الصفحات والمسارات
├── components/   # المكونات
├── lib/         # الدوال المساعدة
├── hooks/       # React Hooks
└── types/       # أنواع TypeScript
```

## 🔧 الأوامر الشائعة

```bash
npm run dev          # تشغيل التطوير
npm run build        # بناء الإنتاج
npm run start        # تشغيل الإنتاج
npm run lint         # فحص الأخطاء
npm run db:push      # دفع التغييرات للبيانات
```

## 💾 قاعدة البيانات

### إضافة جدول جديد

```sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  -- columns
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
```

### إضافة سياسة RLS

```sql
CREATE POLICY "Users can view their own data"
  ON table_name FOR SELECT
  USING (auth.uid()::text = user_id::text);
```

## 🎨 مكونات Shadcn/UI

### أمثلة الاستخدام

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function MyComponent() {
  return (
    <Card>
      <Input placeholder="أدخل البيانات" />
      <Button>حفظ</Button>
    </Card>
  );
}
```

## ✅ التحقق من البيانات

```tsx
import { z } from "zod";
import { carSchema } from "@/lib/validations/schemas";

const data = carSchema.parse(input);
```

## 🌐 API Routes

### نمط API

```tsx
// src/app/api/resource/route.ts
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // منطقك هنا
  return NextResponse.json(data);
}
```

## 📊 استخدام Recharts

```tsx
import { BarChart, Bar } from "recharts";

<BarChart data={data}>
  <Bar dataKey="value" fill="#3b82f6" />
</BarChart>;
```

## 🔐 المصادقة

```tsx
import { useAuth, signIn, signOut } from "@/hooks/use-auth";

const { user, loading } = useAuth();
```

## 🎯 تنسيق الأرقام والعملات

```tsx
import { formatCurrency, formatDate } from "@/lib/utils/format";

formatCurrency(1000, "LYD"); // 1,000.00 ليدي
formatDate(new Date()); // تاريخ عربي
```

## 🚨 رسائل الخطأ

```tsx
<div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md">
  رسالة الخطأ
</div>
```

## 📱 تجاوبية البناء

```tsx
// استخدم grid responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

## 🎨 الألوان

```css
/* المتغيرات المعرفة */
--primary: Blue --secondary: Green --destructive: Red --accent: Pink;
```

## 🔍 البحث والتصفية

```tsx
const filtered = items.filter(
  (item) =>
    item.name.includes(searchTerm) || item.description.includes(searchTerm),
);
```

## 💡 نصائح مهمة

1. **استخدم Server Components** حيث أمكن
2. **استخدم مكونات قابلة لإعادة الاستخدام**
3. **حافظ على الأنماط متسقة**
4. **اختبر على الجوال**
5. **تحقق من RLS قبل النشر**

## 🐛 تصحيح الأخطاء

```typescript
// في المتصفح
console.log("Debug value");

// في خادم
console.error("Server error");
```

## 📚 الموارد

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com)

## 🤝 المساهمة

1. أنشئ branch جديد
2. اعمل على الميزة
3. اختبر الكود
4. أرسل PR

## ✨ قالب نموذج جديد

```tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MyPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <h1>مرحباً</h1>
    </div>
  );
}
```

## 📞 الأسئلة الشائعة

**س: كيف أضيف جدول جديد؟**
ج: أنشئ جدول في Supabase وأضف سياسات RLS

**س: كيف أستخدم الصور؟**
ج: استخدم Supabase Storage

**س: كيف أطبع شيء؟**
ج: استخدم `window.print()` أو مكتبة PDF

---

**آخر تحديث:** يناير 2024
