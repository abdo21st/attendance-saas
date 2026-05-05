import threading

# قائمة المتصفحات المتصلة لاستقبال التحديثات الحية
event_clients = []
clients_lock = threading.Lock()

def broadcast(event_type: str, data: dict):
    """إرسال حدث لجميع المتصفحات المتصلة (SSE)"""
    import json
    msg = f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
    with clients_lock:
        for q in event_clients:
            q.put(msg)

def log_msg(text: str):
    """طباعة رسالة في الكونسول وإرسالها للواجهة"""
    import datetime
    t = datetime.datetime.now().strftime("%H:%M:%S")
    try:
        print(f"[{t}] {text}", flush=True)
    except (OSError, AttributeError):
        pass  # يحدث عند التشغيل كـ .exe بدون console
    broadcast('log', text)
