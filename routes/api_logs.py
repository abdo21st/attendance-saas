from flask import Blueprint, request, jsonify, session
from utils.database import get_recent_logs, add_attendance_log, edit_attendance_log, delete_attendance_log, device_info
from utils.events import broadcast, log_msg
from utils.auth import permission_required

api_logs_bp = Blueprint('api_logs', __name__)

def get_customer_id():
    return session.get('customer_id', 1)

@api_logs_bp.route('')
def api_logs_list():
    logs = get_recent_logs(get_customer_id(), 2000)
    formatted_logs = []
    for l in logs:
        formatted_logs.append({
            'UserId': l['user_pin'],
            'Timestamp': l['timestamp'],
            'VerifyMethod': l['verify_method'],
            'ReceivedAt': l['received_at']
        })
    return jsonify({'success': True, 'data': formatted_logs})

@api_logs_bp.route('/manual', methods=['POST'])
@permission_required('add_logs')
def api_add_manual_log():
    data = request.json or {}
    pin = str(data.get('userid', '')).strip()
    timestamp = str(data.get('timestamp', '')).strip() # format: YYYY-MM-DD HH:MM:SS
    if not pin or not timestamp:
        return jsonify({'success': False, 'error': 'بيانات غير مكتملة'}), 400
    
    success = add_attendance_log(get_customer_id(), pin, timestamp, verify_method=0)
    if not success:
        return jsonify({'success': False, 'error': 'يوجد بصمة مسجلة مسبقاً في هذا الوقت'}), 400
        
    broadcast('logs_updated', {'count': device_info['log_count'], 'customer_id': get_customer_id()})
    log_msg(f"[تعديل] إضافة بصمة يدوية للموظف {pin} بوقت {timestamp}")
    return jsonify({'success': True, 'message': 'تم إضافة البصمة اليدوية بنجاح'})

@api_logs_bp.route('/manual', methods=['PUT'])
@permission_required('edit_logs')
def api_edit_manual_log():
    data = request.json or {}
    pin = str(data.get('userid', '')).strip()
    old_timestamp = str(data.get('old_timestamp', '')).strip()
    new_timestamp = str(data.get('new_timestamp', '')).strip()
    
    if not pin or not old_timestamp or not new_timestamp:
        return jsonify({'success': False, 'error': 'بيانات غير مكتملة'}), 400
        
    success = edit_attendance_log(get_customer_id(), pin, old_timestamp, new_timestamp)
    if not success:
        return jsonify({'success': False, 'error': 'لم يتم العثور على البصمة المطلوبة للتعديل'}), 404
        
    broadcast('logs_updated', {'count': device_info['log_count'], 'customer_id': get_customer_id()})
    log_msg(f"[تعديل] تعديل بصمة الموظف {pin} من {old_timestamp} إلى {new_timestamp}")
    return jsonify({'success': True, 'message': 'تم تعديل البصمة بنجاح'})

@api_logs_bp.route('/manual', methods=['DELETE'])
@permission_required('delete_logs')
def api_delete_manual_log():
    pin = request.args.get('userid', '').strip()
    timestamp = request.args.get('timestamp', '').strip()
    
    if not pin or not timestamp:
        return jsonify({'success': False, 'error': 'بيانات غير مكتملة'}), 400
        
    success = delete_attendance_log(get_customer_id(), pin, timestamp)
    if not success:
        return jsonify({'success': False, 'error': 'لم يتم العثور على البصمة للحذف'}), 404
        
    broadcast('logs_updated', {'count': device_info['log_count'], 'customer_id': get_customer_id()})
    log_msg(f"[تعديل] حذف بصمة للموظف {pin} بوقت {timestamp}")
    return jsonify({'success': True, 'message': 'تم حذف البصمة بنجاح'})
