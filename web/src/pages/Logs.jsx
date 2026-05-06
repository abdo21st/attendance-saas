import { useState, useEffect } from 'react';
import { Search, Filter, Clock, Calendar } from 'lucide-react';

function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const fetchLogs = async (currentOffset = 0) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/logs?limit=50&offset=${currentOffset}`);
      const data = await response.json();
      if (data.success) {
        setLogs(data.data || []);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs((page - 1) * 50);
  }, [page]);

  const handleSearch = (logs) => {
    let result = logs;
    if (searchTerm) {
      result = result.filter(log => 
        log.UserName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        log.UserId.includes(searchTerm)
      );
    }
    if (filterDate) {
      result = result.filter(log => log.Timestamp.startsWith(filterDate));
    }
    return result;
  };

  const filteredLogs = handleSearch(logs);

  const getVerifyMethod = (m) => {
    switch(m) {
      case 0: return 'كلمة مرور';
      case 1: return 'بصمة إصبع';
      case 15: return 'بصمة وجه';
      case 4: return 'بطاقة';
      default: return `طريقة ${m}`;
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>سجلات الحضور</h1>
        <p>عرض وتصفية سجلات الحضور المستلمة من الأجهزة</p>
      </header>

      <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '0 0 20px 0' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label><Search size={16} inline /> بحث بالاسم أو الرقم</label>
          <input 
            type="text" 
            placeholder="ابحث عن موظف..." 
            className="full-width"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '0.8rem' }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label><Calendar size={16} inline /> تصفية بالتاريخ</label>
          <input 
            type="date" 
            className="full-width"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ padding: '0.8rem' }}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>رقم (PIN)</th>
              <th>التاريخ والوقت</th>
              <th>الطريقة</th>
              <th>وقت الاستلام</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center p-8">جاري تحميل البيانات...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan="5" className="text-center p-8 text-muted">لا توجد سجلات تطابق البحث في هذه الصفحة</td></tr>
            ) : (
              filteredLogs.map((log, index) => (
                <tr key={index}>
                  <td><strong>{log.UserName}</strong></td>
                  <td><span className="badge">{log.UserId}</span></td>
                  <td className="text-blue font-mono">{log.Timestamp}</td>
                  <td>
                    <span className={`status-pill ${log.VerifyMethod === 15 ? 'success' : 'info'}`}>
                      {getVerifyMethod(log.VerifyMethod)}
                    </span>
                  </td>
                  <td className="text-muted" style={{ fontSize: '0.8rem' }}>{log.ReceivedAt}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex-between mt-6 p-4 stat-card" style={{ padding: '1rem 2rem' }}>
        <div className="text-muted">
          عرض {filteredLogs.length} من أصل {pagination.total} سجل
        </div>
        <div className="flex-center gap-4">
          <button 
            className="btn-secondary" 
            disabled={page === 1 || loading}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '0.5rem 1.5rem' }}
          >
            السابق
          </button>
          <span className="font-bold">صفحة {page}</span>
          <button 
            className="btn-secondary" 
            disabled={page * pagination.limit >= pagination.total || loading}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '0.5rem 1.5rem' }}
          >
            التالي
          </button>
        </div>
      </div>
    </div>
  );
}

export default Logs;
