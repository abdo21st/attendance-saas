import { useState, useEffect } from 'react';

function SuperAdmin() {
  const [token, setToken] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const fetchAll = async () => {
    try {
      const res = await fetch('/api/superadmin/list', {
        headers: { 'X-Super-Admin-Token': token }
      });
      const data = await res.json();
      if (data.customers) {
        setCustomers(data.customers);
        setDevices(data.devices);
        setIsAuthorized(true);
      } else {
        setMsg({ text: 'رمز الدخول غير صحيح', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'خطأ في الاتصال بالسيرفر', type: 'error' });
    }
  };

  if (!isAuthorized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: 'white', direction: 'rtl' }}>
        <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', width: '350px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>لوحة التحكم العليا</h2>
          <input 
            type="password" 
            style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="الرمز السري"
          />
          <button 
            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
            onClick={fetchAll}
          >
            دخول
          </button>
          {msg.text && <p style={{ marginTop: '1rem', color: '#ef4444' }}>{msg.text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', color: 'white', direction: 'rtl' }}>
      <h1>لوحة التحكم العليا - تم الدخول</h1>
      <p>عدد الشركات: {customers.length}</p>
      <p>عدد الأجهزة: {devices.length}</p>
      <button onClick={() => setIsAuthorized(false)}>خروج</button>
    </div>
  );
}

export default SuperAdmin;
