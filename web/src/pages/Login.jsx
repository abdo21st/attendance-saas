import { useState } from 'react';
import { Lock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Login({ setAuth }) {
  const [companyId, setCompanyId] = useState('1');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, pin, password })
      });
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('user', JSON.stringify({ pin, companyId }));
        setAuth(true);
        navigate('/');
      } else {
        setError(data.error || 'فشل تسجيل الدخول');
      }
    } catch (err) {
      setError('لا يمكن الاتصال بالخادم. تأكد من تشغيل السيرفر.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-badge">SaaS</div>
          <h2>ZKTeco Attendance</h2>
          <p>بوابة إدارة الحضور والانصراف السحابية</p>
        </div>
        
        {error && <div className="alert-error">{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>رقم الشركة (Company ID)</label>
            <div className="input-wrapper">
              <span className="input-icon-text">#</span>
              <input 
                type="number" 
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                placeholder="أدخل رقم الشركة"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>رقم الموظف (PIN)</label>
            <div className="input-wrapper">
              <User className="input-icon" size={20} />
              <input 
                type="text" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="أدخل رقمك الوظيفي"
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>كلمة المرور</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
              />
            </div>
          </div>
          
          <button type="submit" className="btn-primary full-width">
            دخول للنظام
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
