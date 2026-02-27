import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminOverview from './AdminOverview';
import AdminDashboard from './AdminDashboard';
import './AdminDashboard.css'; // reuse sidebar/layout styles

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const [activeView, setActiveView] = useState('overview');

    return (
        <div className="ad-wrapper">
            {/* Sidebar */}
            <div className="ad-sidebar">
                <div className="ad-sidebar-logo">SS</div>
                <div
                    className={`ad-sidebar-item ${activeView === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveView('overview')}
                    title="Overview"
                >📊</div>
                <div
                    className={`ad-sidebar-item ${activeView === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveView('dashboard')}
                    title="Dashboard"
                >⚙️</div>
                <div className="ad-sidebar-bottom">
                    <div className="ad-sidebar-item" onClick={logout} title="Logout">🚪</div>
                </div>
            </div>

            <div className="ad-main">
                {/* Shared Header */}
                <div className="ad-header">
                    <div className="ad-header-left">
                        <h1>{activeView === 'overview' ? 'Admin Portal 🛡️' : 'Admin Portal 🛡️'}</h1>
                        <p>{activeView === 'overview' ? 'Institution overview at a glance' : 'Manage users, grades, and courses'}</p>
                    </div>
                    <div className="ad-header-right">
                        <span className="ad-badge">🔑 {user?.name}</span>
                        <button className="ad-logout-btn" onClick={logout}>Logout</button>
                    </div>
                </div>

                {/* View Content */}
                {activeView === 'overview' && <AdminOverview isVisible={activeView === 'overview'} />}
                {activeView === 'dashboard' && <AdminDashboard isEmbedded={true} />}
            </div>
        </div>
    );
};

export default AdminLayout;
