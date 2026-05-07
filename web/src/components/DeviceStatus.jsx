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
    const interval = setInterval(fetchStatus, 30000); // تحديث كل 30 ثانية
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) return null;

  const isConnected = status?.connected;

  return (
    <div className="device-status-badge shadow-glass">
      <div className="status-indicator">
        <div className={`status-dot ${isConnected ? 'online' : 'offline'}`}></div>
        <div className="status-main">
          <div className="status-label">
            {isConnected ? 'الجهاز متصل' : 'الجهاز غير متصل'}
          </div>
          <div className="status-time">
            تحديث: {lastCheck.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="status-icon-box">
          {isConnected ? <Wifi size={18} className="text-success" /> : <WifiOff size={18} className="text-danger" />}
        </div>
      </div>

      {/* حوام (Tooltip) يظهر عند التمرير أو في نافذة منبثقة صغيرة */}
      <div className="status-details">
        <div className="details-row">
          <Cpu size={14} />
          <span>الموديل: {status?.model || '—'}</span>
        </div>
        <div className="details-row">
          <Info size={14} />
          <span>SN: {status?.sn || '—'}</span>
        </div>
        {status?.pending_cmds > 0 && (
          <div className="details-row text-warning">
            <RefreshCw size={14} className="spin" />
            <span>أوامر معلقة: {status.pending_cmds}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default DeviceStatus;
