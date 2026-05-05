from flask import Blueprint, request, jsonify, session
from utils.database import get_setting, save_setting
from utils.events import log_msg
from utils.auth import login_required, permission_required

api_settings_bp = Blueprint('api_settings', __name__)

def get_customer_id():
    return session.get('customer_id', 1)

@api_settings_bp.route('', methods=['GET'])
@login_required
def api_get_settings():
    rules = get_setting(get_customer_id(), 'rules', [])
    roles = get_setting(get_customer_id(), 'roles', {})
    return jsonify({'success': True, 'data': {'rules': rules, 'roles': roles}})

@api_settings_bp.route('', methods=['POST'])
@permission_required('manage_settings')
def api_save_settings():
    data = request.json or {}
    save_setting(get_customer_id(), 'rules', data.get('rules', []))
    log_msg("[إعدادات] تم حفظ قواعد الأجور")
    return jsonify({'success': True, 'message': 'تم حفظ الإعدادات بنجاح'})

@api_settings_bp.route('/groups', methods=['GET', 'POST'])
@permission_required('manage_roles')
def api_groups():
    if request.method == 'POST':
        data = request.json
        if data and isinstance(data, dict):
            save_setting(get_customer_id(), 'groups', data)
            log_msg("[إعدادات] تم تحديث مجموعات الصلاحيات")
            return jsonify({'success': True})
        return jsonify({'success': False, 'error': 'بيانات غير صحيحة'}), 400
    
    groups = get_setting(get_customer_id(), 'groups', {})
    return jsonify({'success': True, 'data': groups})
