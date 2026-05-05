from flask import Blueprint, request, jsonify, session
from utils.database import get_user_by_pin, save_user
from utils.events import log_msg

api_auth_bp = Blueprint('api_auth', __name__)

@api_auth_bp.route('/login', methods=['POST'])
def api_auth_login():
    data = request.json or {}
    company_id = data.get('company_id', 1)
    pin = str(data.get('pin', '')).strip()
    pwd = str(data.get('password', '')).strip()

    if not pin:
        return jsonify({'success': False, 'error': 'رقم الموظف مطلوب'}), 400

    try:
        customer_id = int(company_id)
    except:
        return jsonify({'success': False, 'error': 'رقم الشركة غير صحيح'}), 400

    user = get_user_by_pin(customer_id, pin)
    if not user:
        return jsonify({'success': False, 'error': 'رقم الموظف أو رقم الشركة غير صحيح'}), 401
    
    stored_pwd = str(user.get('password', '')).strip()
    if not stored_pwd:
        if not pwd:
            return jsonify({'success': False, 'error': 'أنت لم تعين كلمة مرور بعد، يرجى كتابة كلمة مرور جديدة لحفظها واستخدامها دائماً'}), 401
        # تعيين كلمة المرور الجديدة
        save_user(customer_id, user['pin'], user['name'], user['role'], pwd, user['hourly_rate'])
        log_msg(f"[تحديث] تم تعيين كلمة مرور جديدة للمستخدم {pin}")
    elif pwd != stored_pwd:
        return jsonify({'success': False, 'error': 'كلمة المرور غير صحيحة'}), 401
        
    session['customer_id'] = customer_id
    session['user_id'] = user['pin']
    session['user_name'] = user['name']
    session['user_role'] = int(user.get('role', 0))
    
    log_msg(f"[دخول] سجل {user['name']} الدخول للنظام")
    return jsonify({'success': True})

@api_auth_bp.route('/logout', methods=['POST'])
def api_auth_logout():
    session.clear()
    return jsonify({'success': True})
