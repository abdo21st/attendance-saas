import { useState, useEffect } from 'react';
import { Building, Cpu, Plus, Shield, LogOut, List, Edit2, Calendar, Phone, User } from 'lucide-react';

function SuperAdmin() {
  const [token, setToken] = useState('AdminSecret2024');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [devices, setDevices] = useState([]);
  
  // Forms
  const [newCustomer, setNewCustomer] = useState({ name: '', admin_name: '', phone: '', email: '' });
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [newDevice, setNewDevice] = useState({ sn: '', customer_id: '' });
  const [editingDevice, setEditingDevice] = useState(null);
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
        setNewCustomer({ name: '', admin_name: '', phone: '', email: '' });
        fetchAll();
      }
    } catch (err) { setMsg({ text: 'فشل الإضافة', type: 'error' }); }
  };

  const updateCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/superadmin/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Super-Admin-Token': token },
        body: JSON.stringify(editingCustomer)
      });
      if (res.ok) {
        setMsg({ text: 'تم تحديث بيانات الشركة', type: 'success' });
        setEditingCustomer(null);
        fetchAll();
      }
    } catch (err) { setMsg({ text: 'فشل التحديث', type: 'error' }); }
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

  const updateDevice = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/superadmin/devices/${editingDevice.sn}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Super-Admin-Token': token },
        body: JSON.stringify(editingDevice)
      });
      if (res.ok) {
        setMsg({ text: 'تم تحديث الاشتراك', type: 'success' });
        setEditingDevice(null);
        fetchAll();
      }
    } catch (err) { setMsg({ text: 'فشل تحديث الاشتراك', type: 'error' }); }
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
            <h3 style={{ color: 'var(--text-primary)' }}>{editingCustomer ? 'تعديل شركة' : 'إضافة شركة جديدة'}</h3>
            <Building size={24} className="text-blue" />
          </div>
          <form onSubmit={editingCustomer ? updateCustomer : addCustomer}>
            <div className="form-group">
              <input 
                type="text" 
                className="full-width" 
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', color: 'white', padding: '0.8rem', borderRadius: '8px' }}
                placeholder="اسم الشركة"
                value={editingCustomer ? editingCustomer.name : newCustomer.name}
                onChange={(e) => editingCustomer ? setEditingCustomer({...editingCustomer, name: e.target.value}) : setNewCustomer({...newCustomer, name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <input 
                type="text" 
                className="full-width" 
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', color: 'white', padding: '0.8rem', borderRadius: '8px' }}
                placeholder="اسم المسؤول"
                value={editingCustomer ? editingCustomer.admin_name : newCustomer.admin_name}
                onChange={(e) => editingCustomer ? setEditingCustomer({...editingCustomer, admin_name: e.target.value}) : setNewCustomer({...newCustomer, admin_name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <input 
                type="text" 
                className="full-width" 
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', color: 'white', padding: '0.8rem', borderRadius: '8px' }}
                placeholder="رقم الهاتف"
                value={editingCustomer ? editingCustomer.phone : newCustomer.phone}
                onChange={(e) => editingCustomer ? setEditingCustomer({...editingCustomer, phone: e.target.value}) : setNewCustomer({...newCustomer, phone: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <input 
                type="email" 
                className="full-width" 
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', color: 'white', padding: '0.8rem', borderRadius: '8px' }}
                placeholder="البريد الإلكتروني (اختياري)"
                value={editingCustomer ? (editingCustomer.admin_email || '') : newCustomer.email}
                onChange={(e) => editingCustomer ? setEditingCustomer({...editingCustomer, admin_email: e.target.value}) : setNewCustomer({...newCustomer, email: e.target.value})}
              />
            </div>
            <div className="flex-gap">
              <button className="btn-primary full-width"><Plus size={18} /> {editingCustomer ? 'حفظ التعديلات' : 'إضافة الشركة'}</button>
              {editingCustomer && <button type="button" className="btn-secondary" onClick={() => setEditingCustomer(null)}>إلغاء</button>}
            </div>
          </form>
        </div>

        {/* ربط جهاز / تعديل اشتراك */}
        <div className="stat-card" style={{ display: 'block', height: 'fit-content' }}>
          <div className="flex-between mb-4">
            <h3 style={{ color: 'var(--text-primary)' }}>{editingDevice ? 'تعديل الاشتراك' : 'ربط جهاز بصمة'}</h3>
            <Cpu size={24} className="text-purple" />
          </div>
          <form onSubmit={editingDevice ? updateDevice : addDevice}>
            <div className="form-group">
              <input 
                type="text" 
                className="full-width" 
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', color: 'white', padding: '0.8rem', borderRadius: '8px' }}
                placeholder="رقم السيريال (SN)"
                value={editingDevice ? editingDevice.sn : newDevice.sn}
                onChange={(e) => editingDevice ? null : setNewDevice({...newDevice, sn: e.target.value})}
                readOnly={!!editingDevice}
                required
              />
            </div>
            {editingDevice ? (
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '5px' }}>تاريخ انتهاء الاشتراك</label>
                <input 
                  type="date" 
                  className="full-width" 
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', color: 'white', padding: '0.8rem', borderRadius: '8px' }}
                  value={editingDevice.subscription_end}
                  onChange={(e) => setEditingDevice({...editingDevice, subscription_end: e.target.value})}
                  required
                />
              </div>
            ) : (
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
            )}
            <div className="flex-gap">
              <button className="btn-primary full-width" style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}>
                <Plus size={18} /> {editingDevice ? 'تحديث الاشتراك' : 'ربط الجهاز'}
              </button>
              {editingDevice && <button type="button" className="btn-secondary" onClick={() => setEditingDevice(null)}>إلغاء</button>}
            </div>
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
              <th>الشركة / المسؤول</th>
              <th>بيانات الاتصال</th>
              <th>الأجهزة والاشتراكات</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr><td colSpan="5" className="text-center p-4">لا توجد شركات مسجلة بعد</td></tr>
            ) : (
              customers.map(c => {
                const companyDevices = devices.filter(d => d.customer_id === c.id);
                return (
                  <tr key={c.id}>
                    <td><span className="badge">{c.id}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong>{c.name}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <User size={12} inline /> {c.admin_name || '—'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem' }}>
                        <span><Phone size={12} inline /> {c.phone || '—'}</span>
                        <span className="text-muted">{c.admin_email || '—'}</span>
                      </div>
                    </td>
                    <td>
                      {companyDevices.length === 0 ? (
                        <span className="text-muted">لا توجد أجهزة</span>
                      ) : (
                        companyDevices.map(d => (
                          <div key={d.sn} className="flex-between mb-1" style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                            <span>{d.sn}</span>
                            <span style={{ color: new Date(d.subscription_end) < new Date() ? 'var(--danger)' : 'var(--success)' }}>
                              {d.subscription_end}
                            </span>
                            <button className="btn-icon" onClick={() => setEditingDevice(d)}>
                              <Calendar size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => setEditingCustomer(c)}>
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SuperAdmin;
