import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

function Logs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/logs');
        const data = await response.json();
        if (data.success) {
          setLogs(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching logs:', err);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="page-container">
      <header className="page-header flex-between">
        <div>
          <h1>سجلات الحضور</h1>
          <p>عرض سجلات الحضور والانصراف المستلمة من الجهاز</p>
        </div>
        <button className="btn-primary flex-center gap-2">
          <Plus size={18} />
          إضافة بصمة يدوية
        </button>
      </header>

      <div className="table-container mt-4">
        <table className="data-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>التاريخ والوقت</th>
              <th>طريقة البصمة</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="3" className="text-center text-muted">لا توجد سجلات</td>
              </tr>
            ) : (
              logs.map((log, index) => (
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
  );
}

export default Logs;
