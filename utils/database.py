import json
import os
import sys
import psycopg2
import psycopg2.extras
from psycopg2 import pool
from contextlib import contextmanager

# ===================================================
# إعدادات الاتصال بقاعدة بيانات PostgreSQL
# ===================================================
DB_HOST = os.environ.get('DB_HOST', '102.203.201.52')
DB_PORT = os.environ.get('DB_PORT', '5432')
DB_NAME = os.environ.get('DB_NAME', 'attendance_db')
DB_USER = os.environ.get('DB_USER', 'n8n')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'n8nDbPass2024')

# كائن معلومات الجهاز الافتراضي (سيتم تحديثه برمجياً)
device_info = {
    'sn': None,
    'connected': False,
    'model': 'N/A',
    'last_seen': 'N/A',
    'log_count': 0,
    'user_count': 0
}

# إنشاء مجمع اتصالات (Connection Pool) لضمان الاستقرار
try:
    db_pool = pool.ThreadedConnectionPool(
        minconn=1,
        maxconn=50, # رفع الحد لـ 50 لخدمة SaaS
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    print("DB Pool created successfully")
except Exception as e:
    print(f"Error creating DB Pool: {e}")
    db_pool = None

@contextmanager
def get_db_conn():
    conn = db_pool.getconn()
    try:
        yield conn
    finally:
        db_pool.putconn(conn)

def get_db():
    return db_pool.getconn()

# ===================================================
# تهيئة القاعدة - Multi-Tenant SaaS
# ===================================================
def init_db():
    try:
        with get_db_conn() as conn:
            with conn.cursor() as cursor:
                # جدول الشركات/الزبائن
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS Customers (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        admin_name VARCHAR(255),
                        phone VARCHAR(50),
                        admin_email VARCHAR(255),
                        admin_pin VARCHAR(50),
                        admin_password TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # جدول الأجهزة والاشتراكات
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS Devices (
                        sn VARCHAR(100) PRIMARY KEY,
                        customer_id INTEGER REFERENCES Customers(id) ON DELETE CASCADE,
                        model VARCHAR(100),
                        user_count INTEGER DEFAULT 0,
                        log_count INTEGER DEFAULT 0,
                        subscription_start DATE,
                        subscription_end DATE,
                        is_active BOOLEAN DEFAULT TRUE,
                        last_seen TIMESTAMP
                    )
                ''')

                # جداول النظام مع ربطها بالشركة
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS Users (
                        customer_id INTEGER REFERENCES Customers(id) ON DELETE CASCADE,
                        pin VARCHAR(50),
                        name VARCHAR(255) NOT NULL,
                        role INTEGER DEFAULT 0,
                        password TEXT,
                        hourly_rate REAL DEFAULT 0.0,
                        PRIMARY KEY (customer_id, pin)
                    )
                ''')
                
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS Attendance (
                        customer_id INTEGER REFERENCES Customers(id) ON DELETE CASCADE,
                        user_pin VARCHAR(50),
                        timestamp TIMESTAMP,
                        verify_method INTEGER,
                        received_at TIMESTAMP,
                        UNIQUE(customer_id, user_pin, timestamp)
                    )
                ''')
                
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS ExtraTasks (
                        id SERIAL PRIMARY KEY,
                        customer_id INTEGER REFERENCES Customers(id) ON DELETE CASCADE,
                        user_pin VARCHAR(50),
                        task_name TEXT,
                        task_value REAL,
                        date DATE,
                        is_monthly INTEGER DEFAULT 0
                    )
                ''')
                
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS Settings (
                        customer_id INTEGER REFERENCES Customers(id) ON DELETE CASCADE,
                        key VARCHAR(255),
                        value TEXT,
                        PRIMARY KEY (customer_id, key)
                    )
                ''')
                
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS PremiumRules (
                        id SERIAL PRIMARY KEY,
                        customer_id INTEGER REFERENCES Customers(id) ON DELETE CASCADE,
                        name VARCHAR(255) NOT NULL,
                        user_pin VARCHAR(50),
                        rule_type VARCHAR(50) NOT NULL,
                        rule_date VARCHAR(50),
                        start_time TIME,
                        end_time TIME,
                        rate_type VARCHAR(50) NOT NULL,
                        rate_value REAL NOT NULL
                    )
                ''')
                
                # جدول سجلات النظام (Logs) - جديد للأساسات
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS SystemLogs (
                        id SERIAL PRIMARY KEY,
                        customer_id INTEGER,
                        sn VARCHAR(100),
                        level VARCHAR(50),
                        message TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
            conn.commit()

        # زرع زبون افتراضي
        with get_db_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
                cursor.execute("SELECT id FROM Customers WHERE id = 1")
                if not cursor.fetchone():
                    cursor.execute("INSERT INTO Customers (id, name, admin_email) VALUES (1, 'الشركة الافتراضية', 'admin@ordermt.ly')")
                
                cursor.execute("SELECT pin FROM Users WHERE customer_id = 1 AND pin = '1000'")
                if not cursor.fetchone():
                    cursor.execute('''
                        INSERT INTO Users (customer_id, pin, name, role, password, hourly_rate)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    ''', (1, '1000', 'مسؤول النظام', 14, 'admin', 0.0))
            conn.commit()
    except Exception as e:
        print(f"DB Init Error: {e}")

# ===================================================
# التحقق من صلاحية الجهاز والاشتراك وتحديث الحالة
# ===================================================
def check_device_subscription(sn):
    with get_db_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            if not sn: 
                log_system_event(1, 'ERROR', 'محاولة مصافحة بدون رقم تسلسلي (SN Missing)')
                return None
            
            cursor.execute("SELECT customer_id, subscription_end, is_active FROM Devices WHERE sn = %s", (sn,))
            device = cursor.fetchone()
            
            if not device:
                cursor.execute("INSERT INTO Devices (sn, customer_id, subscription_start, subscription_end, is_active, last_seen) VALUES (%s, %s, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', TRUE, CURRENT_TIMESTAMP)", (sn, 1))
                conn.commit()
                return 1
            
            # تحديث وقت آخر ظهور
            cursor.execute("UPDATE Devices SET last_seen = CURRENT_TIMESTAMP WHERE sn = %s", (sn,))
            conn.commit()
                
            if not device['is_active']: return None
            cursor.execute("SELECT CURRENT_DATE <= %s as valid", (device['subscription_end'],))
            is_valid = cursor.fetchone()['valid']
            return device['customer_id'] if is_valid else None

def update_device_info(sn, model=None, user_count=None, log_count=None):
    with get_db_conn() as conn:
        with conn.cursor() as cursor:
            updates = []
            params = []
            if model:
                updates.append("model = %s")
                params.append(model)
            if user_count is not None:
                updates.append("user_count = %s")
                params.append(user_count)
            if log_count is not None:
                updates.append("log_count = %s")
                params.append(log_count)
            
            if updates:
                params.append(sn)
                cursor.execute(f"UPDATE Devices SET {', '.join(updates)} WHERE sn = %s", params)
                conn.commit()

# ===================================================
# دوال التخاطب مع البيانات (CRUD) - Multi-Tenant
# ===================================================
def log_system_event(customer_id, level, message, sn=None):
    try:
        with get_db_conn() as conn:
            with conn.cursor() as cursor:
                cursor.execute("INSERT INTO SystemLogs (customer_id, sn, level, message) VALUES (%s, %s, %s, %s)", (customer_id, sn, level, message))
            conn.commit()
    except: pass

def get_all_users(customer_id=1):
    with get_db_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            cursor.execute("SELECT * FROM Users WHERE customer_id = %s", (customer_id,))
            return [dict(row) for row in cursor.fetchall()]

def get_user_by_pin(customer_id, pin):
    with get_db_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            cursor.execute("SELECT * FROM Users WHERE customer_id = %s AND pin = %s", (customer_id, str(pin)))
            row = cursor.fetchone()
            return dict(row) if row else None

def save_user(customer_id, pin, name, role=0, password='', hourly_rate=0.0):
    with get_db_conn() as conn:
        with conn.cursor() as cursor:
            cursor.execute('''
                INSERT INTO Users (customer_id, pin, name, role, password, hourly_rate)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (customer_id, pin) DO UPDATE SET
                    name=EXCLUDED.name,
                    role=EXCLUDED.role,
                    password=EXCLUDED.password,
                    hourly_rate=EXCLUDED.hourly_rate
            ''', (customer_id, str(pin), name, int(role), password, float(hourly_rate)))
        conn.commit()

def delete_user(customer_id, pin):
    with get_db_conn() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM Users WHERE customer_id = %s AND pin = %s", (customer_id, str(pin)))
        conn.commit()

def get_recent_logs(customer_id=1, limit=50, offset=0):
    with get_db_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            cursor.execute('''
                SELECT a.user_pin, u.name as user_name, to_char(a.timestamp, 'YYYY-MM-DD HH24:MI:SS') as timestamp, 
                       a.verify_method, to_char(a.received_at, 'YYYY-MM-DD HH24:MI:SS') as received_at 
                FROM Attendance a
                LEFT JOIN Users u ON a.customer_id = u.customer_id AND a.user_pin = u.pin
                WHERE a.customer_id = %s 
                ORDER BY a.timestamp DESC LIMIT %s OFFSET %s
            ''', (customer_id, limit, offset))
            return [dict(row) for row in cursor.fetchall()]

def get_logs_count(customer_id=1):
    with get_db_conn() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM Attendance WHERE customer_id = %s", (customer_id,))
            return cursor.fetchone()[0]

def get_user_logs(customer_id, pin, start_date, end_date):
    with get_db_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            cursor.execute("SELECT user_pin, to_char(timestamp, 'YYYY-MM-DD HH24:MI:SS') as timestamp, verify_method, to_char(received_at, 'YYYY-MM-DD HH24:MI:SS') as received_at FROM Attendance WHERE customer_id = %s AND user_pin = %s AND timestamp >= %s AND timestamp <= %s ORDER BY timestamp ASC", 
                           (customer_id, str(pin), start_date + ' 00:00:00', end_date + ' 23:59:59'))
            return [dict(row) for row in cursor.fetchall()]

def add_attendance_log(customer_id, pin, timestamp, verify_method=0, received_at=None):
    if not received_at:
        from datetime import datetime
        received_at = datetime.now().isoformat()
    try:
        with get_db_conn() as conn:
            with conn.cursor() as cursor:
                cursor.execute('''
                    INSERT INTO Attendance (customer_id, user_pin, timestamp, verify_method, received_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (customer_id, user_pin, timestamp) DO NOTHING
                ''', (customer_id, str(pin), timestamp, int(verify_method), received_at))
                if cursor.rowcount == 0: return False
            conn.commit()
        return True
    except Exception as e:
        log_system_event(customer_id, 'ERROR', f'فشل إضافة سجل بصمة: {str(e)}')
        return False

def get_setting(customer_id, key, default=None):
    with get_db_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            cursor.execute("SELECT value FROM Settings WHERE customer_id = %s AND key = %s", (customer_id, key))
            row = cursor.fetchone()
            if row:
                try: return json.loads(row['value'])
                except: return row['value']
            return default

def save_setting(customer_id, key, value):
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)
    with get_db_conn() as conn:
        with conn.cursor() as cursor:
            cursor.execute('''
                INSERT INTO Settings (customer_id, key, value) VALUES (%s, %s, %s)
                ON CONFLICT (customer_id, key) DO UPDATE SET value = EXCLUDED.value
            ''', (customer_id, key, str(value)))
        conn.commit()

# --- البصمات (Attendance) ---
def edit_attendance_log(customer_id, pin, old_timestamp, new_timestamp):
    try:
        with get_db_conn() as conn:
            with conn.cursor() as cursor:
                cursor.execute('''
                    UPDATE Attendance SET timestamp = %s 
                    WHERE customer_id = %s AND user_pin = %s AND timestamp = %s
                ''', (new_timestamp, customer_id, str(pin), old_timestamp))
                if cursor.rowcount == 0: return False
            conn.commit()
        return True
    except Exception as e:
        log_system_event(customer_id, 'ERROR', f'فشل تعديل سجل بصمة: {str(e)}')
        return False

def delete_attendance_log(customer_id, pin, timestamp):
    try:
        with get_db_conn() as conn:
            with conn.cursor() as cursor:
                cursor.execute('''
                    DELETE FROM Attendance 
                    WHERE customer_id = %s AND user_pin = %s AND timestamp = %s
                ''', (customer_id, str(pin), timestamp))
                if cursor.rowcount == 0: return False
            conn.commit()
        return True
    except Exception as e:
        log_system_event(customer_id, 'ERROR', f'فشل حذف سجل بصمة: {str(e)}')
        return False

# --- المهام الإضافية (Extra Tasks) ---
def get_extra_tasks_for_user(customer_id, pin, start_date=None, end_date=None):
    with get_db_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            query = "SELECT * FROM ExtraTasks WHERE customer_id = %s AND user_pin = %s"
            params = [customer_id, str(pin)]
            if start_date and end_date:
                query += " AND date >= %s AND date <= %s"
                params.extend([start_date, end_date])
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

def save_extra_task(customer_id, pin, task_name, task_value, date, is_monthly=0):
    with get_db_conn() as conn:
        with conn.cursor() as cursor:
            cursor.execute('''
                INSERT INTO ExtraTasks (customer_id, user_pin, task_name, task_value, date, is_monthly)
                VALUES (%s, %s, %s, %s, %s, %s)
            ''', (customer_id, str(pin), task_name, float(task_value), date, int(is_monthly)))
        conn.commit()

def delete_extra_task(customer_id, task_id):
    with get_db_conn() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM ExtraTasks WHERE customer_id = %s AND id = %s", (customer_id, task_id))
        conn.commit()
