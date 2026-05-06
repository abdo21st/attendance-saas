import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, Settings, LogOut } from 'lucide-react';

function Sidebar({ setAuth }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    setAuth(false);
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="logo">ZKTeco Panel</h2>
      </div>
      
      <nav className="sidebar-nav">
        <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"} end>
          <LayoutDashboard size={20} />
          <span>لوحة القيادة</span>
        </NavLink>
        
        <NavLink to="/employees" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <Users size={20} />
          <span>إدارة الموظفين</span>
        </NavLink>
        
        <NavLink to="/logs" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <Clock size={20} />
          <span>سجلات الحضور</span>
        </NavLink>

        <NavLink to="/settings" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
          <Settings size={20} />
          <span>إعدادات الرواتب</span>
        </NavLink>
      </nav>
      
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={20} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
