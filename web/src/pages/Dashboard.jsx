import { useState, useEffect } from 'react';
import { Users, UserCheck, Clock, Activity, TrendingUp } from 'lucide-react';

function Dashboard() {
  const [stats, setStats] = useState({ users: 0, logs: 0, activeToday: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, logsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/logs')
        ]);
        const usersData = await usersRes.json();
        const logsData = await logsRes.json();

        if (usersData.success && logsData.success) {
          const logs = logsData.data || [];
          const today = new Date().toISOString().split('T')[0];
          const activeToday = new Set(logs.filter(l => l.Timestamp.startsWith(today)).map(l => l.UserId)).size;

          setStats({
            users: usersData.users?.length || 0,
            logs: logs.length,
            activeToday: activeToday
          });
          setRecentLogs(logs.slice(0, 8));
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="flex-between">
          <div>
            <h1>نظرة عامة على النظام</h1>
            <p>إليك ملخص نشاط الحضور والانصراف لهذا اليوم</p>
          </div>
          <div className="badge" style={{ padding: '8px 16px', fontSize: '1rem' }}>
             <Activity size={18} inline /> مباشر
          </div>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-blue">
            <Users size={32} />
          </div>
          <div className="stat-info">
            <h3>إجمالي الموظفين</h3>
            <p className="stat-value">{stats.users}</p>
            <span className="text-success" style={{ fontSize: '0.8rem' }}><TrendingUp size={12} inline /> موظف نشط</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-green">
            <UserCheck size={32} />
          </div>
          <div className="stat-info">
            <h3>سجل اليوم</h3>
            <p className="stat-value">{stats.activeToday}</p>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>بصمة تم تسجيلها اليوم</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-purple">
            <Clock size={32} />
          </div>
          <div className="stat-info">
            <h3>إجمالي السجلات</h3>
            <p className="stat-value">{stats.logs}</p>
            <span className="text-muted" style={{ fontSize: '0.8rem' }}>منذ بدء العمل</span>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <h2 className="mb-4">أحدث عمليات البصمة</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>الموظف</th>
                <th>رقم (PIN)</th>
                <th>التوقيت</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="text-center p-5">جاري التحميل...</td></tr>
              ) : recentLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center p-5 text-muted">لا توجد عمليات بصمة مسجلة حالياً</td>
                </tr>
              ) : (
                recentLogs.map((log, index) => (
                  <tr key={index}>
                    <td><strong>{log.UserName}</strong></td>
                    <td><span className="badge">{log.UserId}</span></td>
                    <td className="text-blue font-mono">{log.Timestamp}</td>
                    <td>
                      <span className={`status-pill ${log.VerifyMethod === 15 ? 'success' : 'info'}`}>
                        {log.VerifyMethod === 0 ? 'كلمة مرور' : log.VerifyMethod === 1 ? 'بصمة إصبع' : log.VerifyMethod === 15 ? 'بصمة وجه' : 'تحقق آلي'}
                      </span>
                    </td>
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

export default Dashboard;
