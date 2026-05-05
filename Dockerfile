# المرحلة الأولى: بناء واجهة React
FROM node:20-slim AS frontend-builder
WORKDIR /web
COPY web/package*.json ./
RUN npm install
COPY web/ .
RUN npm run build

# المرحلة الثانية: بناء بيئة بايثون و Nginx
FROM python:3.12-slim
WORKDIR /app

# تثبيت Nginx و Supervisor
RUN apt-get update && apt-get install -y nginx supervisor libpq-dev gcc && rm -rf /var/lib/apt/lists/*

# تثبيت مكتبات بايثون
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# نقل كود الـ Backend
COPY . .

# نقل ملفات واجهة React إلى مسار Nginx
RUN rm -rf /var/www/html/*
COPY --from=frontend-builder /web/dist /var/www/html

# نقل ملفات الإعدادات
COPY deployment/nginx.conf /etc/nginx/sites-available/default
COPY deployment/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# كشف المنفذ 80 (الذي سيتم ربطه مع Traefik في Coolify)
EXPOSE 80

# بدء تشغيل Supervisor الذي سيشغل Nginx و Gunicorn
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
