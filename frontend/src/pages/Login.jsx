import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import { GoogleLogin } from '@react-oauth/google';
import './Login.css';
import icon from '../assets/images/icon.png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Force Password Change State
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [tempToken, setTempToken] = useState('');

    const { login, user } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (user && !showChangePassword) {
            if (user.role === 'ADMIN') navigate('/admin');
            else if (user.role === 'TEACHER') navigate('/teacher');
            else if (user.role === 'STUDENT') navigate('/student');
        }
    }, [user, navigate, showChangePassword]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await login(email, password);
            if (data.firstLogin) {
                setTempToken(data.token);
                setShowChangePassword(true);
            } else {
                if (data.role === 'ADMIN') navigate('/admin');
                else if (data.role === 'TEACHER') navigate('/teacher');
                else if (data.role === 'STUDENT') navigate('/student');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        try {
            api.defaults.headers.common['Authorization'] = `Bearer ${tempToken}`;
            await api.post('/change-password', { newPassword });
            toast.success("Password changed successfully! You can now access your dashboard.");
            const decoded = jwtDecode(tempToken);
            if (decoded.role === 'ADMIN') navigate('/admin');
            else if (decoded.role === 'TEACHER') navigate('/teacher');
            else if (decoded.role === 'STUDENT') navigate('/student');
            else navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to change password");
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            setLoading(true);
            const { credential } = credentialResponse;
            const response = await api.post('/auth/google', { idToken: credential });

            const { token } = response.data;
            sessionStorage.setItem('token', token);

            // Decode to find role and redirect
            const decoded = jwtDecode(token);
            toast.success("Logged in with Google successfully!");

            // Hard redirect to force AuthContext reload
            if (decoded.role === 'ADMIN') window.location.href = '/admin';
            else if (decoded.role === 'TEACHER') window.location.href = '/teacher';
            else if (decoded.role === 'STUDENT') window.location.href = '/student';

        } catch (err) {
            toast.error(err.response?.data?.error || 'Google Login failed');
            setLoading(false);
        }
    };

    const handleGoogleError = () => {
        toast.error('Google Sign-In was unsuccessful. Please try again.');
    };

    return (
        <div className="login-page">
            {/* Left Branding Panel */}
            <div className="login-brand-panel">
                <div className="login-shape login-shape-1"></div>
                <div className="login-shape login-shape-2"></div>
                <div className="login-shape login-shape-3"></div>
                <div className="login-shape login-shape-4"></div>

                <div className="login-brand-content">
                    <img src={icon} alt="SmartScore" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 8 }} />
                    <h1 className="login-brand-title">Smart<span style={{ color: '#818cf8' }}>Score</span></h1>
                    <p className="login-brand-tagline">Smart Exam Management Portal</p>

                    <div className="login-features">
                        <div className="login-feature-pill">📝 Create Exams</div>
                        <div className="login-feature-pill">📊 Track Performance</div>
                        <div className="login-feature-pill">📅 Schedule Tests</div>
                        <div className="login-feature-pill">🎓 Manage Students</div>
                    </div>
                </div>
            </div>

            {/* Right Form Panel */}
            <div className="login-form-panel">
                <div className="login-form-card">
                    <h2 className="login-form-title">Welcome Back</h2>
                    <p className="login-form-subtitle">Sign in to your account</p>

                    {error && (
                        <div className="login-error">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="login-input-group">
                            <label>Email Address</label>
                            <div className="login-input-wrapper">
                                <span className="login-input-icon">📧</span>
                                <input
                                    className="login-input"
                                    type="email"
                                    required
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="login-input-group">
                            <label>Password</label>
                            <div className="login-input-wrapper">
                                <span className="login-input-icon">🔒</span>
                                <input
                                    className="login-input"
                                    type="password"
                                    required
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                            <div style={{ textAlign: 'right', marginTop: '8px' }}>
                                <span
                                    style={{ fontSize: '12px', color: 'var(--lg-accent-light)', cursor: 'pointer', fontWeight: '500' }}
                                    onClick={() => navigate('/forgot-password')}
                                >
                                    Forgot Password?
                                </span>
                            </div>
                        </div>

                        <button type="submit" className="login-submit-btn" disabled={loading}>
                            {loading ? 'Signing in...' : 'Log In'}
                        </button>

                        <div className="login-divider">
                            <span>or</span>
                        </div>

                        <div className="google-login-wrapper">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleError}
                                useOneTap={false}
                                shape="pill"
                                theme="filled_black"
                                text="continue_with"
                                width="100%"
                            />
                        </div>
                    </form>

                    <div className="login-footer">
                        Powered by Smart<span style={{ color: '#818cf8' }}>Score</span>
                    </div>
                </div>
            </div>

            {/* First Login - Change Password Modal */}
            {showChangePassword && (
                <div className="login-modal-overlay">
                    <div className="login-modal">
                        <h3 className="login-modal-title">🔐 Set New Password</h3>
                        <p className="login-modal-subtitle">
                            This is your first login. Please set a new secure password to continue.
                        </p>

                        <div className="login-modal-alert">
                            ℹ️ Choose a strong password that you'll remember. You won't be asked to change it again.
                        </div>

                        <form onSubmit={handleChangePassword}>
                            <div className="login-input-group">
                                <label>New Password</label>
                                <div className="login-input-wrapper">
                                    <span className="login-input-icon">🔑</span>
                                    <input
                                        className="login-input"
                                        type="password"
                                        required
                                        placeholder="Enter new password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="login-input-group">
                                <label>Confirm Password</label>
                                <div className="login-input-wrapper">
                                    <span className="login-input-icon">🔑</span>
                                    <input
                                        className="login-input"
                                        type="password"
                                        required
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="login-submit-btn">
                                Set Password & Login
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
