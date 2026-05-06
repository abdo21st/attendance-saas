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
              <tr>
                <th>اسم القاعدة</th>
                <th>النوع</th>
                <th>القيمة ($)</th>
                <th>تنطبق على</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr><td colSpan="5" className="text-center p-4">لا توجد قواعد مضافة حالياً</td></tr>
              ) : (
                rules.map((rule, index) => (
                  <tr key={index}>
                    <td>
                      <input 
                        type="text" 
                        className="table-input" 
                        value={rule.name}
                        onChange={(e) => updateRule(index, 'name', e.target.value)}
                      />
                    </td>
                    <td>
                      <select 
                        className="table-input"
                        value={rule.rule_type}
                        onChange={(e) => updateRule(index, 'rule_type', e.target.value)}
                      >
                        <option value="shift_bonus">مكافأة وردية كاملة</option>
                        <option value="daily_bonus">مكافأة يومية</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        type="number" 
                        className="table-input" 
                        value={rule.rate_value}
                        onChange={(e) => updateRule(index, 'rate_value', e.target.value)}
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="table-input" 
                        placeholder="رقم الموظف (اتركه فارغاً للكل)"
                        value={rule.user_pin}
                        onChange={(e) => updateRule(index, 'user_pin', e.target.value)}
                      />
                    </td>
                    <td>
                      <button className="btn-icon text-danger" onClick={() => removeRule(index)}>
                        <Trash2 size={18} />
                      </button>
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
