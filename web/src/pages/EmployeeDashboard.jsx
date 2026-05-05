import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function EmployeeDashboard({ setEmpAuth }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/api/employee/dashboard');
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'فشل جلب البيانات');
          if (response.status === 401) {
            handleLogout();
          }
        }
      } catch (err) {
        setError('خطأ في الاتصال بالخادم');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/employee/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('employee');
    setEmpAuth(false);
    navigate('/employee-login');
  };

  if (loading) return <div className="p-4 text-center">جاري التحميل...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (!data) return null;

  return (
    <div className="page-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <header className="page-header flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>مرحباً، {data.name}</h1>
          <p style={{ margin: 0, opacity: 0.8 }}>بوابة الموظف - ملخص شهر {data.summary.month}</p>
        </div>
        <button onClick={handleLogout} className="action-btn delete-btn" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <LogOut size={16} /> خروج
        </button>
      </header>

      <div className="stats-grid" style={{ marginTop: '20px' }}>
        <div className="stat-card">
          <div className="stat-icon bg-blue">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <h3>إجمالي الساعات</h3>
            <p className="stat-value" style={{ fontSize: '1.5rem' }}>{data.summary.total_hours}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-green">
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>الراتب الأساسي</h3>
            <p className="stat-value" style={{ fontSize: '1.5rem' }}>{data.summary.base_salary} د.ل</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-purple">
            <Calendar size={24} />
          </div>
          <div className="stat-info">
            <h3>العلاوات والإضافي</h3>
            <p className="stat-value" style={{ fontSize: '1.5rem' }}>{data.summary.total_extras} د.ل</p>
          </div>
        </div>
      </div>

      <div className="recent-activity" style={{ marginTop: '30px' }}>
        <h2>سجل الحضور والانصراف (هذا الشهر)</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>وقت الدخول</th>
                <th>وقت الخروج</th>
                <th>ساعات العمل</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center">لا توجد سجلات حضور هذا الشهر</td>
                </tr>
              ) : (
                data.logs.map((log, i) => (
                  <tr key={i}>
                    <td>{log.date}</td>
                    <td className="text-green font-mono">{log.in}</td>
                    <td className="text-blue font-mono">{log.out}</td>
                    <td>{log.hours} ساعة</td>
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

export default EmployeeDashboard;
