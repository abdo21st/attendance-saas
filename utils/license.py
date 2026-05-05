"""
نظام ترخيص البرنامج مبني على MAC كرت الإيثرنت
منطق المفتاح: أول حرف من كل خانة في MAC
مثال: 34-5A-60-AF-42-19  →  مفتاح = 356A41
"""
import subprocess
import os
import sys
import hashlib

def _get_base_dir() -> str:
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

LICENSE_FILE = os.path.join(_get_base_dir(), 'license.lic')

# ──────────────────────────────────────────────────────────
# الحصول على MAC كرت الإيثرنت الفيزيائي
# ──────────────────────────────────────────────────────────
def get_ethernet_mac() -> str:
    """
    يجلب MAC كرت الإيثرنت الفيزيائي (ليس Wi-Fi أو Bluetooth أو Virtual).
    يُعيد الصيغة XX-XX-XX-XX-XX-XX  أو None إذا لم يجد.
    """
    try:
        result = subprocess.run(
            ['getmac', '/FO', 'CSV', '/NH', '/V'],
            capture_output=True, text=True, encoding='utf-8', errors='replace',
            timeout=5
        )
        lines = result.stdout.strip().splitlines()
        
        # كلمات ترشيح السطور التي نريدها (إيثرنت فيزيائي)
        PREFER_KEYWORDS  = ['ethernet', 'realtek', 'intel', 'gigabit', 'lan', 'family controller']
        EXCLUDE_KEYWORDS = ['wi-fi', 'wifi', 'bluetooth', 'wireless', 'virtual', 'vpn',
                            'loopback', 'virtualbox', 'vmware', 'hyper-v', 'tunnel', 'disconnected']
        
        best = None
        for line in lines:
            parts = [p.strip('"') for p in line.split('","')]
            if len(parts) < 4:
                continue
            conn_name, adapter_name, mac, transport = parts[0], parts[1], parts[2], parts[3]
            
            combined = (conn_name + adapter_name).lower()
            mac = mac.strip()
            
            # تجاهل المحولات الوهمية ومنفصلة
            if any(kw in combined for kw in EXCLUDE_KEYWORDS):
                continue
            if any(kw in transport.lower() for kw in ['disconnected', 'n/a']):
                continue
            if not mac or len(mac) != 17:
                continue
            
            if any(kw in combined for kw in PREFER_KEYWORDS):
                return mac  # وجدنا المثالي، نعيده فوراً
            
            if best is None:
                best = mac  # احتفظ بأول مناسب

        return best
    except Exception:
        return None

# ──────────────────────────────────────────────────────────
# توليد مفتاح الترخيص من MAC
# ──────────────────────────────────────────────────────────
def generate_license_key(mac: str) -> str:
    """
    المفتاح = (أول حرف كل خانة) + (آخر حرف كل خانة)
    مثال: 34-5A-60-AF-42-19  →  356A41 + 4A0F29 = 356A414A0F29
    """
    segments = mac.upper().replace(':', '-').split('-')
    first_chars = ''.join(s[0] for s in segments if s)
    last_chars  = ''.join(s[-1] for s in segments if s)
    return first_chars + last_chars

def _hash_key(key: str) -> str:
    return hashlib.sha256(key.upper().encode()).hexdigest()

# ──────────────────────────────────────────────────────────
# عمليات ملف الترخيص
# ──────────────────────────────────────────────────────────
def is_activated() -> bool:
    """التحقق من أن البرنامج مُفعَّل على هذا الجهاز."""
    if not os.path.exists(LICENSE_FILE):
        return False
    try:
        with open(LICENSE_FILE, 'r') as f:
            stored_hash = f.read().strip()
        mac = get_ethernet_mac()
        if not mac:
            return False
        expected_key = generate_license_key(mac)
        return stored_hash == _hash_key(expected_key)
    except Exception:
        return False

def activate(entered_key: str, mac: str = None) -> bool:
    """
    يحاول تفعيل البرنامج بالمفتاح المُدخل.
    يُعيد True عند النجاح.
    """
    if mac is None:
        mac = get_ethernet_mac()
    if not mac:
        return False
    expected_key = generate_license_key(mac)
    if entered_key.strip().upper() == expected_key.upper():
        try:
            with open(LICENSE_FILE, 'w') as f:
                f.write(_hash_key(expected_key))
            return True
        except Exception:
            return False
    return False
