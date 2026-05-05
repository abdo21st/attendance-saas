from flask import Blueprint, request, jsonify, Response, session
from time import time
from utils.database import get_all_users, save_user, delete_user, get_user_by_pin, device_info
from utils.events import broadcast, log_msg
from utils.auth import permission_required
from utils.adms import enqueue

api_users_bp = Blueprint('api_users', __name__)

def get_customer_id():
    return session.get('customer_id', 1)

@api_users_bp.route('', methods=['GET', 'POST', 'OPTIONS'])
def api_users_handler():
    if request.method == 'OPTIONS':
        return Response('', status=200)
    
    if request.method == 'GET':
        users = get_all_users(get_customer_id())
        return jsonify({'success': True, 'users': users})
        
    return api_add_user_logic()

@permission_required('add_users')
def api_add_user_logic():
    data = request.json or {}
    pin  = str(data.get('userid', '')).strip()
    name = str(data.get('name', '')).strip()
    role = int(data.get('role', 0) or 0)
    pwd  = str(data.get('password', '') or '').strip()
    hourly_rate = float(data.get('hourly_rate', 0.0) or 0.0)

    if not pin or not name:
        return jsonify({'success': False, 'error': 'PIN والاسم مطلوبان'}), 400

    cid = int(time() * 1000)
    cmd = (f"C:{cid}:DATA UPDATE userinfo "
           f"PIN={pin}\tName={name}\tPri={role}\t"
           f"Passwd={pwd}\tCard=\tGrp=1\t"
           f"TZ=0000000000000000\tVerify=0\n")
    enqueue(cmd)

    save_user(get_customer_id(), pin, name, role, pwd, hourly_rate)
    broadcast('users_updated', {'count': device_info['user_count'], 'customer_id': get_customer_id()})

    return jsonify({'success': True, 'message': f'تم إرسال الأمر - سيظهر {name} في الجهاز خلال ثوانٍ'})

@api_users_bp.route('/local', methods=['POST'])
@permission_required('add_users')
def api_local_user():
    data = request.json or {}
    pin  = str(data.get('userid', '')).strip()
    name = str(data.get('name', '')).strip()
    role = int(data.get('role', 0) or 0)
    pwd  = str(data.get('password', '') or '').strip()
    hourly_rate = float(data.get('hourly_rate', 0.0) or 0.0)
    
    if not pin or not name:
        return jsonify({'success': False, 'error': 'PIN والاسم مطلوبان'}), 400
        
    save_user(get_customer_id(), pin, name, role, pwd, hourly_rate)
    broadcast('users_updated', {'count': device_info['user_count'], 'customer_id': get_customer_id()})
    log_msg(f"[استيراد] PIN={pin} Name={name} (بدون إرسال للجهاز)")
    return jsonify({'success': True, 'message': f'تم حفظ {name} في النظام'})

@api_users_bp.route('', methods=['DELETE'])
@permission_required('delete_users')
def api_delete_user():
    userid = request.args.get('userid', '').strip()
    if not userid:
        return jsonify({'success': False, 'error': 'userid مطلوب'}), 400

    cid = int(time() * 1000)
    enqueue(f"C:{cid}:DATA DELETE userinfo PIN={userid}\n")

    delete_user(get_customer_id(), userid)
    log_msg(f"[مستخدم] حذف الموظف: PIN={userid}")
    return jsonify({'success': True, 'message': 'تم حذف المستخدم من النظام وسيتم حذفه من الجهاز'})

@api_users_bp.route('/rate', methods=['POST'])
@permission_required('edit_users')
def api_update_rate():
    data = request.json or {}
    pin = str(data.get('userid', '')).strip()
    rate = float(data.get('hourly_rate', 0.0) or 0.0)
    
    if not pin:
        return jsonify({'success': False, 'error': 'PIN مطلوب'}), 400
        
    user = get_user_by_pin(get_customer_id(), pin)
    if not user:
        return jsonify({'success': False, 'error': 'المستخدم غير موجود'}), 404
        
    save_user(get_customer_id(), pin, user['name'], user['role'], user['password'], rate)
    broadcast('users_updated', {'count': device_info['user_count'], 'customer_id': get_customer_id()})
    return jsonify({'success': True, 'message': 'تم تحديث أجر الساعة بنجاح'})
