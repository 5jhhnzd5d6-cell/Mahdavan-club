# راه‌اندازی اعلان واقعی — فایل خصوصی (روی گیت‌هاب نگذار!)

کلیدهای زیر مخصوص خودت است. این فایل و فایل SQL را فقط داخل Supabase کپی کن، به مخزن گیت‌هاب آپلود نکن.

## ۱) جدول‌ها و زمان‌بند
Supabase ← SQL Editor ← New query ← کل محتوای فایل supabase-push-setup.sql را بچسبان ← Run.

## ۲) تابع سرور
Supabase ← Edge Functions ← Deploy a new function ← Via Editor.
نام تابع دقیقاً: send-reminders
کل محتوای فایل send-reminders.ts را بچسبان. گزینهٔ «Verify JWT» را **خاموش** کن. Deploy.

## ۳) رمزها (Edge Functions ← Secrets ← Add)
VAPID_PUBLIC_KEY  = BP2dqLT_GD0aJ6DidxSGyOECS5PgYPlnHeSfZwCBYxF1nDswTrgdU3QMV0P14-vjIjnX-gM-iQcrqeqNMxO1SM8
VAPID_PRIVATE_KEY = D41CV3JHPJ-MctbqYNfu708AxW9wLmqog9FL2yrUkhE
CRON_SECRET       = e7986ed59e0f134410abc5a7ff704431b4af7737b3756730
VAPID_SUBJECT     = mailto:ایمیل-خودت@gmail.com

اگر تابع هنگام اجرا از SUPABASE_SERVICE_ROLE_KEY خطا داد، کلید secret پروژه (sb_secret_...) را هم با نام SB_SERVICE_KEY اضافه کن.

## ۴) برنامه
فایل‌های index.html و sw.js را در مخزن جایگزین کن. برنامه را از روی آیکون صفحهٔ اصلی باز کن، توی تنظیمات وارد «همگام‌سازی ابری» شو، بعد «فعال‌سازی اعلان واقعی» و «آزمایش» را بزن.
