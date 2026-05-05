from flask import Blueprint, request, jsonify
import os
from utils.database import get_db
from contextlib import closing
import psycopg2.extras

api_superadmin_bp = Blueprint('api_superadmin', __name__)

SUPER_ADMIN_TOKEN = os.environ.get('SUPER_ADMIN_TOKEN', 'AdminSecret2024')

def check_token():
    token = request.headers.get('X-Super-Admin-Token')
    return token == SUPER_ADMIN_TOKEN

@api_superadmin_bp.route('/customers', methods=['POST'])
def add_customer():
    if not check_token(): return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json or {}
    name = data.get('name')
    admin_name = data.get('admin_name')
    phone = data.get('phone')
    email = data.get('email')
    
    if not name: return jsonify({'error': 'Name required'}), 400
    
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute('''
                INSERT INTO Customers (name, admin_name, phone, admin_email) 
                VALUES (%s, %s, %s, %s) RETURNING id
            ''', (name, admin_name, phone, email))
            customer_id = cursor.fetchone()[0]
        conn.commit()
        
    return jsonify({'success': True, 'customer_id': customer_id})

@api_superadmin_bp.route('/customers/<int:cid>', methods=['PUT'])
def update_customer(cid):
    if not check_token(): return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json or {}
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute('''
                UPDATE Customers SET name=%s, admin_name=%s, phone=%s, admin_email=%s
                WHERE id=%s
            ''', (data.get('name'), data.get('admin_name'), data.get('phone'), data.get('admin_email'), cid))
        conn.commit()
    return jsonify({'success': True})

@api_superadmin_bp.route('/devices', methods=['POST'])
def add_device():
    if not check_token(): return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json or {}
    sn = data.get('sn')
    customer_id = data.get('customer_id')
    
    if not sn or not customer_id: return jsonify({'error': 'SN and customer_id required'}), 400
    
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute('''
                INSERT INTO Devices (sn, customer_id, subscription_start, subscription_end, is_active)
                VALUES (%s, %s, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', TRUE)
                ON CONFLICT (sn) DO UPDATE SET customer_id = EXCLUDED.customer_id, is_active = TRUE
            ''', (sn, customer_id))
        conn.commit()
        
    return jsonify({'success': True})

@api_superadmin_bp.route('/devices/<sn>', methods=['PUT'])
def update_device(sn):
    if not check_token(): return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json or {}
    # تحديث تاريخ انتهاء الاشتراك أو حالة التفعيل
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute('''
                UPDATE Devices SET subscription_end=%s, is_active=%s
                WHERE sn=%s
            ''', (data.get('subscription_end'), data.get('is_active', True), sn))
        conn.commit()
    return jsonify({'success': True})

@api_superadmin_bp.route('/list', methods=['GET'])
def list_all():
    if not check_token(): return jsonify({'error': 'Unauthorized'}), 401
    
    with closing(get_db()) as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            cursor.execute("SELECT * FROM Customers ORDER BY id ASC")
            customers = [dict(r) for r in cursor.fetchall()]
            
            cursor.execute("SELECT * FROM Devices")
            devices = [dict(r) for r in cursor.fetchall()]
            
    return jsonify({'customers': customers, 'devices': devices})
