import { useState, useEffect } from 'react';
import { Users, UserCheck, Clock } from 'lucide-react';

function Dashboard() {
  const [stats, setStats] = useState({ users: 0, logs: 0 });
  const [recentLogs, setRecentLogs] = useState([]);

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
          setStats({
            users: usersData.users?.length || 0,
            logs: logsData.data?.length || 0
          });
          setRecentLogs((logsData.data || []).slice(0, 5));
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>لوحة القيادة</h1>
        <p>مرحباً بك في نظام إدارة الحضور والانصراف</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon bg-blue">
            <Users size={24} />
          </div>
          <div className="stat-info">
            <h3>إجمالي الموظفين</h3>
            <p className="stat-value">{stats.users}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-green">
            <UserCheck size={24} />
          </div>
          <div className="stat-info">
            <h3>إجمالي السجلات</h3>
            <p className="stat-value">{stats.logs}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-purple">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <h3>إجمالي الساعات</h3>
            <p className="stat-value">قريباً</p>
          </div>
        </div>
      </div>

      <div className="recent-activity">
        <h2>أحدث السجلات</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>الموظف</th>
                <th>التاريخ والوقت</th>
                <th>طريقة التحقق</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center">لا توجد سجلات حالياً</td>
                </tr>
              ) : (
                recentLogs.map((log, index) => (
                  <tr key={index}>
                    <td><strong>{log.UserId}</strong></td>
                    <td className="text-blue font-mono">{log.Timestamp}</td>
                    <td><span className="badge">{log.VerifyMethod === 0 ? 'كلمة مرور' : log.VerifyMethod === 1 ? 'بصمة إصبع' : log.VerifyMethod === 15 ? 'بصمة وجه' : log.VerifyMethod}</span></td>
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
