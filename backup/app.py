"""
نظام إدارة الدخول - ZKTeco SenseFace 2A
=========================================
بناء كامل بلغة Python - Flask
الدروس المستفادة:
- صيغة الأمر الصحيحة: DATA UPDATE userinfo مع Tab كفاصل
- صيغة الحذف: DATA DELETE userinfo
- TZ=0000000000000000 (16 صفر)
- C:0:CHECK يجبر الجهاز على handshake جديد
- GET USERINFO يجب أن يكون في رد options=all مباشرة
- استخدام waitress بدلاً من Flask dev server
- RLock بدلاً من Lock لتجنب Deadlock
- SSE للتحديث اللحظي في المتصفح
"""

import sys, io, os, json, threading, queue
from collections import deque
from datetime import datetime
from time import time
from functools import wraps

# إصلاح ترميز الطرفية على Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from flask import Flask, request, jsonify, Response, render_template, stream_with_context, session, redirect, url_for

app = Flask(__name__, template_folder='templates')
app.secret_key = 'super_secret_attendance_key_123!@#'

# ===================================================
# الإعدادات
# ===================================================
ADMS_PORT  = 8081   # منفذ ADMS - الجهاز يرسل هنا
DATA_DIR   = os.path.dirname(os.path.abspath(__file__))
LOGS_FILE  = os.path.join(DATA_DIR, 'data_logs.json')
USERS_FILE = os.path.join(DATA_DIR, 'data_users.json')
SETTINGS_FILE = os.path.join(DATA_DIR, 'data_settings.json')

# ===================================================
# الحالة العامة (في الذاكرة)
# ===================================================
attendance_logs = []   # سجلات الحضور - قائمة من dict
users = {}             # المستخدمون - dict مفهرس بـ PIN
settings = {'rules': []} # قواعد وإعدادات الراتب
command_queue = deque()  # الأوامر المنتظرة للجهاز
event_clients = []       # SSE clients (متصفحات مفتوحة)

logs_lock    = threading.RLock()
users_lock   = threading.RLock()
settings_lock= threading.RLock()
queue_lock   = threading.RLock()
clients_lock = threading.Lock()
device_info  = {'sn': None, 'connected': False, 'last_seen': None,
                'model': 'SenseFace 2A', 'user_count': 0, 'log_count': 0}
command_id   = [1]


# ===================================================
# الإشعارات اللحظية (SSE)
# ===================================================
def broadcast(event: str, data: dict):
    """إرسال حدث SSE لكل المتصفحات المتصلة"""
    msg = f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
    with clients_lock:
        dead = [q for q in event_clients if not _try_put(q, msg)]
        for q in dead:
            event_clients.remove(q)

def _try_put(q, msg):
    try:
        q.put_nowait(msg)
        return True
    except:
        return False


# ===================================================
# الحفظ والتحميل
# ===================================================
def save_logs():
    try:
        with logs_lock:
            data = attendance_logs[:2000]
        with open(LOGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log_msg(f"[خطأ] فشل حفظ السجلات: {e}")

def save_users():
    try:
        with users_lock:
            data = list(users.values())
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log_msg(f"[خطأ] فشل حفظ المستخدمين: {e}")

def load_data():
    global attendance_logs
    if os.path.exists(LOGS_FILE):
        try:
            with open(LOGS_FILE, 'r', encoding='utf-8') as f:
                attendance_logs = json.load(f)
            log_msg(f"[تحميل] {len(attendance_logs)} سجل حضور")
        except:
            attendance_logs = []
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                for u in json.load(f):
                    users[u['Pin']] = u
            log_msg(f"[تحميل] {len(users)} مستخدم")
        except:
            pass
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                settings.update(json.load(f))
                if 'rules' not in settings:
                    settings['rules'] = []
            log_msg("[تحميل] تم تحميل إعدادات النظام")
        except:
            pass

    if 'roles' not in settings:
        settings['roles'] = {
            "0": ["view_own_profile"],
            "6": ["view_logs", "view_reports", "view_users", "manage_logs", "manage_users"],
            "14": ["view_logs", "view_reports", "view_users", "manage_logs", "manage_users", "manage_settings", "manage_device", "manage_roles"]
        }

def save_settings():
    try:
        with settings_lock:
            with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(settings, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log_msg(f"[خطأ] فشل حفظ الإعدادات: {e}")

def log_msg(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

# ===================================================
# حماية المسارات (Login Required)
# ===================================================
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.path.startswith('/api/'):
                return jsonify({'success': False, 'error': 'غير مصرح'}), 401
            return redirect(url_for('route_login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'غير مصرح'}), 401
        role = session.get('user_role', 0)
        if role < 6: # 0 = Normal, 6 = Supervisor, 14 = Admin
            return jsonify({'success': False, 'error': 'صلاحيات غير كافية'}), 403
        return f(*args, **kwargs)
    return decorated_function

# ===================================================
# مسارات تسجيل الدخول
# ===================================================
@app.route('/login')
def route_login():
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/api/auth/login', methods=['POST'])
def api_auth_login():
    data = request.json or {}
    pin = str(data.get('pin', '')).strip()
    pwd = str(data.get('password', '')).strip()

    if not pin:
        return jsonify({'success': False, 'error': 'رقم الموظف مطلوب'}), 400

    with users_lock:
        user = users.get(pin)
        if not user:
            return jsonify({'success': False, 'error': 'رقم الموظف غير صحيح'}), 401
        
        stored_pwd = user.get('Password', '').strip()
        if not stored_pwd:
            if not pwd:
                return jsonify({'success': False, 'error': 'أنت لم تعين كلمة مرور بعد، يرجى كتابة كلمة مرور جديدة لحفظها واستخدامها دائماً'}), 401
            # تعيين كلمة المرور الجديدة
            user['Password'] = pwd
            save_users()
            log_msg(f"[تحديث] تم تعيين كلمة مرور جديدة للمستخدم {pin}")
        elif pwd != stored_pwd:
            return jsonify({'success': False, 'error': 'كلمة المرور غير صحيحة'}), 401
            
        session['user_id'] = user['Pin']
        session['user_name'] = user['Name']
        session['user_role'] = int(user.get('Role', 0))
        
        log_msg(f"[دخول] سجل {user['Name']} الدخول للنظام")
        return jsonify({'success': True})

@app.route('/api/auth/logout', methods=['POST'])
def api_auth_logout():
    session.clear()
    return jsonify({'success': True})

# ===================================================
# قائمة أوامر الجهاز
# ===================================================
def enqueue(cmd: str):
    """إضافة أمر لإرساله للجهاز في الـ heartbeat التالي"""
    with queue_lock:
        command_queue.append(cmd)
    log_msg(f"[أمر] {cmd.strip()}")


# ===================================================
# معالجة بيانات الجهاز
# ===================================================
def ensure_user_from_log(user_id: str):
    """إنشاء مستخدم تلقائي إذا وُجد في ATTLOG ولم يُعرَّف بعد"""
    with users_lock:
        if user_id not in users:
            users[user_id] = {
                'Pin': user_id,
                'Name': f'مستخدم {user_id}',
                'Role': 0,
                'Password': ''
            }
    save_users()
    with users_lock:
        device_info['user_count'] = len(users)


def process_attlog(body: str):
    """تحليل بيانات ATTLOG القادمة من الجهاز"""
    new_records = []
    for line in body.strip().split('\n'):
        line = line.strip('\r\n ')
        if not line:
            continue
        # تجاهل سطور الإعداد
        if '=' in line and '\t' not in line and len(line.split()) < 3:
            continue
        parts = line.split()
        if len(parts) < 3:
            continue
        try:
            uid       = parts[0]
            timestamp = f"{parts[1]} {parts[2]}"
            verify    = int(parts[4]) if len(parts) >= 5 else 0

            with logs_lock:
                # تجنب التكرار (فحص آخر 100 سجل)
                is_dup = any(
                    r['UserId'] == uid and r['Timestamp'] == timestamp
                    for r in attendance_logs[:100]
                )
                if not is_dup:
                    rec = {
                        'UserId':       uid,
                        'Timestamp':    timestamp,
                        'VerifyMethod': verify,
                        'ReceivedAt':   datetime.now().isoformat()
                    }
                    attendance_logs.insert(0, rec)
                    if len(attendance_logs) > 2000:
                        attendance_logs.pop()
                    new_records.append(rec)
                    device_info['log_count'] = len(attendance_logs)

            ensure_user_from_log(uid)
            log_msg(f"[ATTLOG] {uid} - {timestamp}")

        except Exception as e:
            log_msg(f"[خطأ] تحليل ATTLOG: {e}")

    if new_records:
        save_logs()
        # إشعار المتصفحات بالسجل الجديد
        broadcast('new_log', new_records[0])


def process_users(body: str):
    """تحليل بيانات USER القادمة من الجهاز"""
    count = 0
    for line in body.strip().split('\n'):
        line = line.strip('\r\n ')
        if not line.startswith('USER'):
            continue
        try:
            fields = {}
            sep = '\t' if '\t' in line else ' '
            for part in line.split(sep):
                if '=' in part:
                    k, _, v = part.partition('=')
                    fields[k.strip()] = v.strip()
            pin = fields.get('PIN', '')
            if not pin:
                continue
            record = {
                'Pin':      pin,
                'Name':     fields.get('Name', f'مستخدم {pin}'),
                'Role':     int(fields.get('Pri', 0) or 0),
                'Password': fields.get('Passwd', '')
            }
            with users_lock:
                users[pin] = record
            count += 1
            log_msg(f"[مستخدم] PIN={pin} Name={record['Name']}")
        except Exception as e:
            log_msg(f"[خطأ] تحليل USER: {e}")

    if count:
        save_users()
        with users_lock:
            device_info['user_count'] = len(users)
        broadcast('users_updated', {'count': len(users)})


# ===================================================
# مسارات ADMS (الجهاز → السيرفر)
# ===================================================

@app.route('/iclock/cdata', methods=['GET', 'POST'])
def iclock_cdata():
    sn      = request.args.get('SN', '')
    table   = request.args.get('table', '')
    options = request.args.get('options', '')

    # تحديث معلومات الجهاز
    if sn:
        was_connected = device_info['connected']
        device_info['sn']        = sn
        device_info['connected'] = True
        device_info['last_seen'] = datetime.now().isoformat()
        if not was_connected:
            log_msg(f"[جهاز] متصل: {sn}")
            broadcast('device_status', {'connected': True, 'sn': sn})

    # ===== Handshake الأولي =====
    if request.method == 'GET' and options == 'all':
        log_msg(f"[ADMS] Handshake → طلب ATTLOG + USERINFO")
        log_msg(f"[DEBUG-HEADERS] {dict(request.headers)}")
        log_msg(f"[DEBUG-ARGS] {dict(request.args)}")
        # الصيغة الصحيحة: كل أمر في سطر منفصل
        return Response(
            "GET ATTLOG Stamp=0\nGET USERINFO\n",
            content_type='text/plain'
        )

    # ===== البيانات المدفوعة من الجهاز =====
    if request.method == 'POST':
        body = request.get_data(as_text=True)
        log_msg(f"[ADMS] POST table={table} ({len(body)} bytes)")

        if table == 'ATTLOG':
            process_attlog(body)
            return Response("OK\n", content_type='text/plain')

        elif table == 'USER':
            process_users(body)
            return Response("OK\n", content_type='text/plain')

        elif table == 'options':
            # معلومات الجهاز - نستخرج عدد المستخدمين
            try:
                for part in body.split(','):
                    if 'UserCount=' in part:
                        device_info['user_count'] = int(part.split('=')[1])
                    if 'DeviceName=' in part:
                        device_info['model'] = part.split('=')[1].strip('~')
                log_msg(f"[معلومات] {body[:150]}")
            except:
                pass
            return Response("OK\n", content_type='text/plain')

    return Response("OK\n", content_type='text/plain')


@app.route('/iclock/getrequest', methods=['GET'])
def iclock_getrequest():
    """نبضة القلب - يُرسَل كل 30 ثانية تقريباً"""
    sn = request.args.get('SN', '')
    if sn:
        device_info['sn']        = sn
        device_info['connected'] = True
        device_info['last_seen'] = datetime.now().isoformat()

    with queue_lock:
        if command_queue:
            cmd = command_queue.popleft()
            log_msg(f"[→جهاز] {cmd.strip()}")
            return Response(cmd, content_type='text/plain')

    return Response("OK\n", content_type='text/plain')


@app.route('/iclock/devicecmd', methods=['GET', 'POST'])
def iclock_devicecmd():
    """استجابة الجهاز للأوامر"""
    body = request.get_data(as_text=True)
    log_msg(f"[جهاز→] {body[:120]}")
    # إذا أرسل الجهاز بيانات مستخدمين أو سجلات ضمن الاستجابة
    if 'USER' in body:
        process_users(body)
    elif '\t' in body and len(body) > 20:
        process_attlog(body)
    return Response("OK\n", content_type='text/plain')


@app.route('/iclock/deviceinfo', methods=['POST'])
@app.route('/iclock/ping',       methods=['GET', 'POST'])
def iclock_misc():
    return Response("OK\n", content_type='text/plain')


# ===================================================
# مسارات API (المتصفح → السيرفر)
# ===================================================

@app.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin']  = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response


@app.route('/api/logs')
def api_logs():
    with logs_lock:
        return jsonify({'success': True, 'data': attendance_logs[:2000]})

@app.route('/api/logs/manual', methods=['POST'])
@admin_required
def api_add_manual_log():
    data = request.json or {}
    pin = str(data.get('userid', '')).strip()
    timestamp = str(data.get('timestamp', '')).strip() # format: YYYY-MM-DD HH:MM:SS
    if not pin or not timestamp:
        return jsonify({'success': False, 'error': 'بيانات غير مكتملة'}), 400
    
    with logs_lock:
        # تأكد من عدم وجود بصمة مطابقة تماماً
        exists = any(r['UserId'] == pin and r['Timestamp'] == timestamp for r in attendance_logs)
        if exists:
            return jsonify({'success': False, 'error': 'يوجد بصمة مسجلة مسبقاً في هذا الوقت'}), 400
        
        attendance_logs.append({'UserId': pin, 'Timestamp': timestamp})
        # إعادة ترتيب البصمات لأن الإضافة اليدوية قد تكون في الماضي
        attendance_logs.sort(key=lambda x: x['Timestamp'], reverse=True)
    
    save_logs()
    with logs_lock:
        device_info['log_count'] = len(attendance_logs)
    broadcast('logs_updated', {'count': len(attendance_logs)})
    log_msg(f"[تعديل] إضافة بصمة يدوية للموظف {pin} بوقت {timestamp}")
    return jsonify({'success': True, 'message': 'تم إضافة البصمة اليدوية بنجاح'})

@app.route('/api/logs/manual', methods=['PUT'])
@admin_required
def api_edit_manual_log():
    data = request.json or {}
    pin = str(data.get('userid', '')).strip()
    old_timestamp = str(data.get('old_timestamp', '')).strip()
    new_timestamp = str(data.get('new_timestamp', '')).strip()
    
    if not pin or not old_timestamp or not new_timestamp:
        return jsonify({'success': False, 'error': 'بيانات غير مكتملة'}), 400
        
    updated = False
    with logs_lock:
        for log in attendance_logs:
            if log['UserId'] == pin and log['Timestamp'] == old_timestamp:
                log['Timestamp'] = new_timestamp
                updated = True
                break
        if updated:
            attendance_logs.sort(key=lambda x: x['Timestamp'], reverse=True)
            
    if not updated:
        return jsonify({'success': False, 'error': 'لم يتم العثور على البصمة المطلوبة للتعديل'}), 404
        
    save_logs()
    broadcast('logs_updated', {'count': len(attendance_logs)})
    log_msg(f"[تعديل] تعديل بصمة الموظف {pin} من {old_timestamp} إلى {new_timestamp}")
    return jsonify({'success': True, 'message': 'تم تعديل البصمة بنجاح'})

@app.route('/api/logs/manual', methods=['DELETE'])
@admin_required
def api_delete_manual_log():
    pin = request.args.get('userid', '').strip()
    timestamp = request.args.get('timestamp', '').strip()
    
    if not pin or not timestamp:
        return jsonify({'success': False, 'error': 'بيانات غير مكتملة'}), 400
        
    deleted = False
    with logs_lock:
        original_len = len(attendance_logs)
        attendance_logs[:] = [log for log in attendance_logs if not (log['UserId'] == pin and log['Timestamp'] == timestamp)]
        if len(attendance_logs) < original_len:
            deleted = True
            
    if not deleted:
        return jsonify({'success': False, 'error': 'لم يتم العثور على البصمة للحذف'}), 404
        
    save_logs()
    with logs_lock:
        device_info['log_count'] = len(attendance_logs)
    broadcast('logs_updated', {'count': len(attendance_logs)})
    log_msg(f"[تعديل] حذف بصمة للموظف {pin} بوقت {timestamp}")
    return jsonify({'success': True, 'message': 'تم حذف البصمة بنجاح'})


@app.route('/api/users')
def api_users():
    # نعيد القائمة المحلية مباشرة - الجهاز لا يدعم إرسال بيانات المستخدمين عبر ADMS
    with users_lock:
        return jsonify({'success': True, 'data': list(users.values())})


@app.route('/api/user', methods=['POST', 'OPTIONS'])
def api_add_user():
    if request.method == 'OPTIONS':
        return Response('', status=200)

    data = request.json or {}
    pin  = str(data.get('userid', '')).strip()
    name = str(data.get('name', '')).strip()
    role = int(data.get('role', 0) or 0)
    pwd  = str(data.get('password', '') or '').strip()
    hourly_rate = float(data.get('hourly_rate', 0.0) or 0.0)

    if not pin or not name:
        return jsonify({'success': False, 'error': 'PIN والاسم مطلوبان'}), 400

    # الصيغة الصحيحة المُختبرة: DATA UPDATE userinfo مع Tab
    cid = int(time() * 1000)
    cmd = (f"C:{cid}:DATA UPDATE userinfo "
           f"PIN={pin}\tName={name}\tPri={role}\t"
           f"Passwd={pwd}\tCard=\tGrp=1\t"
           f"TZ=0000000000000000\tVerify=0\n")
    enqueue(cmd)

    # حفظ فوري محلياً
    with users_lock:
        users[pin] = {'Pin': pin, 'Name': name, 'Role': role, 'Password': pwd, 'HourlyRate': hourly_rate}
        device_info['user_count'] = len(users)
    save_users()
    broadcast('users_updated', {'count': len(users)})

    return jsonify({'success': True,
                    'message': f'تم إرسال الأمر - سيظهر {name} في الجهاز خلال ثوانٍ'})


@app.route('/api/user/local', methods=['POST'])
def api_local_user():
    """حفظ مستخدم موجود في الجهاز في النظام المحلي فقط (بدون إرسال أمر)"""
    data = request.json or {}
    pin  = str(data.get('userid', '')).strip()
    name = str(data.get('name', '')).strip()
    role = int(data.get('role', 0) or 0)
    pwd  = str(data.get('password', '') or '').strip()
    hourly_rate = float(data.get('hourly_rate', 0.0) or 0.0)
    if not pin or not name:
        return jsonify({'success': False, 'error': 'PIN والاسم مطلوبان'}), 400
    with users_lock:
        users[pin] = {'Pin': pin, 'Name': name, 'Role': role, 'Password': pwd, 'HourlyRate': hourly_rate}
        device_info['user_count'] = len(users)
    save_users()
    broadcast('users_updated', {'count': len(users)})
    log_msg(f"[استيراد] PIN={pin} Name={name} (بدون إرسال للجهاز)")
    return jsonify({'success': True, 'message': f'تم حفظ {name} في النظام'})


@app.route('/api/user', methods=['DELETE'])
def api_delete_user():
    userid = request.args.get('userid', '').strip()
    if not userid:
        return jsonify({'success': False, 'error': 'userid مطلوب'}), 400

    # الصيغة الصحيحة المُختبرة: DATA DELETE userinfo
    cid = int(time() * 1000)
    enqueue(f"C:{cid}:DATA DELETE userinfo PIN={userid}\n")

    # حذف فوري محلياً
    with users_lock:
        users.pop(userid, None)
        device_info['user_count'] = len(users)
    save_users()
    log_msg(f"[مستخدم] حذف الموظف: PIN={userid}")
    return jsonify({'success': True, 'message': 'تم حذف المستخدم من النظام وسيتم حذفه من الجهاز'})

@app.route('/api/user/rate', methods=['POST'])
@admin_required
def api_update_rate():
    data = request.json or {}
    pin = str(data.get('userid', '')).strip()
    rate = float(data.get('hourly_rate', 0.0) or 0.0)
    
    if not pin:
        return jsonify({'success': False, 'error': 'PIN مطلوب'}), 400
        
    with users_lock:
        if pin not in users:
            return jsonify({'success': False, 'error': 'المستخدم غير موجود'}), 404
        users[pin]['HourlyRate'] = rate
    save_users()
    broadcast('users_updated', {'count': len(users)})
    return jsonify({'success': True, 'message': 'تم تحديث أجر الساعة بنجاح'})

@app.route('/api/settings/roles', methods=['GET', 'POST'])
@admin_required
def api_roles():
    if request.method == 'POST':
        data = request.json
        if data and isinstance(data, dict):
            with settings_lock:
                settings['roles'] = data
            save_settings()
            log_msg("[إعدادات] تم تحديث الصلاحيات")
            return jsonify({'success': True})
        return jsonify({'success': False, 'error': 'بيانات غير صحيحة'}), 400
    
    with settings_lock:
        return jsonify({'success': True, 'data': settings.get('roles', {})})

@app.route('/api/settings', methods=['GET'])
@login_required
def api_get_settings():
    with settings_lock:
        return jsonify({'success': True, 'data': settings})

@app.route('/api/settings', methods=['POST'])
@admin_required
def api_save_settings():
    data = request.json or {}
    with settings_lock:
        settings['rules'] = data.get('rules', [])
    save_settings()
    log_msg("[إعدادات] تم حفظ قواعد الأجور")
    return jsonify({'success': True, 'message': 'تم حفظ الإعدادات بنجاح'})

@app.route('/api/status')
def api_status():
    with users_lock: uc = len(users)
    with logs_lock:  lc = len(attendance_logs)
    return jsonify({
        'success':      True,
        'device':       device_info['sn'] or 'غير متصل',
        'connected':    device_info['connected'],
        'model':        device_info['model'],
        'last_seen':    device_info['last_seen'],
        'logs_count':   lc,
        'users_count':  uc,
        'pending_cmds': len(command_queue)
    })


# ===================================================
# SSE - التحديث اللحظي
# ===================================================

@app.route('/events')
@login_required
def sse_events():
    def stream():
        q = queue.Queue(maxsize=50)
        with clients_lock:
            event_clients.append(q)
        try:
            # إرسال البيانات الأولية فور الاتصال
            with logs_lock:  recent_logs = attendance_logs[:20]
            with users_lock: user_list   = list(users.values())
            init = {
                'device':    device_info['sn'],
                'connected': device_info['connected'],
                'logs':      recent_logs,
                'users':     user_list
            }
            yield f"event: init\ndata: {json.dumps(init, ensure_ascii=False)}\n\n"

            while True:
                try:
                    msg = q.get(timeout=25)
                    yield msg
                except queue.Empty:
                    yield "event: ping\ndata: {}\n\n"
        finally:
            with clients_lock:
                if q in event_clients:
                    event_clients.remove(q)

    return Response(
        stream_with_context(stream()),
        content_type='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'}
    )


# ===================================================
# الواجهة الرئيسية
# ===================================================

@app.route('/')
@login_required
def index():
    role_str = str(session.get('user_role', 0))
    user_perms = settings.get('roles', {}).get(role_str, [])
    
    if not user_perms:
        if role_str == '14':
            user_perms = ["view_own_profile", "view_logs", "manage_logs", "view_reports", "view_users", "manage_users", "manage_settings", "manage_device", "manage_roles"]
        elif role_str == '6':
            user_perms = ["view_own_profile", "view_logs", "manage_logs", "view_reports", "view_users", "manage_users"]
        else:
            user_perms = ["view_own_profile"]

    import json
    return render_template('index.html', 
                           user_id=session.get('user_id'), 
                           user_name=session.get('user_name'), 
                           user_role=session.get('user_role', 0),
                           user_permissions=json.dumps(user_perms))


# ===================================================
# نقطة الدخول
# ===================================================

if __name__ == '__main__':
    print("=" * 55, flush=True)
    print("  نظام إدارة الدخول - ZKTeco SenseFace 2A", flush=True)
    print("=" * 55, flush=True)

    load_data()

    with users_lock: device_info['user_count'] = len(users)
    with logs_lock:  device_info['log_count']  = len(attendance_logs)

    print(f"[*] افتح المتصفح: http://localhost:{ADMS_PORT}", flush=True)
    print(f"[*] الجهاز يرسل على: http://0.0.0.0:{ADMS_PORT}", flush=True)
    print("=" * 55, flush=True)

    try:
        from waitress import serve
        serve(app, host='0.0.0.0', port=ADMS_PORT,
              threads=8, channel_timeout=30, cleanup_interval=10)
    except ImportError:
        print("[!] pip install waitress للاستقرار", flush=True)
        app.run(host='0.0.0.0', port=ADMS_PORT, debug=False, threaded=True)
