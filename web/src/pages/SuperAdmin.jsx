import { useState, useEffect } from 'react';
import { Building, Cpu, Plus, Shield, LogOut, List } from 'lucide-react';

function SuperAdmin() {
  const [token, setToken] = useState('AdminSecret2024');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [devices, setDevices] = useState([]);
  
  // Forms
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '' });
  const [newDevice, setNewDevice] = useState({ sn: '', customer_id: '' });
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

  useEffect(() => {
    if (isAuthorized) fetchAll();
  }, [isAuthorized]);

  const addCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/superadmin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Super-Admin-Token': token },
        body: JSON.stringify(newCustomer)
      });
      if (res.ok) {
        setMsg({ text: 'تم إضافة الشركة بنجاح', type: 'success' });
        setNewCustomer({ name: '', email: '' });
        fetchAll();
      }
    } catch (err) { setMsg({ text: 'فشل الإضافة', type: 'error' }); }
  };

  const addDevice = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/superadmin/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Super-Admin-Token': token },
        body: JSON.stringify(newDevice)
      });
      if (res.ok) {
        setMsg({ text: 'تم ربط الجهاز بنجاح', type: 'success' });
        setNewDevice({ sn: '', customer_id: '' });
        fetchAll();
      }
    } catch (err) { setMsg({ text: 'فشل الربط', type: 'error' }); }
  };

  if (!isAuthorized) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ maxWidth: '400px' }}>
          <div className="login-header">
            <Shield size={48} className="text-blue mb-2" style={{ margin: '0 auto' }} />
            <h2>Control Center</h2>
            <p>لوحة الإدارة المركزية (Super Admin)</p>
          </div>
          <div className="form-group">
            <label>رمز الوصول السري</label>
            <input 
              type="password" 
              className="full-width" 
              style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #334155', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter Token..."
            />
          </div>
          <button className="btn-primary full-width" onClick={fetchAll}>دخول للإدارة</button>
          {msg.text && <div className={`alert-${msg.type} mt-3`}>{msg.text}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header className="page-header flex-between">
        <div>
          <h1>إدارة المنصة (SaaS Management)</h1>
          <p>تحكم في الشركات، الأجهزة، والاشتراكات</p>
        </div>
        <button className="logout-btn" style={{ width: 'auto' }} onClick={() => setIsAuthorized(false)}>
          <LogOut size={18} /> خروج
        </button>
      </header>

      {msg.text && <div className={`alert-${msg.type}`}>{msg.text}</div>}

      <div className="stats-grid">
        {/* إضافة شركة */}
        <div className="stat-card" style={{ display: 'block', height: 'fit-content' }}>
          <div className="flex-between mb-4">
            <h3 style={{ color: 'var(--text-primary)' }}>إضافة شركة جديدة</h3>
            <Building size={24} className="text-blue" />
          </div>
          <form onSubmit={addCustomer}>
            <div className="form-group">
              <input 
                type="text" 
                className="full-width" 
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', color: 'white', padding: '0.8rem', borderRadius: '8px' }}
                placeholder="اسم الشركة"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <input 
                type="email" 
                className="full-width" 
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', color: 'white', padding: '0.8rem', borderRadius: '8px' }}
                placeholder="بريد المسؤول"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
              />
            </div>
            <button className="btn-primary full-width"><Plus size={18} /> إضافة الشركة</button>
          </form>
        </div>

        {/* ربط جهاز */}
        <div className="stat-card" style={{ display: 'block', height: 'fit-content' }}>
          <div className="flex-between mb-4">
            <h3 style={{ color: 'var(--text-primary)' }}>ربط جهاز بصمة</h3>
            <Cpu size={24} className="text-purple" />
          </div>
          <form onSubmit={addDevice}>
            <div className="form-group">
              <input 
                type="text" 
                className="full-width" 
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', color: 'white', padding: '0.8rem', borderRadius: '8px' }}
                placeholder="رقم السيريال (SN)"
                value={newDevice.sn}
                onChange={(e) => setNewDevice({...newDevice, sn: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <select 
                className="full-width" 
                style={{ background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '0.8rem', borderRadius: '8px' }}
                value={newDevice.customer_id}
                onChange={(e) => setNewDevice({...newDevice, customer_id: e.target.value})}
                required
              >
                <option value="">اختر الشركة...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (ID: {c.id})</option>
                ))}
              </select>
            </div>
            <button className="btn-primary full-width" style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}>
              <Plus size={18} /> ربط الجهاز
            </button>
          </form>
        </div>
      </div>

      <div className="table-container mt-4">
        <div className="flex-between p-3" style={{ background: 'rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.2rem' }}>الشركات المشتركة حالياً</h2>
          <List size={20} className="text-muted" />
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>اسم الشركة</th>
              <th>البريد الإلكتروني</th>
              <th>تاريخ الانضمام</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr><td colSpan="4" className="text-center p-4">لا توجد شركات مسجلة بعد</td></tr>
            ) : (
              customers.map(c => (
                <tr key={c.id}>
                  <td><span className="badge">{c.id}</span></td>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.admin_email || '—'}</td>
                  <td>{new Date(c.created_at).toLocaleDateString('ar-LY')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SuperAdmin;
