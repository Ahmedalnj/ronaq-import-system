# 🚀 دليل النشر والتطوير

## نشر الموقع

### خيار 1: النشر على Vercel (موصى به)

#### الخطوات:

1. **نشر المستودع على GitHub**

   ```bash
   git remote add origin https://github.com/your-username/ronaq-import-system.git
   git branch -M main
   git push -u origin main
   ```

2. **ربط Vercel بـ GitHub**
   - انتقل إلى [vercel.com](https://vercel.com)
   - اضغط "New Project"
   - اختر المستودع

3. **إعدادات البيئة**
   - أضف متغيرات البيئة:
     ```
     NEXT_PUBLIC_SUPABASE_URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY
     SUPABASE_SERVICE_ROLE_KEY
     DATABASE_URL
     ```

4. **النشر**
   - اضغط "Deploy"
   - سيتم النشر تلقائياً مع كل push

### خيار 2: النشر على خادم خاص

#### المتطلبات

- Node.js 18+
- PM2 أو Docker

#### باستخدام PM2:

```bash
# تثبيت PM2
npm install -g pm2

# بناء المشروع
npm run build

# تشغيل المشروع
pm2 start npm --name "ronaq" -- start

# حفظ العملية
pm2 save
```

#### باستخدام Docker:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# بناء الصورة
docker build -t ronaq-app .

# تشغيل الحاوية
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  ronaq-app
```

## التطوير المحلي

### إعداد بيئة التطوير

```bash
# تثبيت المكتبات
npm install

# تشغيل خادم التطوير
npm run dev

# في نافذة أخرى، يمكنك تشغيل التحليل:
npm run lint
```

### أفضل الممارسات

1. **Branch Strategy**
   - استخدم `main` للإنتاج
   - استخدم `develop` للتطوير
   - أنشئ feature branches لكل ميزة جديدة

2. **Commit Messages**

   ```
   feat: أضف ميزة جديدة
   fix: أصلح خطأ
   docs: حدث التوثيق
   style: تحسينات التصميم
   refactor: إعادة هيكلة الكود
   test: أضف اختبارات
   ```

3. **Code Review**
   - اطلب review قبل الدمج
   - تأكد من اجتياز جميع الاختبارات

## التحسينات والأداء

### تحسينات SEO

```typescript
// في app/layout.tsx
export const metadata: Metadata = {
  title: "رونق - نظام إدارة الاستيراد",
  description: "نظام متكامل لإدارة استيراد السيارات",
  openGraph: {
    title: "رونق",
    description: "نظام محاسبة متقدم",
  },
};
```

### تحسينات الأداء

- استخدم Server Components حيث أمكن
- lazy load الصور والمكونات الثقيلة
- استخدم caching مناسب
- قلل حجم Bundle

### مراقبة الأداء

```bash
# تحليل حجم Bundle
npm run analyze

# اختبار الأداء
npm run performance-test
```

## قاعدة البيانات

### النسخ الاحتياطية

#### يدوية

```bash
# تصدير البيانات
pg_dump -h [host] -U [user] -d [database] > backup.sql

# استيراد البيانات
psql -h [host] -U [user] -d [database] < backup.sql
```

#### تلقائية

استخدم Supabase Backups (في Supabase Dashboard)

### إدارة التهجير

```bash
# إضافة تهجير جديد
npx prisma migrate dev --name [migration_name]

# تطبيق الهجرة
npx prisma migrate deploy
```

## الأمان

### متطلبات الأمان

1. **HTTPS فقط** في الإنتاج
2. **CORS Configuration**
3. **Rate Limiting** على API
4. **Input Validation** على جميع الإدخالات
5. **SQL Injection Prevention** (استخدم Parameterized Queries)

### متغيرات البيئة

- لا تضع سرية البيانات في الكود
- استخدم ملفات `.env.local`
- أضف `.env.local` إلى `.gitignore`

### RLS (Row Level Security)

تأكد من تفعيل RLS على جميع الجداول:

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

## الاختبار

### اختبارات الوحدة

```bash
npm run test

# مع coverage
npm run test:coverage
```

### اختبارات التكامل

```bash
npm run test:e2e
```

## المراقبة والسجلات

### تصحيح الأخطاء

```typescript
// استخدم console في التطوير
console.log("Debug info");

// في الإنتاج، استخدم خدمة logging
import { logger } from "@/lib/logger";
logger.error("Error message");
```

### خدمات المراقبة الموصى بها

- Sentry للأخطاء
- LogRocket للجلسات
- New Relic للأداء

## الدعم والتواصل

### المشاكل الشائعة

**المشكلة:** لا يمكن الاتصال بقاعدة البيانات

- تحقق من متغيرات البيئة
- تحقق من حالة Supabase
- تحقق من الاتصال بالإنترنت

**المشكلة:** خطأ في المصادقة

- امسح cookies
- تحقق من Supabase Auth Settings
- تحقق من سياسات CORS

**المشكلة:** الأداء بطيء

- تحقق من حجم Bundle
- استخدم DevTools
- فعّل Caching

---

**آخر تحديث:** 2024-03-01
