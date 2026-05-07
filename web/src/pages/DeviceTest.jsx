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
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices);
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 10000); // تحديث كل 10 ثواني لصفحة الاختبار
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-container">
      <header className="page-header flex-between">
        <div>
          <h1>اختبار اتصال الأجهزة</h1>
          <p>تأكد من حالة اتصال أجهزة البصمة المربوطة بحسابك</p>
        </div>
        <button 
          onClick={fetchDevices} 
          className={`btn-icon ${refreshing ? 'spin' : ''}`}
          title="تحديث الحالة الآن"
        >
          <RefreshCw size={24} />
        </button>
      </header>

      {loading ? (
        <div className="flex-center mt-4">
          <RefreshCw className="spin text-blue" size={40} />
        </div>
      ) : devices.length === 0 ? (
        <div className="stat-card flex-center mt-4">
          <p>لا توجد أجهزة مسجلة في حسابك حالياً.</p>
        </div>
      ) : (
        <div className="stats-grid">
          {devices.map((dev) => (
            <div key={dev.sn} className={`stat-card device-card ${dev.connected ? 'border-success' : 'border-danger'}`}>
              <div className={`stat-icon ${dev.connected ? 'bg-green' : 'bg-red'}`}>
                {dev.connected ? <Wifi size={32} /> : <WifiOff size={32} />}
              </div>
              
              <div className="stat-info full-width">
                <div className="flex-between">
                  <h3>{dev.model}</h3>
                  <span className={`badge ${dev.connected ? 'text-green' : 'text-red'}`}>
                    {dev.connected ? 'متصل الآن' : 'غير متصل'}
                  </span>
                </div>
                
                <div className="stat-value font-mono" style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>
                  {dev.sn}
                </div>

                <div className="device-meta-grid mt-4">
                  <div className="meta-item">
                    <Clock size={14} />
                    <span>آخر ظهور: {dev.last_seen}</span>
                  </div>
                  <div className="meta-item">
                    <UserCheck size={14} />
                    <span>الموظفون: {dev.user_count}</span>
                  </div>
                  <div className="meta-item">
                    <Database size={14} />
                    <span>السجلات: {dev.log_count}</span>
                  </div>
                  {dev.pending_cmds > 0 && (
                    <div className="meta-item text-warning">
                      <RefreshCw size={14} className="spin" />
                      <span>أوامر معلقة: {dev.pending_cmds}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 alert-info" style={{ textAlign: 'right' }}>
        <h3>تعليمات الربط:</h3>
        <ul style={{ marginRight: '1.5rem', marginTop: '0.5rem' }}>
          <li>تأكد من إدخال السيرفر <code>attendance.ordermt.ly</code> في إعدادات ADMS بالجهاز.</li>
          <li>تأكد من استخدام المنفذ <code>80</code>.</li>
          <li>إذا كان الجهاز يظهر "غير متصل"، يرجى التحقق من اتصال الإنترنت في الصيدلية.</li>
        </ul>
      </div>
    </div>
  );
}

export default DeviceTest;
