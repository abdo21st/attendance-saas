from flask import Blueprint, jsonify, session
from utils.database import get_db_conn
from utils.adms import command_queues
from utils.auth import login_required
import psycopg2.extras

api_device_bp = Blueprint('api_device', __name__)

@api_device_bp.route('/status')
@login_required
def api_status():
    customer_id = session.get('customer_id', 1)
    print(f"DEBUG: api_status | session customer_id: {customer_id}")
    
    with get_db_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            # جلب آخر جهاز تم استخدامه لهذه الشركة
            query = "SELECT * FROM Devices WHERE customer_id = %s ORDER BY last_seen DESC LIMIT 1"
            cursor.execute(query, (customer_id,))
            device = cursor.fetchone()
            print(f"DEBUG: api_status | Found device: {device['sn'] if device else 'None'}")

    if not device:
        return jsonify({
            'success': True,
            'device': None,
            'connected': False,
            'message': 'لا يوجد جهاز مرتبط بهذا الحساب'
        })

    # التحقق من حالة الاتصال برمجياً (إذا كان آخر ظهور أكثر من دقيقتين نعتبره غير متصل)
    from datetime import datetime
    is_connected = False
    if device['last_seen']:
        # psycopg2 returns datetime object
        last_seen = device['last_seen']
        elapsed = (datetime.now() - last_seen).total_seconds()
        is_connected = elapsed < 120 # أقل من دقيقتين

    # حساب الأوامر المعلقة لهذا الجهاز تحديداً
    sn = device['sn']
    pending_cmds = len(command_queues.get(sn, []))
    
    return jsonify({
        'success':      True,
        'sn':           sn,
        'connected':    is_connected,
        'model':        device['model'] or 'غير معروف',
        'last_seen':    device['last_seen'].strftime('%Y-%m-%d %H:%M:%S') if device['last_seen'] else '—',
        'log_count':    device['log_count'],
        'user_count':   device['user_count'],
        'pending_cmds': pending_cmds
    })

@api_device_bp.route('/list')
@login_required
def api_device_list():
    customer_id = session.get('customer_id', 1)
    print(f"DEBUG: api_device_list | session customer_id: {customer_id} (type: {type(customer_id)})")
    
    with get_db_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            query = "SELECT * FROM Devices WHERE customer_id = %s ORDER BY last_seen DESC NULLS LAST"
            cursor.execute(query, (customer_id,))
            devices = cursor.fetchall()
            print(f"DEBUG: api_device_list | Found {len(devices)} devices")

    from datetime import datetime
    result = []
    for d in devices:
        is_connected = False
        if d['last_seen']:
            elapsed = (datetime.now() - d['last_seen']).total_seconds()
            is_connected = elapsed < 120
            
        result.append({
            'sn': d['sn'],
            'model': d['model'] or 'بانتظار الاتصال...',
            'connected': is_connected,
            'last_seen': d['last_seen'].strftime('%Y-%m-%d %H:%M:%S') if d['last_seen'] else 'لم يتصل بعد',
            'log_count': d['log_count'],
            'user_count': d['user_count'],
            'pending_cmds': len(command_queues.get(d['sn'], []))
        })
        
    return jsonify({'success': True, 'devices': result})
