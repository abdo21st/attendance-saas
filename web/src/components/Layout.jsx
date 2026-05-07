import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import DeviceStatus from './DeviceStatus';

function Layout({ setAuth }) {
  return (
    <div className="layout-container">
      <DeviceStatus />
      <Sidebar setAuth={setAuth} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
