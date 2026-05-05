import sys, io
if sys.stdout is not None:
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except AttributeError:
        pass

from flask import Flask, Response, request, stream_with_context, session, render_template, jsonify, redirect, url_for
from flask_cors import CORS
from datetime import datetime
import json

from utils.database import init_db, device_info, get_all_users, get_recent_logs, get_user_logs, get_setting, get_extra_tasks_for_user, check_device_subscription
from utils.events import broadcast, event_clients, clients_lock, log_msg
from utils.adms import process_attlog, process_users, command_queue, queue_lock
import threading

import os
if getattr(sys, 'frozen', False):
    template_dir = os.path.join(sys._MEIPASS, 'templates')
    static_dir = os.path.join(sys._MEIPASS, 'static')
    app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
else:
    app = Flask(__name__)

CORS(app, supports_credentials=True)

from routes.api_auth import api_auth_bp
from routes.api_device import api_device_bp
from routes.api_logs import api_logs_bp
from routes.api_settings import api_settings_bp
from routes.api_users import api_users_bp

app.register_blueprint(api_auth_bp, url_prefix='/api/auth')
app.register_blueprint(api_device_bp, url_prefix='/api/device')
app.register_blueprint(api_logs_bp, url_prefix='/api/logs')
app.register_blueprint(api_settings_bp, url_prefix='/api/settings')
app.register_blueprint(api_users_bp, url_prefix='/api/users')

app.secret_key = 'super_secret_attendance_key_123!@#'
ADMS_PORT = 8081

@app.before_request
def log_request_info():
    try:
        print(f"[DEBUG-ADMS] {request.method} {request.url}", flush=True)
    except (OSError, AttributeError):
        pass

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

    if sn:
        was_connected = device_info['connected']
        device_info['sn']        = sn
        if not was_connected:
            log_msg(f"[جهاز - Tenant {customer_id}] متصل: {sn}")
            broadcast('device_status', {'connected': True, 'sn': sn, 'customer_id': customer_id})

    device_info['connected'] = True
    device_info['last_seen'] = datetime.now().isoformat()

    if request.method == 'GET' and options == 'all':
        log_msg(f"[ADMS] Handshake → طلب ATTLOG + USERINFO")
        return Response("GET ATTLOG Stamp=0\nGET USERINFO\n", content_type='text/plain')

    if request.method == 'POST':
        body = request.get_data(as_text=True)
        if table == 'ATTLOG':
            process_attlog(customer_id, body)
        elif table == 'USER':
            process_users(customer_id, body)
        elif table == 'options':
            try:
                for part in body.split(','):
                    if 'UserCount=' in part:
                        device_info['user_count'] = int(part.split('=')[1])
                    if 'DeviceName=' in part:
                        device_info['model'] = part.split('=')[1].strip('~')
            except: pass
        return Response("OK\n", content_type='text/plain')

    return Response("OK\n", content_type='text/plain')

@app.route('/iclock/getrequest', methods=['GET'])
def iclock_getrequest():
    sn = request.args.get('SN', request.args.get('sn', ''))
    customer_id = check_device_subscription(sn)
    if not customer_id:
        return Response("UNKNOWN DEVICE\n", status=403, content_type='text/plain')

    if sn:
        device_info['sn'] = sn
    device_info['connected'] = True
    device_info['last_seen'] = datetime.now().isoformat()

    with queue_lock:
        if command_queue:
            cmd = command_queue.popleft()
            log_msg(f"[→جهاز - Tenant {customer_id}] {cmd.strip()}")
            return Response(cmd, content_type='text/plain')
    return Response("OK\n", content_type='text/plain')

@app.route('/iclock/devicecmd', methods=['GET', 'POST'])
def iclock_devicecmd():
    sn = request.args.get('SN', request.args.get('sn', ''))
    customer_id = check_device_subscription(sn)
    if not customer_id:
        return Response("UNKNOWN DEVICE\n", status=403, content_type='text/plain')

    body = request.get_data(as_text=True)
    if 'USER' in body:
        process_users(customer_id, body)
    elif '\t' in body and len(body) > 20:
        process_attlog(customer_id, body)
    return Response("OK\n", content_type='text/plain')

@app.route('/iclock/deviceinfo', methods=['POST'])
@app.route('/iclock/ping',       methods=['GET', 'POST'])
def iclock_misc():
    sn = request.args.get('SN', request.args.get('sn', ''))
    customer_id = check_device_subscription(sn)
    if not customer_id:
        return Response("UNKNOWN DEVICE\n", status=403, content_type='text/plain')

    if sn:
        device_info['sn'] = sn
    device_info['connected'] = True
    device_info['last_seen'] = datetime.now().isoformat()
    return Response("OK\n", content_type='text/plain')

# ===================================================
# مسارات بوابة الموظفين (Web Portal)
# ===================================================
@app.route('/')
def portal_home():
    if 'employee_pin' in session:
        return redirect(url_for('portal_dashboard'))
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def portal_login():
    pin = request.form.get('pin', '').strip()
    password = request.form.get('password', '').strip()
    
    users = get_all_users()
    for u in users:
        if str(u['pin']) == pin and str(u.get('password', '')) == password:
            session['employee_pin'] = pin
            session['employee_name'] = u['name']
            session['hourly_rate'] = u.get('hourly_rate', 0.0)
            return redirect(url_for('portal_dashboard'))
            
    return render_template('login.html', error="رقم الموظف أو كلمة المرور غير صحيحة.")

@app.route('/logout')
def portal_logout():
    session.clear()
    return redirect(url_for('portal_home'))

@app.route('/dashboard')
def portal_dashboard():
    if 'employee_pin' not in session:
        return redirect(url_for('portal_home'))
        
    pin = session['employee_pin']
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    if not start_date or not end_date:
        now = datetime.now()
        start_date = now.replace(day=1).strftime('%Y-%m-%d')
        end_date = now.strftime('%Y-%m-%d')
        
    # جلب بصمات الموظف بدءاً من يوم سابق لاصطياد الورديات الليلية
    from datetime import timedelta
    start_dt = datetime.strptime(start_date, '%Y-%m-%d')
    end_dt = datetime.strptime(end_date, '%Y-%m-%d')
    fetch_start = (start_dt - timedelta(days=1)).strftime('%Y-%m-%d')
    user_logs = get_user_logs(pin, fetch_start, end_date)
    user_logs.sort(key=lambda x: x['timestamp'])
    
    shifts = []
    current_in = None
    
    for log in user_logs:
        dt = datetime.strptime(log['timestamp'], '%Y-%m-%d %H:%M:%S')
        if current_in is None:
            current_in = dt
        else:
            diff = dt - current_in
            if diff.total_seconds() > 12 * 3600:
                # تجاوز 12 ساعة، تُسجل بصمة الدخول القديمة بدون خروج (صفر ساعات)
                shifts.append({'in': current_in, 'out': None, 'hours': 0.0})
                current_in = dt # تبدأ بصمة دخول جديدة
            else:
                hours = round(diff.total_seconds() / 3600, 2)
                shifts.append({'in': current_in, 'out': dt, 'hours': hours})
                current_in = None
                
    if current_in is not None:
        shifts.append({'in': current_in, 'out': None, 'hours': 0.0})
        
    # تجميع الورديات حسب يوم "الدخول"
    from collections import defaultdict
    shifts_by_day = defaultdict(list)
    for shift in shifts:
        date_str = shift['in'].strftime('%Y-%m-%d')
        shifts_by_day[date_str].append(shift)
        
    daily_logs = []
    total_hours = 0.0
    
    today_dt = datetime.now()
    actual_end_dt = today_dt if end_dt > today_dt else end_dt
        
    arabic_days = {
        'Sunday': 'الأحد', 'Monday': 'الإثنين', 'Tuesday': 'الثلاثاء',
        'Wednesday': 'الأربعاء', 'Thursday': 'الخميس', 'Friday': 'الجمعة', 'Saturday': 'السبت'
    }
    
    curr_date = start_dt
    while curr_date <= actual_end_dt:
        d_str = curr_date.strftime('%Y-%m-%d')
        day_name = arabic_days[curr_date.strftime('%A')]
        display_date = f"{day_name} {d_str}"
        
        day_shifts = shifts_by_day.get(d_str, [])
        if not day_shifts:
            daily_logs.append({
                'date': d_str,
                'display_date': display_date,
                'first_in': "—",
                'last_out': "—",
                'hours': 0.0,
                'is_absent': True
            })
        else:
            for i, s in enumerate(day_shifts):
                first_in_str = s['in'].strftime('%H:%M:%S')
                if s['out']:
                    last_out_str = s['out'].strftime('%H:%M:%S')
                    if s['out'].date() > s['in'].date():
                        last_out_str += " (+1)"
                else:
                    last_out_str = "—"
                    
                daily_logs.append({
                    'date': d_str,
                    'display_date': display_date if i == 0 else "",
                    'first_in': first_in_str,
                    'last_out': last_out_str,
                    'hours': s['hours'],
                    'is_absent': False
                })
                total_hours += s['hours']
                
        curr_date += timedelta(days=1)
        
    rate = float(session.get('hourly_rate', 0.0))
    base_salary = round(total_hours * rate, 2)
    
    from utils.database import calculate_premium_bonus
    premium_bonus = calculate_premium_bonus(pin, shifts, rate)
    
    extra_tasks = get_extra_tasks_for_user(pin, start_date, end_date)
    for t in extra_tasks:
        if t.get('is_monthly') == 1:
            t['task_name'] = f"{t['task_name']} (مهمة دورية)"
            
    if premium_bonus > 0:
        extra_tasks.append({
            'task_name': 'علاوة ساعات إضافية (Premium)',
            'task_value': premium_bonus,
            'date': end_date
        })
            
    total_extras = sum(float(t['task_value']) for t in extra_tasks)
    total_salary = round(base_salary + total_extras, 2)
    
    summary = {
        'total_hours': round(total_hours, 2),
        'base_salary': base_salary,
        'total_extras': total_extras,
        'total_salary': total_salary
    }
    
    return render_template('dashboard.html', 
                           user={'name': session['employee_name'], 'hourly_rate': rate},
                           daily_logs=daily_logs,
                           extra_tasks=extra_tasks,
                           summary=summary,
                           start_date=start_date,
                           end_date=end_date)

# ===================================================
# بدء تشغيل السيرفر في Thread منفصل
# ===================================================
def run_server():
    try:
        import logging
        log = logging.getLogger('werkzeug')
        log.setLevel(logging.INFO) # إظهار رسائل Flask لتصحيح الأخطاء
        from waitress import serve
        serve(app, listen=f"0.0.0.0:{ADMS_PORT} 0.0.0.0:80", threads=8)
    except ImportError:
        app.run(host='0.0.0.0', port=80, debug=False, threaded=True, use_reloader=False)

def start_background_server():
    init_db()
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    return server_thread

if __name__ == '__main__':
    print("=" * 55, flush=True)
    print("  سيرفر الاتصال بجهاز البصمة - يعمل في الخلفية", flush=True)
    print("=" * 55, flush=True)
    print(f"[*] الجهاز يرسل على: http://0.0.0.0:{ADMS_PORT}", flush=True)
    print("=" * 55, flush=True)
    start_background_server()
    # لمنع السيرفر من الإغلاق إذا تم تشغيله بشكل مستقل
    import time
    while True:
        time.sleep(1)
