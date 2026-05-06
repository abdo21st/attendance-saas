from flask import Blueprint, request, jsonify, session
from utils.database import get_user_by_pin, get_setting, get_user_logs, get_extra_tasks_for_user
from datetime import datetime, timedelta

api_employee_bp = Blueprint('api_employee', __name__)

def get_customer_id():
    return session.get('customer_id', 1)

@api_employee_bp.route('/login', methods=['POST'])
def api_employee_login():
    data = request.json or {}
    pin = str(data.get('pin', '')).strip()
    pwd = str(data.get('password', '')).strip()
    company_code = str(data.get('company_code', '1')).strip() # افتراضيا 1

    if not pin:
        return jsonify({'success': False, 'error': 'رقم الموظف مطلوب'}), 400

    # التحقق من تفعيل الميزة للشركة
    customer_id = int(company_code) if company_code.isdigit() else 1
    portal_enabled = get_setting(customer_id, 'employee_portal_enabled', False)
    
    if str(portal_enabled).lower() != 'true' and portal_enabled is not True:
        return jsonify({'success': False, 'error': 'عذراً، ميزة بوابة الموظفين غير مفعلة لشركتك. يرجى مراجعة الإدارة.'}), 403

    user = get_user_by_pin(customer_id, pin)
    if not user:
        return jsonify({'success': False, 'error': 'رقم الموظف غير صحيح'}), 401
    
    stored_pwd = str(user.get('password', '')).strip()
    if not stored_pwd or pwd != stored_pwd:
        return jsonify({'success': False, 'error': 'كلمة المرور غير صحيحة أو غير معينة'}), 401
        
    session['employee_portal_auth'] = True
    session['customer_id'] = customer_id
    session['emp_pin'] = user['pin']
    session['emp_name'] = user['name']
    session['emp_hourly_rate'] = user.get('hourly_rate', 0.0)
    
    return jsonify({'success': True, 'user': {'name': user['name'], 'pin': user['pin']}})

@api_employee_bp.route('/logout', methods=['POST'])
def api_employee_logout():
    session.pop('employee_portal_auth', None)
    session.pop('emp_pin', None)
    session.pop('emp_name', None)
    return jsonify({'success': True})

@api_employee_bp.route('/dashboard', methods=['GET'])
def api_employee_dashboard():
    if not session.get('employee_portal_auth'):
        return jsonify({'success': False, 'error': 'غير مصرح'}), 401
        
    customer_id = get_customer_id()
    pin = session['emp_pin']
    
    # جلب إحصائيات الشهر الحالي
    now = datetime.now()
    start_date = now.replace(day=1).strftime('%Y-%m-%d')
    end_date = now.strftime('%Y-%m-%d')
    
    start_dt = datetime.strptime(start_date, '%Y-%m-%d')
    fetch_start = (start_dt - timedelta(days=1)).strftime('%Y-%m-%d')
    user_logs = get_user_logs(customer_id, pin, fetch_start, end_date)
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
                shifts.append({'in': current_in, 'out': None, 'hours': 0.0})
                current_in = dt
            else:
                hours = round(diff.total_seconds() / 3600, 2)
                shifts.append({'in': current_in, 'out': dt, 'hours': hours})
                current_in = None
                
    if current_in is not None:
        shifts.append({'in': current_in, 'out': None, 'hours': 0.0})
        
    from utils.payroll import calculate_salary
    from utils.database import get_setting
    
    rules = get_setting(customer_id, 'rules', [])
    extra_tasks = get_extra_tasks_for_user(customer_id, pin, start_date, end_date)
    rate = float(session.get('emp_hourly_rate', 0.0))
    
    payroll = calculate_salary(customer_id, pin, user_logs, extra_tasks, rules, rate)
    
    # تجهيز سجلات الأيام
    formatted_logs = []
    for s in payroll['shifts']:
        if s['in'].date() >= start_dt.date():
            formatted_logs.append({
                'date': s['in'].strftime('%Y-%m-%d'),
                'in': s['in'].strftime('%H:%M'),
                'out': s['out'].strftime('%H:%M') if s['out'] else '—',
                'hours': s['hours']
            })

    return jsonify({
        'success': True,
        'data': {
            'name': session['emp_name'],
            'pin': pin,
            'summary': {
                'total_hours': payroll['total_hours'],
                'base_salary': payroll['base_salary'],
                'total_extras': payroll['total_extras'] + payroll['premium_bonus'],
                'total_salary': payroll['total_salary'],
                'month': now.strftime('%B %Y')
            },
            'logs': formatted_logs
        }
    })
