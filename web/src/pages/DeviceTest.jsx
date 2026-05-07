import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Cpu, Database, UserCheck, Clock } from 'lucide-react';

function DeviceTest() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDevices = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/device/list');
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.error('Fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-container">
      <header className="page-header mb-4">
        <div className="flex-between">
          <div>
            <h1>مركز تشخيص الأجهزة</h1>
            <p>مراقبة حالة اتصال أجهزة البصمة والبيانات الحيوية بشكل فوري</p>
          </div>
          <button 
            onClick={fetchDevices} 
            className="btn-primary"
          >
            <RefreshCw size={20} className={refreshing ? 'spin' : ''} /> تحديث البيانات
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex-center" style={{ height: '300px' }}>
          <RefreshCw className="spin text-blue" size={48} />
        </div>
      ) : devices.length === 0 ? (
        <div className="glass-card flex-center" style={{ height: '200px' }}>
          <p>لا توجد أجهزة مسجلة في هذا الحساب حالياً.</p>
        </div>
      ) : (
        <div className="stats-grid">
          {devices.map((dev) => (
            <div key={dev.sn} className="glass-card" style={{ padding: '2rem' }}>
              <div className="flex-between mb-4">
                <div className="icon-box" style={{ color: dev.connected ? 'var(--success)' : 'var(--danger)', width: '80px', height: '80px' }}>
                  {dev.connected ? <Wifi size={40} /> : <WifiOff size={40} />}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span className={`status-pill ${dev.connected ? 'success' : 'danger'}`}>
                    {dev.connected ? 'متصل' : 'غير متصل'}
                  </span>
                </div>
              </div>
              
              <div className="mb-4">
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{dev.model}</h2>
                <code className="font-mono text-muted" style={{ fontSize: '1rem' }}>{dev.sn}</code>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                <div className="flex-center gap-1" style={{ justifyContent: 'flex-start' }}>
                  <UserCheck size={18} className="text-dim" />
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>الموظفون</div>
                    <div style={{ fontWeight: 700 }}>{dev.user_count}</div>
                  </div>
                </div>
                <div className="flex-center gap-1" style={{ justifyContent: 'flex-start' }}>
                  <Database size={18} className="text-dim" />
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>السجلات</div>
                    <div style={{ fontWeight: 700 }}>{dev.log_count}</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex-between" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div className="flex-center gap-1">
                  <Clock size={14} />
                  <span>آخر ظهور: {dev.last_seen}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card mt-4" style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
        <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>إرشادات الاتصال السريع</h3>
        <ul style={{ paddingRight: '1.5rem', color: 'var(--text-dim)', fontSize: '0.95rem' }}>
          <li>عنوان الخادم: <code style={{ color: 'white' }}>attendance.ordermt.ly</code></li>
          <li>المنفذ الافتراضي: <code style={{ color: 'white' }}>80</code></li>
          <li>يتم تحديث البيانات تلقائياً كل 10 ثواني في هذه الصفحة.</li>
        </ul>
      </div>
    </div>
  );
}

export default DeviceTest;
