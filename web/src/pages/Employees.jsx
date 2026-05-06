import { useState, useEffect } from 'react';
import { UserPlus, Edit, Trash2, Save, X, Info } from 'lucide-react';

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [editingEmp, setEditingEmp] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newEmp, setNewEmp] = useState({ pin: '', name: '', password: '', role: 0, hourly_rate: 0 });
  const [msg, setMsg] = useState({ text: '', type: '' });

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (data.success) {
        setEmployees(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const empData = isAdding ? newEmp : editingEmp;
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empData)
      });
      if (res.ok) {
        setMsg({ text: isAdding ? 'تم إضافة الموظف بنجاح' : 'تم تحديث بيانات الموظف', type: 'success' });
        setIsAdding(false);
        setEditingEmp(null);
        setNewEmp({ pin: '', name: '', password: '', role: 0, hourly_rate: 0 });
        fetchEmployees();
      }
    } catch (err) {
      setMsg({ text: 'فشل في حفظ البيانات', type: 'error' });
    }
  };

  const handleDelete = async (pin) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    try {
      const res = await fetch(`/api/users/${pin}`, { method: 'DELETE' });
      if (res.ok) {
        setMsg({ text: 'تم حذف الموظف بنجاح', type: 'success' });
        fetchEmployees();
      }
    } catch (err) {
      setMsg({ text: 'فشل الحذف', type: 'error' });
    }
  };

  return (
    <div className="page-container">
      <header className="page-header flex-between">
        <div>
          <h1>إدارة الموظفين</h1>
          <p>إدارة سجلات الموظفين والرواتب (البيانات تُجلب تلقائياً من جهاز البصمة)</p>
        </div>
        {!isAdding && !editingEmp && (
          <button className="btn-primary flex-center gap-2" onClick={() => setIsAdding(true)}>
            <UserPlus size={18} />
            إضافة موظف
          </button>
        )}
      </header>

      <div className="alert-info mt-2 mb-2" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', padding: '10px', borderRadius: '8px', color: '#60a5fa', fontSize: '0.9rem' }}>
        <Info size={16} inline /> <strong>ملاحظة:</strong> النظام يقوم فقط باستقبال البيانات من أجهزة البصمة ولا يقوم بتغيير أي بيانات داخل الجهاز لضمان سلامة الأجهزة.
      </div>

      {msg.text && <div className={`alert-${msg.type} mt-4`}>{msg.text}</div>}

      {(isAdding || editingEmp) && (
        <div className="stat-card mt-4" style={{ display: 'block', padding: '2rem' }}>
          <h2 className="mb-6 text-center" style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
            {isAdding ? 'إضافة موظف جديد' : 'تعديل بيانات الموظف'}
          </h2>
          <form onSubmit={handleSave} style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '1.5rem', 
              marginBottom: '2rem' 
            }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>رقم الموظف (PIN)</label>
                <input 
                  type="text" 
                  style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                  value={isAdding ? newEmp.pin : editingEmp.pin}
                  onChange={(e) => isAdding ? setNewEmp({...newEmp, pin: e.target.value}) : setEditingEmp({...editingEmp, pin: e.target.value})}
                  readOnly={!isAdding}
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>الاسم الكامل</label>
                <input 
                  type="text" 
                  style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                  value={isAdding ? newEmp.name : editingEmp.name}
                  onChange={(e) => isAdding ? setNewEmp({...newEmp, name: e.target.value}) : setEditingEmp({...editingEmp, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>كلمة المرور (للموقع)</label>
                <input 
                  type="password" 
                  style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                  value={isAdding ? newEmp.password : editingEmp.password}
                  onChange={(e) => isAdding ? setNewEmp({...newEmp, password: e.target.value}) : setEditingEmp({...editingEmp, password: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>الأجر الساعي ($)</label>
                <input 
                  type="number" 
                  step="0.1"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                  value={isAdding ? newEmp.hourly_rate : editingEmp.hourly_rate}
                  onChange={(e) => isAdding ? setNewEmp({...newEmp, hourly_rate: e.target.value}) : setEditingEmp({...editingEmp, hourly_rate: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex-center" style={{ gap: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
              <button type="submit" className="btn-primary" style={{ minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Save size={18} /> حفظ البيانات
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setIsAdding(false); setEditingEmp(null); }} style={{ minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', fontWeight: '700' }}>
                <X size={18} /> إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container mt-4">
        <table className="data-table">
          <thead>
            <tr>
              <th>PIN</th>
              <th>الاسم</th>
              <th>الأجر الساعي</th>
              <th>حساب الموقع</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr><td colSpan="5" className="text-center text-muted p-4">لا يوجد موظفين حالياً</td></tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.pin}>
                  <td><span className="badge">{emp.pin}</span></td>
                  <td><strong>{emp.name}</strong></td>
                  <td className="text-blue">{emp.hourly_rate || 0} $/ساعة</td>
                  <td>{emp.password ? <span className="text-success">نشط</span> : <span className="text-muted">غير مفعل</span>}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon text-blue" title="تعديل" onClick={() => setEditingEmp(emp)}>
                        <Edit size={18} />
                      </button>
                      <button className="btn-icon text-danger" title="حذف من النظام" onClick={() => handleDelete(emp.pin)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Employees;
