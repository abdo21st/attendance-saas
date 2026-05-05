import { useState, useEffect } from 'react';
import { UserPlus, Edit, Trash2 } from 'lucide-react';

function Employees() {
  const [employees, setEmployees] = useState([]);
  
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        if (data.success) {
          setEmployees(data.users || []);
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
      }
    };
    fetchEmployees();
  }, []);

  return (
    <div className="page-container">
      <header className="page-header flex-between">
        <div>
          <h1>إدارة الموظفين</h1>
          <p>عرض وإضافة الموظفين في النظام</p>
        </div>
        <button className="btn-primary flex-center gap-2">
          <UserPlus size={18} />
          إضافة موظف
        </button>
      </header>

      <div className="table-container mt-4">
        <table className="data-table">
          <thead>
            <tr>
              <th>رقم الموظف (PIN)</th>
              <th>الاسم</th>
              <th>المجموعة / الصلاحية</th>
              <th>الأجر الساعي</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-muted">لا يوجد موظفين</td>
              </tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.pin}>
                  <td>{emp.pin}</td>
                  <td><strong>{emp.name}</strong></td>
                  <td>{emp.role}</td>
                  <td>{emp.rate} ريال/ساعة</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon text-blue"><Edit size={18} /></button>
                      <button className="btn-icon text-red"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Employees;
