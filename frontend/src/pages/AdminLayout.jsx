import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminOverview from './AdminOverview';
import AdminDashboard from './AdminDashboard';
import UserManagement from './UserManagement';
import AdminExams from './AdminExams';
import './AdminDashboard.css'; // reuse sidebar/layout styles

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const [activeView, setActiveView] = useState('overview');

    return (
        <div className="ad-wrapper">
            {/* Sidebar */}
            <div className="ad-sidebar">
                <div className="ad-sidebar-logo"><span>SS</span> SmartScore</div>
                <div
                    className={`ad-sidebar-item ${activeView === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveView('overview')}
                ><span className="nav-icon">📊</span> Overview</div>
                <div
                    className={`ad-sidebar-item ${activeView === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveView('dashboard')}
                ><span className="nav-icon">⚙️</span> Dashboard</div>
                <div
                    className={`ad-sidebar-item ${activeView === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveView('users')}
                ><span className="nav-icon">👤</span> Users</div>
                <div
                    className={`ad-sidebar-item ${activeView === 'exams' ? 'active' : ''}`}
                    onClick={() => setActiveView('exams')}
                ><span className="nav-icon">📝</span> Exams</div>
                <div className="ad-sidebar-bottom">
                    <div className="ad-sidebar-item" onClick={logout}><span className="nav-icon">🚪</span> Logout</div>
                </div>
            </div>

            <div className="ad-main">
                {/* Shared Header */}
                <div className="ad-header">
                    <div className="ad-header-left">
                        <h1>Admin Portal 🛡️</h1>
                        <p>
                            {activeView === 'overview' && 'Institution overview at a glance'}
                            {activeView === 'dashboard' && 'Manage users, grades, and courses'}
                            {activeView === 'users' && 'Search, view, and manage all users'}
                            {activeView === 'exams' && 'View and track all exams across grades'}
                        </p>
                    </div>
                    <div className="ad-header-right">
                        <span className="ad-badge">🔑 {user?.name}</span>
                        <button className="ad-logout-btn" onClick={logout}>Logout</button>
                    </div>
                </div>

                {/* View Content */}
                {activeView === 'overview' && <AdminOverview isVisible={activeView === 'overview'} />}
                {activeView === 'dashboard' && <AdminDashboard isEmbedded={true} />}
                {activeView === 'users' && <UserManagement />}
                {activeView === 'exams' && <AdminExams isVisible={activeView === 'exams'} />}
            </div>
        </div>
    );
};

export default AdminLayout;
