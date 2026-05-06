from flask import Blueprint, request, jsonify, session
from utils.database import get_all_users, save_user, delete_user, get_user_by_pin
from utils.events import broadcast, log_msg
from utils.auth import permission_required

api_users_bp = Blueprint('api_users', __name__)

def get_customer_id():
    return session.get('customer_id', 1)

@api_users_bp.route('', methods=['GET'])
def api_get_users():
    users = get_all_users(get_customer_id())
    return jsonify({'success': True, 'users': users})

@api_users_bp.route('', methods=['POST'])
@permission_required('add_users')
def api_save_user():
    data = request.json or {}
    # دعم التسميات المختلفة pin/userid
    pin  = str(data.get('pin', data.get('userid', ''))).strip()
    name = str(data.get('name', '')).strip()
    role = int(data.get('role', 0) or 0)
    pwd  = str(data.get('password', '') or '').strip()
    hourly_rate = float(data.get('hourly_rate', 0.0) or 0.0)

    if not pin or not name:
        return jsonify({'success': False, 'error': 'رقم الموظف والاسم مطلوبان'}), 400

    # حفظ في قاعدة البيانات فقط (لا يتم الإرسال للجهاز بناءً على طلب المستخدم)
    save_user(get_customer_id(), pin, name, role, pwd, hourly_rate)
    
    log_msg(f"[مستخدم] تم حفظ بيانات الموظف محلياً: {name} ({pin})")
    broadcast('users_updated', {'customer_id': get_customer_id()})

    return jsonify({'success': True, 'message': 'تم حفظ بيانات الموظف بنجاح في النظام'})

@api_users_bp.route('/<pin>', methods=['DELETE'])
@permission_required('delete_users')
def api_delete_user(pin):
    if not pin:
        return jsonify({'success': False, 'error': 'رقم الموظف مطلوب'}), 400

    delete_user(get_customer_id(), pin)
    log_msg(f"[مستخدم] حذف الموظف من النظام: PIN={pin}")
    broadcast('users_updated', {'customer_id': get_customer_id()})
    return jsonify({'success': True, 'message': 'تم حذف الموظف من النظام'})
