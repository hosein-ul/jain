# راهنمای راه‌اندازی AgentMail — صفر تا صد

---

## ۱. پیش‌نیازها

قبل از شروع این حساب‌ها رو بساز (همه رایگان هستن):

| سرویس | لینک | برای چی |
|---|---|---|
| Supabase | supabase.com | دیتابیس PostgreSQL |
| Resend | resend.com | ارسال و دریافت ایمیل |
| Vercel | vercel.com | deploy پروژه |
| GitHub | github.com | ورود به Vercel |

---

## ۲. کلون و نصب

```bash
git clone https://github.com/hosein-ul/jain
cd jain
npm install
```

---

## ۳. Supabase — آماده است

پروژه Supabase قبلاً ساخته شده و همه جداول موجودند. مقادیر زیر را مستقیم در `.env` استفاده کن:

```
NEXT_PUBLIC_SUPABASE_URL=https://dugfnqgkwzfnpznxqtpm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

برای `SUPABASE_SERVICE_KEY` (اختیاری ولی توصیه‌شده):
Supabase Dashboard → **Settings → API → service_role** → کپی کن

> اگر خالی بذاری، کد از `anon key` استفاده می‌کنه.

---

## ۴. ساخت API Key در Resend

۱. به [resend.com](https://resend.com) برو → **Sign in**
۲. از منوی سمت چپ برو به **API Keys** → **Create API Key**
۳. یه اسم بده (مثلاً `agentmail`) → **Add**
۴. کلید رو کپی کن — فقط یه بار نشون داده میشه → این میشه `RESEND_API_KEY`

---

## ۶. تنظیم فایل .env

```bash
cp .env.example .env
```

فایل `.env` رو باز کن و مقادیر رو پر کن:

```env
# از Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL="https://xxxxxxxxxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_KEY="eyJ..."

# از Resend → API Keys
RESEND_API_KEY="re_..."

# بعد از deploy روی Vercel پر میشه (الان خالی بذار)
RESEND_WEBHOOK_SECRET=""

# دامنه‌ای که می‌خوای روی ایمیل‌ها استفاده بشه
EMAIL_DOMAIN="yourdomain.com"

# آدرس کامل app (بعد از Vercel deploy)
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"

# x402 (بعد از ثبت ASP روی OKX.AI فعال کن)
PAYMENT_REQUIRED="false"
PAYMENT_WALLET=""

# Webhook security
WEBHOOK_SECRET="هر رشته تصادفی مثلاً خروجی openssl rand -hex 32"
```

---

## ۷. اجرای محلی (Local)

```bash
npm run dev
```

مرورگر رو باز کن: **http://localhost:3000**

داشبورد باید بیاد بالا. اگه Supabase درست تنظیم شده باشه، می‌تونی ایجنت بسازی.

> **نکته:** بدون `RESEND_API_KEY` واقعی، ایمیل‌ها فقط در کنسول لاگ میشن — این برای تست محلی کافیه.

---

## ۸. Deploy روی Vercel

### ۸.۱ Push رو GitHub (اگه نکردی)

```bash
git add -A
git commit -m "ready to deploy"
git push origin master
```

### ۸.۲ Deploy

```bash
npm i -g vercel
vercel --prod
```

یا از [vercel.com](https://vercel.com):
۱. **Add New Project** → ریپوی `jain` رو انتخاب کن
۲. Framework: **Next.js** (خودکار تشخیص میده)
۳. **Deploy** رو بزن

بعد از deploy یه URL مثل `https://jain-xxxx.vercel.app` میگیری.

### ۸.۳ تنظیم Environment Variables در Vercel

در Vercel → پروژه‌ات → **Settings → Environment Variables**، همه مقادیر `.env` رو اضافه کن. مهم‌ترین‌ها:

| متغیر | مقدار |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL پروژه Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_KEY` | service_role key |
| `RESEND_API_KEY` | کلید Resend |
| `EMAIL_DOMAIN` | دامنه‌ات |
| `NEXT_PUBLIC_APP_URL` | URL ورسل (مثلاً `https://jain-xxxx.vercel.app`) |
| `WEBHOOK_SECRET` | یه رشته تصادفی |

بعد از اضافه کردن → **Redeploy** بزن.

---

## ۹. تنظیم Webhook در Resend (دریافت ایمیل)

اینجا جواب سوالت هست که توی داشبورد Resend باید چی بزنی:

۱. به [resend.com](https://resend.com) برو → از منوی سمت چپ **Webhooks** → **Add Webhook**
۲. در فیلد **Endpoint URL** بنویس:
   ```
   https://YOUR-VERCEL-URL/api/webhooks/inbound
   ```
   مثلاً: `https://jain-xxxx.vercel.app/api/webhooks/inbound`

   > **اگه هنوز deploy نکردی:** اول deploy کن، بعد این مرحله رو انجام بده. برای تست محلی از ngrok استفاده کن (مرحله ۱۰).

۳. در **Select events to listen**: گزینه `email.received` رو انتخاب کن
۴. روی **Add** کلیک کن
۵. بعد از ساخته شدن، روی webhook کلیک کن → **Signing Secret** رو کپی کن
۶. این مقدار رو در Vercel env vars به عنوان `RESEND_WEBHOOK_SECRET` اضافه کن → Redeploy

---

## ۱۰. تنظیم دامنه برای دریافت ایمیل واقعی

برای اینکه ایمیل واقعی به آدرس‌های ایجنت‌هات برسه، باید یه دامنه داشته باشی و MX record رو تنظیم کنی.

۱. یه دامنه بخر (namecheap, cloudflare, etc.)
۲. در Resend → **Domains** → **Add Domain** → دامنه‌ات رو وارد کن
۳. Resend یه سری DNS record بهت میده:
   - **MX record** — برای دریافت ایمیل روی Resend
   - **DKIM, SPF, DMARC** — برای تأیید هویت فرستنده
۴. این recordها رو در پنل DNS دامنه‌ات اضافه کن
۵. در Resend روی **Verify** کلیک کن (معمولاً ۵-۱۰ دقیقه طول می‌کشه)
۶. بعد از تأیید، `EMAIL_DOMAIN` رو در Vercel به دامنه‌ات تغییر بده و Redeploy کن

---

## ۱۱. تست کامل

### تست ارسال ایمیل

```bash
# ساخت ایجنت
curl -X POST https://YOUR-VERCEL-URL/api/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "test-bot"}'

# ارسال ایمیل (agentId رو از خروجی بالا بگیر)
curl -X POST https://YOUR-VERCEL-URL/api/emails/send \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "...",
    "to": "your@email.com",
    "subject": "تست AgentMail",
    "body": "ایمیل تستی از ایجنت"
  }'
```

### تست دریافت ایمیل

یه ایمیل به آدرس ایجنت بفرست (مثلاً `test-bot@yourdomain.com`). بعد از چند ثانیه در داشبورد → Agents → test-bot باید ایمیل رو ببینی.

---

## ۱۲. تست محلی webhook با ngrok

اگه می‌خوای بدون deploy ایمیل دریافت کنی:

```bash
# نصب ngrok
npm install -g ngrok

# در یه ترمینال، app رو اجرا کن
npm run dev

# در ترمینال دیگه
ngrok http 3000
```

ngrok یه URL عمومی مثل `https://xxxx.ngrok.io` بهت میده.
این URL رو در Resend webhook بذار: `https://xxxx.ngrok.io/api/webhooks/inbound`

> توجه: هر بار ngrok رو ببندی URL عوض میشه و باید دوباره webhook رو آپدیت کنی.

---

## خلاصه متغیرهای محیطی

| متغیر | اجباری | از کجا |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | بله | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | بله | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | بله | Supabase → Settings → API |
| `RESEND_API_KEY` | بله | Resend → API Keys |
| `RESEND_WEBHOOK_SECRET` | برای دریافت ایمیل | Resend → Webhooks → Signing Secret |
| `EMAIL_DOMAIN` | بله | دامنه‌ات |
| `NEXT_PUBLIC_APP_URL` | بله | URL ورسل |
| `WEBHOOK_SECRET` | توصیه‌شده | هر رشته تصادفی |
| `PAYMENT_REQUIRED` | برای OKX.AI | `"true"` بعد از ثبت ASP |
| `PAYMENT_WALLET` | برای OKX.AI | آدرس کیف پول EVM روی X Layer |
