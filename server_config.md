# بيانات المخدم الافتراضي - العنكبوت الليبي

## معلومات الاتصال

| الحقل | القيمة |
|-------|--------|
| **عنوان IP** | 102.203.201.52 |
| **المستخدم** | root |
| **كلمة المرور** | Aa@12341312 |
| **المزود** | LibyanSpider (العنكبوت الليبي) |
| **اسم المخدم** | ordermt-ly |
| **نظام التشغيل** | Ubuntu 24.04 LTS (Noble Numbat) |
| **تاريخ الإعداد** | 2026-05-05 |

## الاتصال عبر SSH

```powershell
# الدخول بدون كلمة مرور (مفتاح SSH)
ssh root@102.203.201.52
```

## موقع مفتاح SSH

| | المسار |
|-|--------|
| **المفتاح الخاص** | `C:\Users\phabd\.ssh\id_ed25519` |
| **المفتاح العام** | `C:\Users\phabd\.ssh\id_ed25519.pub` |

## مواصفات المخدم

| المواصفة | القيمة |
|---------|--------|
| **RAM** | 4096 MB |
| **vCPUs** | 2 |
| **التخزين** | 40 GB |
| **المنطقة** | RegionOne |
| **الحالة** | Active |

---

## البرامج المثبتة

| البرنامج | الإصدار | الحالة | ملاحظة |
|---------|---------|--------|--------|
| **Ubuntu** | 24.04 LTS | ✅ يعمل | نظام التشغيل |
| **Docker Engine** | 29.4.2 | ✅ يعمل | إدارة الحاويات |
| **Docker Compose** | v5.1.3 | ✅ يعمل | |
| **Coolify** | 4.0.0 | ✅ يعمل | لوحة نشر التطبيقات |
| **Traefik Proxy** | v3.6 | ✅ يعمل | Reverse Proxy + SSL |
| **n8n** | 2.19.2 | ✅ يعمل | أتمتة سير العمل |
| **PostgreSQL** | 16.13 | ✅ يعمل | قاعدة البيانات |
| **Node.js** | v24.15.0 | ✅ يعمل | عبر NVM |
| **npm** | v11.12.1 | ✅ يعمل | |
| **PM2** | 7.0.1 | ✅ يعمل | إدارة العمليات |
| **Nginx** | 1.24.0 | ✅ مثبت | معطّل (Traefik يتولى الـ Proxy) |
| **Certbot** | 5.5.0 | ✅ مثبت | احتياطي لـ Let's Encrypt |

---

## الخدمات والروابط

| الخدمة | الرابط | المنفذ | بيانات الدخول |
|--------|--------|--------|--------------|
| **Coolify Dashboard** | `http://102.203.201.52:8000` | 8000 | يُعيَّن عند أول دخول |
| **n8n** | `https://n8n.ordermt.ly` | 443/5678 | admin / Aa@12341312 |

---

## الدومين - ordermt.ly

### سجلات DNS

| النوع | المضيف | القيمة | TTL |
|-------|--------|--------|-----|
| **A** | `ordermt.ly` | `102.203.201.52` | 360 |
| **A** | `n8n` | `102.203.201.52` | 3600 |
| **NS** | `ordermt.ly` | `kianchau.ns.cloudflare.com` | 86400 |
| **NS** | `ordermt.ly` | `jean.ns.cloudflare.com` | 86400 |

### شهادات SSL

| الدومين | المُصدِر | صالحة حتى |
|---------|---------|-----------|
| `n8n.ordermt.ly` | Let's Encrypt (R13) | 2026-08-03 |

---

## ملفات Docker Compose

| الخدمة | المسار على المخدم |
|--------|-----------------|
| **n8n** | `/opt/n8n/docker-compose.yml` |
| **Coolify** | `/data/coolify/` |
| **Traefik** | `/data/coolify/proxy/` |
| **Traefik n8n config** | `/data/coolify/proxy/dynamic/n8n.yml` |

---

## n8n - بيانات قاعدة البيانات

| المتغير | القيمة |
|---------|--------|
| `DB_TYPE` | postgresdb |
| `DB_POSTGRESDB_HOST` | n8n-db |
| `DB_POSTGRESDB_DATABASE` | n8n |
| `DB_POSTGRESDB_USER` | n8n |
| `DB_POSTGRESDB_PASSWORD` | n8nDbPass2024 |
| `N8N_ENCRYPTION_KEY` | n8n-ordermt-ly-secret-2024 |

---

## أوامر مفيدة على المخدم

```bash
# حالة الخدمات
systemctl status nginx
systemctl status postgresql
systemctl status docker

# Docker
docker ps                          # عرض الحاويات الجارية
docker ps -a                       # عرض جميع الحاويات
docker logs n8n --tail=50          # سجلات n8n
docker logs coolify-proxy --tail=50 # سجلات Traefik

# n8n
cd /opt/n8n
docker compose ps          # حالة n8n
docker compose logs -f     # سجلات مباشرة
docker compose restart     # إعادة تشغيل
docker compose down        # إيقاف
docker compose up -d       # تشغيل

# PM2
pm2 list                   # عرض العمليات
pm2 logs                   # السجلات
pm2 restart all            # إعادة تشغيل الكل

# مراقبة الموارد
htop
df -h
free -h
```

---

## ملاحظات مهمة

> - Traefik يتولى الـ Reverse Proxy وإدارة SSL تلقائياً
> - Nginx مثبّت لكن معطّل (لا تعارض)
> - شهادة SSL تتجدد تلقائياً عبر Traefik + Let's Encrypt
> - n8n على شبكة Docker `coolify` (IP: 10.0.1.7) وشبكة `n8n_network`
> - مفتاح SSH مُعدّ - لا حاجة لكلمة المرور عند الاتصال

---

> **آخر تحديث:** 2026-05-05
