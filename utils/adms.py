from collections import deque
from datetime import datetime
import threading
from utils.database import device_info, save_user, get_user_by_pin, add_attendance_log, get_recent_logs, get_all_users
from utils.events import broadcast, log_msg

command_queue = deque()
queue_lock = threading.RLock()

# ===================================================
# أوامر الجهاز
# ===================================================
def enqueue(cmd: str):
    """إضافة أمر لإرساله للجهاز في الـ heartbeat التالي"""
    with queue_lock:
        command_queue.append(cmd)
    log_msg(f"[أمر] {cmd.strip()}")

# ===================================================
# معالجة بيانات الجهاز
# ===================================================
def ensure_user_from_log(customer_id, user_id: str):
    """إنشاء مستخدم تلقائي إذا وُجد في ATTLOG ولم يُعرَّف بعد"""
    user = get_user_by_pin(customer_id, user_id)
    if not user:
        save_user(customer_id, user_id, f'مستخدم {user_id}', role=0, password='')

def process_attlog(customer_id, body: str):
    """تحليل بيانات ATTLOG القادمة من الجهاز"""
    new_records = []
    for line in body.strip().split('\n'):
        line = line.strip('\r\n ')
        if not line:
            continue
        # تجاهل سطور الإعداد
        if '=' in line and '\t' not in line and len(line.split()) < 3:
            continue
        parts = line.split()
        if len(parts) < 3:
            continue
        try:
            uid       = parts[0]
            timestamp = f"{parts[1]} {parts[2]}"
            verify    = int(parts[4]) if len(parts) >= 5 else 0

            added = add_attendance_log(customer_id, uid, timestamp, verify)
            if added:
                rec = {
                    'customer_id':  customer_id,
                    'UserId':       uid,
                    'Timestamp':    timestamp,
                    'VerifyMethod': verify,
                    'ReceivedAt':   datetime.now().isoformat()
                }
                new_records.append(rec)

            ensure_user_from_log(customer_id, uid)
            log_msg(f"[ATTLOG - Tenant {customer_id}] {uid} - {timestamp}")

        except Exception as e:
            log_msg(f"[خطأ] تحليل ATTLOG: {e}")

    if new_records:
        for rec in new_records:
            # يمكن تعديل هذا ليتم بثه فقط للمستخدمين التابعين لنفس الـ customer_id
            broadcast('new_log', rec)

def process_users(customer_id, body: str):
    """تحليل بيانات USER القادمة من الجهاز"""
    count = 0
    for line in body.strip().split('\n'):
        line = line.strip('\r\n ')
        if not line.startswith('USER'):
            continue
        try:
            fields = {}
            sep = '\t' if '\t' in line else ' '
            for part in line.split(sep):
                if '=' in part:
                    k, _, v = part.partition('=')
                    fields[k.strip()] = v.strip()
            pin = fields.get('PIN', '')
            if not pin:
                continue
            
            name = fields.get('Name', f'مستخدم {pin}')
            role = int(fields.get('Pri', 0) or 0)
            pwd = fields.get('Passwd', '')
            
            existing_user = get_user_by_pin(customer_id, pin)
            hourly_rate = existing_user['hourly_rate'] if existing_user else 0.0
            
            save_user(customer_id, pin, name, role, pwd, hourly_rate)
            count += 1
            log_msg(f"[مستخدم - Tenant {customer_id}] PIN={pin} Name={name}")
        except Exception as e:
            log_msg(f"[خطأ] تحليل USER: {e}")

    if count:
        all_users = get_all_users(customer_id)
        broadcast('users_updated', {'count': len(all_users), 'customer_id': customer_id})
