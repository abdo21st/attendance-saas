from collections import deque
from datetime import datetime
import threading
from utils.database import save_user, get_user_by_pin, add_attendance_log, get_recent_logs, get_all_users, update_device_info, log_system_event
from utils.events import broadcast, log_msg

# قاموس لتخزين قوائم الأوامر لكل جهاز بشكل منفصل (Multi-Tenant)
command_queues = {}
queue_lock = threading.RLock()

# ===================================================
# أوامر الجهاز
# ===================================================
def enqueue(sn: str, cmd: str):
    """إضافة أمر لإرساله لجهاز معين (SN) في الـ heartbeat التالي"""
    with queue_lock:
        if sn not in command_queues:
            command_queues[sn] = deque()
        command_queues[sn].append(cmd)
    log_msg(f"[أمر -> {sn}] {cmd.strip()}")

def get_next_command(sn: str):
    """جلب الأمر التالي للجهاز"""
    with queue_lock:
        if sn in command_queues and command_queues[sn]:
            return command_queues[sn].popleft()
    return None

# ===================================================
# معالجة بيانات الجهاز
# ===================================================
def ensure_user_from_log(customer_id, user_id: str):
    """إنشاء مستخدم تلقائي إذا وُجد في ATTLOG ولم يُعرَّف بعد"""
    user = get_user_by_pin(customer_id, user_id)
    if not user:
        save_user(customer_id, user_id, f'مستخدم {user_id}', role=0, password='')

def process_attlog(customer_id, body: str, sn=None):
    """تحليل بيانات ATTLOG القادمة من الجهاز"""
    new_records = []
    lines = body.strip().split('\n')
    all_success = True
    
    for line in lines:
        line = line.strip('\r\n ')
        if not line: continue
        if '=' in line and '\t' not in line: continue 
        
        parts = line.split()
        if len(parts) < 3: continue
        
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
        except Exception as e:
            log_system_event(customer_id, 'ERROR', f"تحليل سجل حضور: {e}", sn)
            all_success = False

    if new_records:
        log_system_event(customer_id, 'INFO', f"تم استقبال وتأكيد {len(new_records)} سجل من {sn}", sn)
        for rec in new_records:
            broadcast('new_log', rec)
        update_device_info(sn, log_count=len(lines))
    
    return all_success

def process_users(customer_id, body: str, sn=None):
    """تحليل بيانات USER القادمة من الجهاز"""
    count = 0
    for line in body.strip().split('\n'):
        line = line.strip('\r\n ')
        if not line.startswith('USER'): continue
        try:
            fields = {}
            sep = '\t' if '\t' in line else ' '
            for part in line.split(sep):
                if '=' in part:
                    k, _, v = part.partition('=')
                    fields[k.strip()] = v.strip()
            
            pin = fields.get('PIN', '')
            if not pin: continue
            
            name = fields.get('Name', f'مستخدم {pin}')
            role = int(fields.get('Pri', 0) or 0)
            pwd = fields.get('Passwd', '')
            
            existing_user = get_user_by_pin(customer_id, pin)
            hourly_rate = existing_user['hourly_rate'] if existing_user else 0.0
            
            save_user(customer_id, pin, name, role, pwd, hourly_rate)
            count += 1
        except Exception as e:
            log_system_event(customer_id, 'ERROR', f"تحليل بيانات مستخدم: {e}", sn)

    if count:
        log_system_event(customer_id, 'INFO', f"تم تحديث {count} مستخدم من الجهاز {sn}", sn)
        all_users = get_all_users(customer_id)
        broadcast('users_updated', {'count': len(all_users), 'customer_id': customer_id})
        update_device_info(sn, user_count=count)
