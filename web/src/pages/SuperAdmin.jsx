import { useState, useEffect } from 'react';
import { Building, Cpu, Plus, Shield, LogOut, List, Edit2, Calendar, Phone, User, Lock, Hash, Eye, EyeOff, RefreshCw } from 'lucide-react';

function SuperAdmin() {
  const [token, setToken] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  
  // Forms
  const [newCustomer, setNewCustomer] = useState({ name: '', admin_name: '', phone: '', email: '', admin_pin: '1000', admin_password: 'admin' });
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [newDevice, setNewDevice] = useState({ sn: '', customer_id: '' });
  const [editingDevice, setEditingDevice] = useState(null);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [showPwd, setShowPwd] = useState(false);

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

  const fetchSystemLogs = async () => {
    try {
      const res = await fetch('/api/superadmin/logs', {
        headers: { 'X-Super-Admin-Token': token }
      });
      const data = await res.json();
      if (data.success) setSystemLogs(data.logs);
    } catch (err) {}
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchAll();
      fetchSystemLogs();
      const interval = setInterval(fetchSystemLogs, 30000);
      return () => clearInterval(interval);
    }
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
        setNewCustomer({ name: '', admin_name: '', phone: '', email: '', admin_pin: '1000', admin_password: 'admin' });
        fetchAll();
      }
    } catch (err) { setMsg({ text: 'فشل الإضافة', type: 'error' }); }
  };

  const updateCustomer = async (e) => {
    e.preventDefault();
    try {
      // التأكد من أن الحقول غير فارغة قبل الإرسال
      const payload = {
        ...editingCustomer,
        admin_pin: editingCustomer.admin_pin || '1000',
        admin_password: editingCustomer.admin_password || 'admin'
      };
      
      const res = await fetch(`/api/superadmin/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Super-Admin-Token': token },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setMsg({ text: 'تم تحديث بيانات الشركة بنجاح', type: 'success' });
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
              style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #334155', background: 'rgba(0,0,0,0.2)', color: 'white', textAlign: 'center' }}
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

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
        {/* إضافة شركة */}
        <div className="stat-card" style={{ display: 'block', height: 'fit-content', padding: '2rem' }}>
          <div className="flex-between mb-6">
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.4rem' }}>{editingCustomer ? 'تعديل شركة' : 'إضافة شركة جديدة'}</h3>
            <Building size={32} className="text-blue" />
          </div>
          <form onSubmit={editingCustomer ? updateCustomer : addCustomer}>
            <div className="form-group">
              <label>اسم الشركة</label>
              <input 
                type="text" 
                placeholder="مثال: شركة النور"
                value={editingCustomer ? editingCustomer.name : newCustomer.name}
                onChange={(e) => editingCustomer ? setEditingCustomer({...editingCustomer, name: e.target.value}) : setNewCustomer({...newCustomer, name: e.target.value})}
                required
              />
            </div>
            <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px', padding: 0, marginBottom: '0' }}>
              <div className="form-group">
                <label>اسم المسؤول</label>
                <input 
                  type="text" 
                  placeholder="الاسم الثلاثي"
                  value={editingCustomer ? editingCustomer.admin_name : newCustomer.admin_name}
                  onChange={(e) => editingCustomer ? setEditingCustomer({...editingCustomer, admin_name: e.target.value}) : setNewCustomer({...newCustomer, admin_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>رقم الهاتف</label>
                <input 
                  type="text" 
                  placeholder="09XXXXXXXX"
                  value={editingCustomer ? editingCustomer.phone : newCustomer.phone}
                  onChange={(e) => editingCustomer ? setEditingCustomer({...editingCustomer, phone: e.target.value}) : setNewCustomer({...newCustomer, phone: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px', padding: 0, marginBottom: '0' }}>
              <div className="form-group">
                <label>رقم الموظف (PIN)</label>
                <input 
                  type="text" 
                  placeholder="1000"
                  value={editingCustomer ? (editingCustomer.admin_pin || '') : newCustomer.admin_pin}
                  onChange={(e) => editingCustomer ? setEditingCustomer({...editingCustomer, admin_pin: e.target.value}) : setNewCustomer({...newCustomer, admin_pin: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>كلمة المرور</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPwd ? "text" : "password"}
                    placeholder="password"
                    value={editingCustomer ? (editingCustomer.admin_password || '') : newCustomer.admin_password}
                    onChange={(e) => editingCustomer ? setEditingCustomer({...editingCustomer, admin_password: e.target.value}) : setNewCustomer({...newCustomer, admin_password: e.target.value})}
                    required
                  />
                  <button type="button" className="btn-icon" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent' }} onClick={() => setShowPwd(!showPwd)}>
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>البريد الإلكتروني (اختياري)</label>
              <input 
                type="email" 
                placeholder="example@mail.com"
                value={editingCustomer ? (editingCustomer.admin_email || '') : newCustomer.email}
                onChange={(e) => editingCustomer ? setEditingCustomer({...editingCustomer, admin_email: e.target.value}) : setNewCustomer({...newCustomer, email: e.target.value})}
              />
            </div>
            <div className="flex-center mt-6 gap-3">
              <button className="btn-primary full-width"><Plus size={20} /> {editingCustomer ? 'حفظ التعديلات' : 'إضافة الشركة'}</button>
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
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', color: 'white', padding: '0.8rem', borderRadius: '8px', textAlign: 'center' }}
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
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #334155', color: 'white', padding: '0.8rem', borderRadius: '8px', textAlign: 'center' }}
                  value={editingDevice.subscription_end}
                  onChange={(e) => setEditingDevice({...editingDevice, subscription_end: e.target.value})}
                  required
                />
              </div>
            ) : (
              <div className="form-group">
                <select 
                  className="full-width" 
                  style={{ background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '0.8rem', borderRadius: '8px', textAlign: 'center' }}
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
              <th>بيانات الدخول (Admin)</th>
              <th>الأجهزة والاشتراكات</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr><td colSpan="6" className="text-center p-4">لا توجد شركات مسجلة بعد</td></tr>
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
                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', color: '#fbbf24' }}>
                        <span><Hash size={12} inline /> {c.admin_pin || '1000'}</span>
                        <span><Lock size={12} inline /> {c.admin_password || 'admin'}</span>
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
      {/* سجلات النظام */}
      <div className="table-container mt-4" style={{ borderTop: '2px solid #334155' }}>
        <div className="flex-between p-3" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
          <h2 style={{ fontSize: '1.2rem' }}>سجلات النظام العالمية (Global System Logs)</h2>
          <button className="btn-icon" onClick={fetchSystemLogs}><RefreshCw size={16} /></button>
        </div>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>الوقت</th>
                <th>الشركة</th>
                <th>الجهاز</th>
                <th>المستوى</th>
                <th>الرسالة</th>
              </tr>
            </thead>
            <tbody>
              {systemLogs.length === 0 ? (
                <tr><td colSpan="5" className="text-center p-4">لا توجد سجلات حالياً</td></tr>
              ) : (
                systemLogs.map(log => (
                  <tr key={log.id}>
                    <td className="font-mono" style={{ fontSize: '0.8rem' }}>{log.created_at}</td>
                    <td>{log.customer_name}</td>
                    <td><span className="badge">{log.device_sn || '—'}</span></td>
                    <td>
                      <span className={`status-pill ${log.level === 'ERROR' ? 'danger' : log.level === 'WARNING' ? 'warning' : 'info'}`}>
                        {log.level}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{log.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SuperAdmin;
