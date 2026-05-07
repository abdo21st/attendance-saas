from flask import Blueprint, jsonify, session
from utils.database import get_db_conn
from utils.adms import command_queues
from utils.auth import login_required
import psycopg2.extras

api_device_bp = Blueprint('api_device', __name__)

@api_device_bp.route('/status')
@login_required
def api_status():
    try:
        customer_id = session.get('customer_id')
        if not customer_id:
            return jsonify({'success': False, 'error': 'جلسة منتهية'}), 401

        with get_db_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
                # جلب آخر جهاز تم استخدامه لهذه الشركة
                cursor.execute('''
                    SELECT * FROM Devices 
                    WHERE customer_id = %s 
                    ORDER BY last_seen DESC NULLS LAST LIMIT 1
                ''', (customer_id,))
                device = cursor.fetchone()

        if not device:
            return jsonify({
                'success': True,
                'device': None,
                'connected': False,
                'message': 'لا يوجد جهاز مرتبط بهذا الحساب'
            })

        # التحقق من حالة الاتصال برمجياً
        from datetime import datetime
        is_connected = False
        last_seen_str = 'لم يتصل بعد'
        
        if device.get('last_seen'):
            last_seen = device['last_seen']
            elapsed = (datetime.now() - last_seen).total_seconds()
            is_connected = elapsed < 120 # أقل من دقيقتين
            last_seen_str = last_seen.strftime('%Y-%m-%d %H:%M:%S')

        sn = device.get('sn', 'Unknown')
        pending_cmds = len(command_queues.get(sn, []))
        
        return jsonify({
            'success':      True,
            'sn':           sn,
            'connected':    is_connected,
            'model':        device.get('model') or 'غير معروف',
            'last_seen':    last_seen_str,
            'log_count':    device.get('log_count') or 0,
            'user_count':   device.get('user_count') or 0,
            'pending_cmds': pending_cmds
        })
    except Exception as e:
        print(f"ERROR in api_status: {str(e)}")
        return jsonify({'success': False, 'error': 'خطأ داخلي في السيرفر'}), 500

@api_device_bp.route('/list')
@login_required
def api_device_list():
    try:
        customer_id = session.get('customer_id')
        if not customer_id:
            return jsonify({'success': False, 'error': 'جلسة منتهية'}), 401
            
        with get_db_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
                cursor.execute('''
                    SELECT * FROM Devices 
                    WHERE customer_id = %s 
                    ORDER BY last_seen DESC NULLS LAST
                ''', (customer_id,))
                devices = cursor.fetchall()

        from datetime import datetime
        result = []
        for d in devices:
            is_connected = False
            last_seen_str = 'لم يتصل بعد'
            
            if d.get('last_seen'):
                elapsed = (datetime.now() - d['last_seen']).total_seconds()
                is_connected = elapsed < 120
                last_seen_str = d['last_seen'].strftime('%Y-%m-%d %H:%M:%S')
                
            result.append({
                'sn': d.get('sn', 'Unknown'),
                'model': d.get('model') or 'بانتظار الاتصال...',
                'connected': is_connected,
                'last_seen': last_seen_str,
                'log_count': d.get('log_count') or 0,
                'user_count': d.get('user_count') or 0,
                'pending_cmds': len(command_queues.get(d.get('sn'), []))
            })
            
        return jsonify({'success': True, 'devices': result})
    except Exception as e:
        print(f"ERROR in api_device_list: {str(e)}")
        return jsonify({'success': False, 'error': 'خطأ داخلي في السيرفر'}), 500
