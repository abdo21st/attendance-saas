import { useState } from 'react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Login({ setAuth }) {
  const [companyId, setCompanyId] = useState('1');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        setError(data.error || 'بيانات الدخول غير صحيحة');
      }
    } catch (err) {
      setError('تعذر الاتصال بالسيرفر. يرجى المحاولة لاحقاً.');
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '1rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '450px', padding: '3rem' }}>
        <div className="sidebar-header" style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '12px', background: 'var(--primary-glow)', marginBottom: '1rem' }}>
            <Lock size={32} className="text-vibrant" />
          </div>
          <h1 style={{ fontSize: '2rem' }}>مرحباً بك</h1>
          <p>سجل دخولك لإدارة نظام الحضور</p>
        </div>
        
        {error && (
          <div className="badge-danger" style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-dim)' }}>رقم الشركة</label>
            <input 
              className="input-field"
              type="number" 
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="1"
              required
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-dim)' }}>رقم الموظف (PIN)</label>
            <input 
              className="input-field"
              type="text" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="مثال: 101"
              required
            />
          </div>
          
          <div className="form-group" style={{ position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-dim)' }}>كلمة المرور</label>
            <input 
              className="input-field"
              type={showPassword ? "text" : "password"} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <button 
              type="button" 
              className="btn-icon" 
              style={{ position: 'absolute', left: '0.8rem', bottom: '0.6rem', background: 'transparent', border: 'none' }}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          
          <button type="submit" className="btn-primary full-width" style={{ marginTop: '1rem' }}>
            دخول النظام
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
