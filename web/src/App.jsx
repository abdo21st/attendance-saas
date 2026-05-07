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
  return <div style={{ padding: '50px', textAlign: 'center', fontSize: '24px', color: 'white' }}>Hello World - Attendance System is mounting!</div>;
}

export default App;
