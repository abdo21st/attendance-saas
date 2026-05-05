import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Building } from 'lucide-react';

function EmployeeLogin({ setEmpAuth }) {
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/employee/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, password, company_code: companyCode }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('employee', JSON.stringify(data.user));
        setEmpAuth(true);
        navigate('/employee-dashboard');
      } else {
        setError(data.error || 'فشل تسجيل الدخول');
      }
    } catch (err) {
      setError('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box" style={{ maxWidth: '400px' }}>
        <div className="login-header">
          <h2>بوابة الموظفين</h2>
          <p>أدخل بياناتك للإطلاع على سجلاتك</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>كود الشركة (رقم الاشتراك)</label>
            <div className="input-with-icon">
              <Building size={20} className="icon" />
              <input
                type="text"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                placeholder="رقم اشتراك شركتك (مثال: 1)"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>رقم الموظف (PIN)</label>
            <div className="input-with-icon">
              <User size={20} className="icon" />
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
            <div className="input-with-icon">
              <Lock size={20} className="icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
              />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EmployeeLogin;
