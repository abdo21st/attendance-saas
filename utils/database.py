import json
import os
import sys
import psycopg2
import psycopg2.extras
from contextlib import closing

# ===================================================
# إعدادات الاتصال بقاعدة بيانات PostgreSQL
# ===================================================
DB_HOST = os.environ.get('DB_HOST', '102.203.201.52')
DB_PORT = os.environ.get('DB_PORT', '5432')
DB_NAME = os.environ.get('DB_NAME', 'n8n')
DB_USER = os.environ.get('DB_USER', 'n8n')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'n8nDbPass2024')

# ===================================================
# الذاكرة المؤقتة لبيانات الجهاز
# ===================================================
device_info = {
    'sn': None,
    'model': 'SenseFace 2A',
    'connected': False,
    'last_seen': None,
    'user_count': 0,
    'log_count': 0
}

def get_db():
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASSWORD, connect_timeout=10
    )

# ===================================================
# تهيئة القاعدة - Multi-Tenant SaaS
# ===================================================
def init_db():
    try:
        with closing(get_db()) as conn:
            with conn.cursor() as cursor:
                # جدول الشركات/الزبائن
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS Customers (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        admin_email VARCHAR(255),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # جدول الأجهزة والاشتراكات
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS Devices (
                        sn VARCHAR(100) PRIMARY KEY,
                        customer_id INTEGER REFERENCES Customers(id) ON DELETE CASCADE,
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
            conn.commit()

        # زرع زبون افتراضي (لأغراض النظام الحالي قبل الـ SaaS) ومدير نظام
        with closing(get_db()) as conn:
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
                    
                cursor.execute("SELECT value FROM Settings WHERE customer_id = 1 AND key = 'groups'")
                if not cursor.fetchone():
                    default_groups = {
                        "14": {"name": "المدراء (Administrators)", "permissions": ["view_own_profile", "view_logs", "add_logs", "edit_logs", "delete_logs", "view_reports", "view_users", "add_users", "edit_users", "delete_users", "view_settings", "manage_settings", "manage_device", "manage_roles", "manage_tasks"]},
                        "6": {"name": "المشرفين (Supervisors)", "permissions": ["view_own_profile", "view_logs", "add_logs", "view_reports", "view_users", "view_settings"]},
                        "2": {"name": "شؤون الموظفين (HR)", "permissions": ["view_own_profile", "view_logs", "add_logs", "edit_logs", "delete_logs", "view_reports", "view_users", "add_users", "edit_users", "view_settings", "manage_settings"]},
                        "0": {"name": "الموظفين (Employees)", "permissions": ["view_own_profile"]}
                    }
                    cursor.execute('INSERT INTO Settings (customer_id, key, value) VALUES (%s, %s, %s)', (1, 'groups', json.dumps(default_groups, ensure_ascii=False)))
            conn.commit()
    except Exception as e:
        print(f"DB Init Error: {e}")

# ===================================================
# التحقق من صلاحية الجهاز والاشتراك
# ===================================================
def check_device_subscription(sn):
    with closing(get_db()) as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            # إذا لم يتم تمرير SN أو السيريال غير موجود، نعتبره الزبون الافتراضي (1) لأغراض التوافق المؤقت
            if not sn:
                return 1
            
            cursor.execute("SELECT customer_id, subscription_end, is_active FROM Devices WHERE sn = %s", (sn,))
            device = cursor.fetchone()
            
            if not device:
                # إذا الجهاز غير مسجل، يتم تسجيله مؤقتاً للزبون الافتراضي (1) حتى يقوم الآدمن بتعيينه
                cursor.execute("INSERT INTO Devices (sn, customer_id, subscription_start, subscription_end, is_active) VALUES (%s, %s, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', TRUE)", (sn, 1))
                conn.commit()
                return 1
                
            if not device['is_active']:
                return None
                
            # التحقق من تاريخ الانتهاء
            cursor.execute("SELECT CURRENT_DATE <= %s as valid", (device['subscription_end'],))
            is_valid = cursor.fetchone()['valid']
            
            return device['customer_id'] if is_valid else None

def update_device_stats(customer_id):
    pass # سيتم تحديثها لاحقاً

# ===================================================
# دوال التخاطب مع البيانات (CRUD) - Multi-Tenant
# ===================================================
def get_all_users(customer_id=1):
    with closing(get_db()) as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            cursor.execute("SELECT * FROM Users WHERE customer_id = %s", (customer_id,))
            return [dict(row) for row in cursor.fetchall()]

def get_user_by_pin(customer_id, pin):
    with closing(get_db()) as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            cursor.execute("SELECT * FROM Users WHERE customer_id = %s AND pin = %s", (customer_id, str(pin)))
            row = cursor.fetchone()
            return dict(row) if row else None

def save_user(customer_id, pin, name, role=0, password='', hourly_rate=0.0):
    with closing(get_db()) as conn:
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
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM Users WHERE customer_id = %s AND pin = %s", (customer_id, str(pin)))
        conn.commit()

def get_recent_logs(customer_id=1, limit=2000):
    with closing(get_db()) as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            cursor.execute("SELECT user_pin, to_char(timestamp, 'YYYY-MM-DD HH24:MI:SS') as timestamp, verify_method, to_char(received_at, 'YYYY-MM-DD HH24:MI:SS') as received_at FROM Attendance WHERE customer_id = %s ORDER BY timestamp DESC LIMIT %s", (customer_id, limit))
            return [dict(row) for row in cursor.fetchall()]

def get_user_logs(customer_id, pin, start_date, end_date):
    with closing(get_db()) as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            cursor.execute("SELECT user_pin, to_char(timestamp, 'YYYY-MM-DD HH24:MI:SS') as timestamp, verify_method, to_char(received_at, 'YYYY-MM-DD HH24:MI:SS') as received_at FROM Attendance WHERE customer_id = %s AND user_pin = %s AND timestamp >= %s AND timestamp <= %s ORDER BY timestamp ASC", 
                           (customer_id, str(pin), start_date + ' 00:00:00', end_date + ' 23:59:59'))
            return [dict(row) for row in cursor.fetchall()]

def add_attendance_log(customer_id, pin, timestamp, verify_method=0, received_at=None):
    if not received_at:
        from datetime import datetime
        received_at = datetime.now().isoformat()
    try:
        with closing(get_db()) as conn:
            with conn.cursor() as cursor:
                cursor.execute('''
                    INSERT INTO Attendance (customer_id, user_pin, timestamp, verify_method, received_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (customer_id, user_pin, timestamp) DO NOTHING
                ''', (customer_id, str(pin), timestamp, int(verify_method), received_at))
                if cursor.rowcount == 0:
                    return False
            conn.commit()
        return True
    except psycopg2.IntegrityError:
        return False

def edit_attendance_log(customer_id, pin, old_timestamp, new_timestamp):
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE Attendance SET timestamp = %s WHERE customer_id = %s AND user_pin = %s AND timestamp = %s", 
                           (new_timestamp, customer_id, str(pin), old_timestamp))
            changes = cursor.rowcount
        conn.commit()
        return changes > 0

def delete_attendance_log(customer_id, pin, timestamp):
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM Attendance WHERE customer_id = %s AND user_pin = %s AND timestamp = %s", (customer_id, str(pin), timestamp))
            changes = cursor.rowcount
        conn.commit()
    return changes > 0

# ===================================================
# المهام الإضافية والإعدادات
# ===================================================
def add_extra_task(customer_id, pin, task_name, task_value, date=None, is_monthly=0):
    if not date:
        from datetime import datetime
        date = datetime.now().strftime('%Y-%m-%d')
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute('''
                INSERT INTO ExtraTasks (customer_id, user_pin, task_name, task_value, date, is_monthly)
                VALUES (%s, %s, %s, %s, %s, %s)
            ''', (customer_id, str(pin), task_name, float(task_value), date, int(is_monthly)))
        conn.commit()

def get_extra_tasks_for_user(customer_id, pin, start_date=None, end_date=None):
    with closing(get_db()) as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            if start_date and end_date:
                cursor.execute("SELECT id, user_pin, task_name, task_value, to_char(date, 'YYYY-MM-DD') as date, is_monthly FROM ExtraTasks WHERE customer_id = %s AND user_pin = %s AND ((date >= %s AND date <= %s) OR (is_monthly = 1 AND date <= %s)) ORDER BY date DESC", (customer_id, str(pin), start_date, end_date, end_date))
            else:
                cursor.execute("SELECT id, user_pin, task_name, task_value, to_char(date, 'YYYY-MM-DD') as date, is_monthly FROM ExtraTasks WHERE customer_id = %s AND user_pin = %s ORDER BY date DESC", (customer_id, str(pin)))
            return [dict(row) for row in cursor.fetchall()]

def delete_extra_task(customer_id, task_id):
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM ExtraTasks WHERE customer_id = %s AND id = %s", (customer_id, int(task_id)))
        conn.commit()

def get_setting(customer_id, key, default=None):
    with closing(get_db()) as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            cursor.execute("SELECT value FROM Settings WHERE customer_id = %s AND key = %s", (customer_id, key))
            row = cursor.fetchone()
            if row:
                try:
                    import json
                    return json.loads(row['value'])
                except:
                    return row['value']
            return default

def save_setting(customer_id, key, value):
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute('''
                INSERT INTO Settings (customer_id, key, value) VALUES (%s, %s, %s)
                ON CONFLICT (customer_id, key) DO UPDATE SET value = EXCLUDED.value
            ''', (customer_id, key, str(value)))
        conn.commit()

# ===================================================
# التقرير المالي
# ===================================================
# سيتم استخدام الـ customer_id كمعامل في الدالة
