import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Award, Clock, DollarSign } from 'lucide-react';

function Settings() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success) {
          setRules(data.data.rules || []);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const addRule = () => {
    setRules([...rules, { 
      name: 'قاعدة جديدة', 
      rule_type: 'shift_bonus', 
      rate_value: 10,
      user_pin: '' // فارغ يعني للجميع
    }]);
  };

  const removeRule = (index) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
  };

  const updateRule = (index, field, value) => {
    const newRules = [...rules];
    newRules[index][field] = value;
    setRules(newRules);
  };

  const saveSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules })
      });
      if (res.ok) {
        setMsg({ text: 'تم حفظ الإعدادات بنجاح', type: 'success' });
      }
    } catch (err) {
      setMsg({ text: 'فشل حفظ الإعدادات', type: 'error' });
    }
  };

  if (loading) return <div className="text-center p-5">جاري التحميل...</div>;

  return (
    <div className="page-container">
      <header className="page-header flex-between">
        <div>
          <h1>إعدادات الأجور والمكافآت</h1>
          <p>حدد قواعد "منحة التميز" والحسابات المالية لشركتك</p>
        </div>
        <button className="btn-primary" onClick={saveSettings}>
          <Save size={18} /> حفظ الإعدادات
        </button>
      </header>

      {msg.text && <div className={`alert-${msg.type}`}>{msg.text}</div>}

      <div className="stat-card" style={{ display: 'block' }}>
        <div className="flex-between mb-4">
          <h2 style={{ fontSize: '1.2rem' }}><Award size={20} inline /> قواعد منحة التميز (Premium Rules)</h2>
          <button className="btn-icon" style={{ background: 'var(--success)', color: 'white', borderRadius: '50%' }} onClick={addRule}>
            <Plus size={20} />
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ textAlign: 'center', padding: '1.2rem', color: 'var(--text-secondary)' }}>اسم القاعدة</th>
                <th style={{ textAlign: 'center', padding: '1.2rem', color: 'var(--text-secondary)' }}>النوع</th>
                <th style={{ textAlign: 'center', padding: '1.2rem', color: 'var(--text-secondary)' }}>القيمة ($)</th>
                <th style={{ textAlign: 'center', padding: '1.2rem', color: 'var(--text-secondary)' }}>تنطبق على</th>
                <th style={{ textAlign: 'center', padding: '1.2rem', color: 'var(--text-secondary)' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr><td colSpan="5" className="text-center p-4">لا توجد قواعد مضافة حالياً</td></tr>
              ) : (
                rules.map((rule, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>
                      <input 
                        type="text" 
                        className="table-input" 
                        value={rule.name}
                        onChange={(e) => updateRule(index, 'name', e.target.value)}
                        placeholder="مثال: مكافأة الأداء"
                        style={{ 
                          width: '100%',
                          background: 'rgba(255,255,255,0.05)', 
                          color: 'white', 
                          padding: '0.7rem', 
                          borderRadius: 'var(--radius-md)', 
                          border: '1px solid var(--border-color)',
                          textAlign: 'center'
                        }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <select 
                        className="table-input"
                        value={rule.rule_type}
                        onChange={(e) => updateRule(index, 'rule_type', e.target.value)}
                        style={{ 
                          width: '100%',
                          background: 'rgba(255,255,255,0.05)', 
                          color: 'white', 
                          padding: '0.7rem', 
                          borderRadius: 'var(--radius-md)', 
                          border: '1px solid var(--border-color)',
                          textAlign: 'center'
                        }}
                      >
                        <option value="shift_bonus">مكافأة وردية كاملة</option>
                        <option value="daily_bonus">مكافأة يومية</option>
                      </select>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <input 
                        type="number" 
                        min="0"
                        className="table-input" 
                        value={rule.rate_value}
                        onChange={(e) => updateRule(index, 'rate_value', e.target.value)}
                        style={{ 
                          width: '100px', 
                          margin: '0 auto',
                          background: 'rgba(255,255,255,0.05)', 
                          color: 'white', 
                          padding: '0.7rem', 
                          borderRadius: 'var(--radius-md)', 
                          border: '1px solid var(--border-color)',
                          textAlign: 'center'
                        }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <input 
                        type="text" 
                        className="table-input" 
                        placeholder="اتركه فارغاً للكل"
                        value={rule.user_pin}
                        onChange={(e) => updateRule(index, 'user_pin', e.target.value)}
                        style={{ 
                          width: '100%',
                          background: 'rgba(255,255,255,0.05)', 
                          color: 'white', 
                          padding: '0.7rem', 
                          borderRadius: 'var(--radius-md)', 
                          border: '1px solid var(--border-color)',
                          textAlign: 'center'
                        }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div className="flex-center">
                        <button className="btn-icon text-danger" onClick={() => removeRule(index)} style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', width: '35px', height: '35px' }}>
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

      <div className="stats-grid mt-4">
        <div className="stat-card">
          <div className="stat-icon bg-blue">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <h3>طريقة الحساب</h3>
            <p>يتم حساب الراتب الأساسي بناءً على سعر ساعة كل موظف، مضافاً إليه منحة التميز المطبقة.</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-purple">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <h3>الوردية الكاملة</h3>
            <p>تُعتبر الوردية "كاملة" إذا وُجد سجل دخول وسجل خروج في نفس اليوم (بفارق لا يتجاوز 12 ساعة).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
