import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import DeviceStatus from './DeviceStatus';

function Layout({ setAuth }) {
  return (
    <div className="layout-container">
      <Sidebar setAuth={setAuth} />
      <main className="main-content">
        <DeviceStatus />
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
