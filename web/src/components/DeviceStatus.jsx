import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cpu, Info, RefreshCw } from 'lucide-react';

function DeviceStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(new Date());

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/device/status');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      if (data.success) {
        setStatus(data);
        setLastCheck(new Date());
      }
    } catch (err) {
      console.error('DeviceStatus error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) return null;

  const isConnected = status?.connected;

  return (
    <div className="device-status-badge glass shadow-lg">
      <div className={`status-dot ${isConnected ? 'online' : 'offline'}`} style={{ color: isConnected ? 'var(--success)' : 'var(--danger)' }}></div>
      <div className="status-main">
        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
          {isConnected ? 'الجهاز متصل' : 'الجهاز غير متصل'}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          تحديث: {lastCheck.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div className="flex-center" style={{ marginLeft: 'auto', paddingLeft: '0.5rem', borderLeft: '1px solid var(--glass-border)' }}>
         {isConnected ? <Wifi size={18} className="text-success" /> : <WifiOff size={18} className="text-danger" />}
      </div>
    </div>
  );
}

export default DeviceStatus;
