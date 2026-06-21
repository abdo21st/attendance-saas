import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, Settings, LogOut, BookOpen } from 'lucide-react';

function Sidebar({ setAuth }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    setAuth(false);
    navigate('/login');
  };

  const navItems = [
    { to: "/", icon: <LayoutDashboard size={22} />, label: "لوحة التحكم", end: true },
    { to: "/employees", icon: <Users size={22} />, label: "الموظفون" },
    { to: "/logs", icon: <Clock size={22} />, label: "سجلات الحضور" },
    { to: "/settings", icon: <Settings size={22} />, label: "الإعدادات" },
  ];

  return (
    <aside className="sidebar glass">
      <div className="sidebar-header">
        <h2 className="logo-text">ZKTeco Cloud</h2>
        <p className="text-muted" style={{ fontSize: '0.8rem' }}>إدارة الحضور الذكية</p>
      </div>
      
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink 
                to={item.to} 
                className={({isActive}) => isActive ? "nav-link active" : "nav-link"} 
                end={item.end}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div style={{ marginTop: 'auto', padding: '0 0.5rem' }}>
        <button onClick={handleLogout} className="nav-link full-width" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
          <LogOut size={22} className="text-red" />
          <span className="text-red">تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
