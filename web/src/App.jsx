import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import DeviceTest from './pages/DeviceTest';
import Layout from './components/Layout';
import EmployeeLogin from './pages/EmployeeLogin';
import EmployeeDashboard from './pages/EmployeeDashboard';
import SuperAdmin from './pages/SuperAdmin';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmpAuthenticated, setIsEmpAuthenticated] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) setIsAuthenticated(true);
    
    const emp = localStorage.getItem('employee');
    if (emp) setIsEmpAuthenticated(true);
  }, []);

  return (
    <Router>
      <Routes>
        {/* Admin Routes */}
        <Route path="/login" element={
          !isAuthenticated ? <Login setAuth={setIsAuthenticated} /> : <Navigate to="/" />
        } />
        
        {/* Employee Routes */}
        <Route path="/employee-login" element={
          !isEmpAuthenticated ? <EmployeeLogin setEmpAuth={setIsEmpAuthenticated} /> : <Navigate to="/employee-dashboard" />
        } />
        
        <Route path="/employee-dashboard" element={
          isEmpAuthenticated ? <EmployeeDashboard setEmpAuth={setIsEmpAuthenticated} /> : <Navigate to="/employee-login" />
        } />
        
        <Route path="/superadmin" element={<SuperAdmin />} />
        
        {/* Protected Routes */}
        <Route path="/" element={
          isAuthenticated ? <Layout setAuth={setIsAuthenticated} /> : <Navigate to="/login" />
        }>
          <Route index element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="logs" element={<Logs />} />
          <Route path="settings" element={<Settings />} />
          <Route path="device-test" element={<DeviceTest />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
