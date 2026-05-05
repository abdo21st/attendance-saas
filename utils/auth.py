from functools import wraps
from flask import request, jsonify, redirect, url_for, session

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

def permission_required(permission_name):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({'success': False, 'error': 'غير مصرح'}), 401
                
            role_id = str(session.get('user_role', '0'))
            
            # جلب إعدادات المجموعات
            from utils.database import get_setting
            customer_id = session.get('customer_id', 1)
            groups = get_setting(customer_id, 'groups', {})
            user_group = groups.get(role_id, {})
            user_permissions = user_group.get('permissions', [])
            
            # المدير (14) يمتلك دائماً كافة الصلاحيات لمنع قفل النظام
            if role_id == '14' or permission_name in user_permissions:
                return f(*args, **kwargs)
                
            return jsonify({'success': False, 'error': 'ليس لديك صلاحية لإجراء هذه العملية'}), 403
        return decorated_function
    return decorator
