import sys, io
if sys.stdout is not None:
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except AttributeError:
        pass

from flask import Flask, Response, request, stream_with_context, session, jsonify, redirect, url_for
from flask_cors import CORS
from datetime import datetime
import json

from utils.database import init_db, get_all_users, get_recent_logs, get_user_logs, get_setting, get_extra_tasks_for_user, check_device_subscription, update_device_info, log_system_event
from utils.events import broadcast, event_clients, clients_lock, log_msg
from utils.adms import process_attlog, process_users, get_next_command, queue_lock
import threading

import os
if getattr(sys, 'frozen', False):
    template_dir = os.path.join(sys._MEIPASS, 'templates')
    static_dir = os.path.join(sys._MEIPASS, 'static')
    app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
else:
    app = Flask(__name__)

CORS(app, supports_credentials=True)

try:
    init_db()
except Exception as e:
    print(f"Error initializing DB on startup: {e}", flush=True)

from routes.api_auth import api_auth_bp
from routes.api_device import api_device_bp
from routes.api_logs import api_logs_bp
from routes.api_settings import api_settings_bp
from routes.api_users import api_users_bp
from routes.api_employee import api_employee_bp
from routes.api_superadmin import api_superadmin_bp

app.register_blueprint(api_auth_bp, url_prefix='/api/auth')
app.register_blueprint(api_device_bp, url_prefix='/api/device')
app.register_blueprint(api_logs_bp, url_prefix='/api/logs')
app.register_blueprint(api_settings_bp, url_prefix='/api/settings')
app.register_blueprint(api_users_bp, url_prefix='/api/users')
app.register_blueprint(api_employee_bp, url_prefix='/api/employee')
app.register_blueprint(api_superadmin_bp, url_prefix='/api/superadmin')

# مفتاح سري للجلسات (يفضل تغييره من متغيرات البيئة في الإنتاج)
app.secret_key = os.environ.get('SECRET_KEY')
if not app.secret_key:
    print("WARNING: SECRET_KEY environment variable not set. Using insecure default for development only.", flush=True)
    app.secret_key = 'dev-insecure-key-do-not-use-in-production'

# ===================================================
# مسارات ADMS الأساسية - Multi-Tenant
# ===================================================
@app.route('/iclock/cdata', methods=['GET', 'POST'])
def iclock_cdata():
    sn      = request.args.get('SN', request.args.get('sn', ''))
    table   = request.args.get('table', '')
    options = request.args.get('options', '')

    customer_id = check_device_subscription(sn)
    if not customer_id:
        log_msg(f"[مرفوض] جهاز غير مصرح أو اشتراكه منتهي: {sn}")
        return Response("UNKNOWN DEVICE OR EXPIRED SUBSCRIPTION\n", status=403, content_type='text/plain')

    if request.method == 'GET' and options == 'all':
        log_system_event(customer_id, 'INFO', f"بدء المصافحة (Handshake) للجهاز {sn}", sn)
        return Response("GET ATTLOG Stamp=0\nGET USERINFO\n", content_type='text/plain')

    if request.method == 'POST':
        body = request.get_data(as_text=True)
        try:
            if table == 'ATTLOG':
                success = process_attlog(customer_id, body, sn)
                if not success:
                    log_system_event(customer_id, 'WARNING', f"فشل في معالجة بعض سجلات الجهاز {sn} - سيتم طلب الإعادة", sn)
                    return Response("ERROR\n", content_type='text/plain') # سيقوم الجهاز بالإعادة
            elif table == 'USER':
                process_users(customer_id, body, sn)
            elif table == 'options':
                # معالجة معلومات الجهاز
                model = None
                user_count = None
                for part in body.split(','):
                    if 'UserCount=' in part:
                        user_count = int(part.split('=')[1])
                    if 'DeviceName=' in part:
                        model = part.split('=')[1].strip('~')
                update_device_info(sn, model=model, user_count=user_count)
            
            # إشارة التأكيد (الإشارة الوحيدة المسموح بها لضمان وصول البيانات)
            return Response("OK\n", content_type='text/plain')
        except Exception as e:
            log_system_event(customer_id, 'ERROR', f"خطأ غير متوقع أثناء معالجة بيانات {sn}: {e}", sn)
            return Response("ERROR\n", content_type='text/plain')

    return Response("OK\n", content_type='text/plain')

@app.route('/iclock/getrequest', methods=['GET'])
def iclock_getrequest():
    sn = request.args.get('SN', request.args.get('sn', ''))
    customer_id = check_device_subscription(sn)
    if not customer_id:
        return Response("UNKNOWN DEVICE\n", status=403, content_type='text/plain')

    # تم إلغاء إرسال الأوامر بناءً على طلب المستخدم (سياسة الاستقبال فقط)
    # نكتفي بإرسال OK للحفاظ على الاتصال
    return Response("OK\n", content_type='text/plain')

@app.route('/iclock/devicecmd', methods=['GET', 'POST'])
def iclock_devicecmd():
    sn = request.args.get('SN', request.args.get('sn', ''))
    customer_id = check_device_subscription(sn)
    if not customer_id:
        return Response("UNKNOWN DEVICE\n", status=403, content_type='text/plain')

    body = request.get_data(as_text=True)
    if 'USER' in body:
        process_users(customer_id, body, sn)
    elif '\t' in body and len(body) > 20:
        process_attlog(customer_id, body, sn)
    return Response("OK\n", content_type='text/plain')

@app.route('/iclock/deviceinfo', methods=['POST'])
@app.route('/iclock/ping',       methods=['GET', 'POST'])
def iclock_misc():
    sn = request.args.get('SN', request.args.get('sn', ''))
    customer_id = check_device_subscription(sn)
    if not customer_id:
        return Response("UNKNOWN DEVICE\n", status=403, content_type='text/plain')
    return Response("OK\n", content_type='text/plain')

# ===================================================
# مسارات الواجهة الأمامية للموظفين (إن وجدت)
# ===================================================
@app.route('/')
def home():
    return "Attendance SaaS Backend is running."

if __name__ == '__main__':
    # تشغيل السيرفر محلياً للتطوير
    app.run(host='0.0.0.0', port=8081, debug=True)
