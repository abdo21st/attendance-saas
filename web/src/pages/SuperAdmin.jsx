import { useState, useEffect } from 'react';
import { Building2, Cpu, Plus, List, ShieldCheck } from 'lucide-react';

function SuperAdmin() {
  const [token, setToken] = useState('');
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

  const addCustomer = async (e) => {
    e.preventDefault();
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
  };

  const addDevice = async (e) => {
    e.preventDefault();
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
  };

  if (!isAuthorized) {
    return (
      <div className="flex-center" style={{ minHeight: '80vh' }}>
        <div className="login-card" style={{ maxWidth: '400px' }}>
          <div className="text-center mb-4">
            <ShieldCheck size={48} className="text-blue mb-2" />
            <h2>لوحة التحكم العليا</h2>
            <p className="text-muted">يرجى إدخال رمز الوصول السري</p>
          </div>
          <input 
            type="password" 
            className="full-width mb-3" 
            style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Secret Token"
          />
          <button className="btn-primary full-width" onClick={fetchAll}>دخول</button>
          {msg.text && <p className={`mt-3 text-center text-${msg.type === 'error' ? 'red' : 'green'}`}>{msg.text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>إدارة النظام (SaaS Console)</h1>
        <p>إدارة الشركات والزبائن والأجهزة المرتبطة</p>
      </header>

      {msg.text && (
        <div className={`alert-${msg.type}`} style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '8px' }}>
          {msg.text}
        </div>
      )}

      <div className="stats-grid">
        {/* إضافة شركة */}
        <div className="stat-card" style={{ display: 'block' }}>
          <div className="flex-between mb-4">
            <h3>إضافة شركة جديدة</h3>
            <Building2 size={24} className="text-blue" />
          </div>
          <form onSubmit={addCustomer}>
            <input 
              type="text" 
              className="full-width mb-2" 
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', color: 'white', padding: '0.6rem', borderRadius: '6px' }}
              placeholder="اسم الشركة"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
              required
            />
            <input 
              type="email" 
              className="full-width mb-3" 
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', color: 'white', padding: '0.6rem', borderRadius: '6px' }}
              placeholder="بريد المسؤول"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
            />
            <button className="btn-primary full-width"><Plus size={18} /> إضافة</button>
          </form>
        </div>

        {/* ربط جهاز */}
        <div className="stat-card" style={{ display: 'block' }}>
          <div className="flex-between mb-4">
            <h3>ربط جهاز بصمة</h3>
            <Cpu size={24} className="text-purple" />
          </div>
          <form onSubmit={addDevice}>
            <input 
              type="text" 
              className="full-width mb-2" 
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', color: 'white', padding: '0.6rem', borderRadius: '6px' }}
              placeholder="رقم السيريال (SN)"
              value={newDevice.sn}
              onChange={(e) => setNewDevice({...newDevice, sn: e.target.value})}
              required
            />
            <select 
              className="full-width mb-3" 
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', color: 'white', padding: '0.6rem', borderRadius: '6px' }}
              value={newDevice.customer_id}
              onChange={(e) => setNewDevice({...newDevice, customer_id: e.target.value})}
              required
            >
              <option value="">اختر الشركة...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} (ID: {c.id})</option>
              ))}
            </select>
            <button className="btn-primary full-width" style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}><Plus size={18} /> ربط الجهاز</button>
          </form>
        </div>
      </div>

      <div className="recent-activity">
        <h2>قائمة الشركات المشتركة</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>اسم الشركة</th>
                <th>البريد</th>
                <th>تاريخ الانضمام</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td><span className="badge">{c.id}</span></td>
                  <td><strong>{c.name}</strong></td>
                  <td>{c.admin_email}</td>
                  <td>{new Date(c.created_at).toLocaleDateString('ar-LY')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SuperAdmin;
