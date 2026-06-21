# ZKTeco Attendance Management System

نظام إدارة حضور وانصراف متعدد الجهات (SaaS) يتكامل مع أجهزة البصمة ZKTeco.

## المكونات

- **Backend**: Flask 3.x API + PostgreSQL
- **Frontend**: React 19 + Vite 8 + Ant Design
- **Desktop App**: CustomTkinter GUI (Windows)
- **Device Protocol**: ZKTeco ADMS عبر HTTP

## متطلبات التشغيل

- Python 3.12+
- PostgreSQL
- Node.js 20+ (للبناء)

## الإعداد والتشغيل

### 1. متغيرات البيئة

انسخ `.env.example` إلى `.env` وعبّئ القيم المطلوبة:

```bash
cp .env.example .env
```

المتغيرات المطلوبة:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - اتصال PostgreSQL
- `SECRET_KEY` - مفتاح تشفير Flask (يجب أن يكون قيمة عشوائية قوية)
- `SUPER_ADMIN_TOKEN` - توكن الدخول للوحة التحكم المركزية

### 2. تشغيل Backend

```bash
pip install -r requirements.txt
python app.py
```

### 3. بناء Frontend

```bash
cd web
npm install
npm run dev    # للتطوير
npm run build  # للإنتاج
```

### 4. النشر عبر Docker

```bash
docker build -t zkteco-attendance .
docker run -p 80:80 -e DB_HOST=... -e DB_PASSWORD=... zkteco-attendance
```

## النشر على السيرفر

النظام يُنشر عبر Docker + Nginx + Gunicorn على منصة Coolify.

## License

جميع الحقوق محفوظة.
