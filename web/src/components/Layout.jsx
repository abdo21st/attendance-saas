import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

function Layout({ setAuth }) {
  return (
    <div className="layout-container">
      <Sidebar setAuth={setAuth} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
