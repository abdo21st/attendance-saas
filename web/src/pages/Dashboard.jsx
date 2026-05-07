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
      <header className="page-header mb-4">
        <div className="flex-between">
          <div>
            <h1>لوحة القيادة</h1>
            <p>مرحباً بك مجدداً. إليك ملخص نشاط النظام اليوم.</p>
          </div>
          <div className="status-pill info pulse">
            <Activity size={16} style={{ marginLeft: '8px' }} /> مباشر الآن
          </div>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="icon-box" style={{ color: 'var(--primary)' }}>
            <Users size={32} />
          </div>
          <div className="stat-info">
            <div className="stat-label">الموظفون</div>
            <div className="stat-value">{stats.users}</div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="icon-box" style={{ color: var(--success) }}>
            <UserCheck size={32} />
          </div>
          <div className="stat-info">
            <div className="stat-label">الحضور اليوم</div>
            <div className="stat-value">{stats.activeToday}</div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="icon-box" style={{ color: 'var(--warning)' }}>
            <Clock size={32} />
          </div>
          <div className="stat-info">
            <div className="stat-label">إجمالي السجلات</div>
            <div className="stat-value">{stats.logs}</div>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h2 className="mb-4">أحدث النشاطات</h2>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>الموظف</th>
                <th>المعرف (PIN)</th>
                <th>التوقيت</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="text-center" style={{ padding: '4rem' }}><RefreshCw className="spin" /> جاري التحميل...</td></tr>
              ) : recentLogs.length === 0 ? (
                <tr><td colSpan="4" className="text-center" style={{ padding: '4rem' }}>لا توجد سجلات حالياً</td></tr>
              ) : (
                recentLogs.map((log, index) => (
                  <tr key={index}>
                    <td><div style={{ fontWeight: 700 }}>{log.UserName}</div></td>
                    <td><span className="badge" style={{ background: 'rgba(255,255,255,0.05)' }}>{log.UserId}</span></td>
                    <td className="font-mono text-dim">{log.Timestamp}</td>
                    <td>
                      <span className={`status-pill ${log.VerifyMethod === 15 ? 'success' : 'info'}`}>
                        {log.VerifyMethod === 15 ? 'بصمة وجه' : 'تحقق آلي'}
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
