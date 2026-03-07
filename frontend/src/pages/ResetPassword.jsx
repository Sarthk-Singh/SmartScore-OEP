import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './Login.css';
import icon from '../assets/images/icon.png';

const ResetPassword = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            toast.error("Invalid or missing reset token.");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/reset-password', { token, newPassword });
            toast.success(response.data.message || 'Password reset successfully.');
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-brand-panel">
                <div className="login-shape login-shape-3"></div>
                <div className="login-shape login-shape-4"></div>
                <div className="login-brand-content">
                    <img src={icon} alt="SmartScore" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 8 }} />
                    <h1 className="login-brand-title">Smart<span style={{ color: '#818cf8' }}>Score</span></h1>
                    <p className="login-brand-tagline">Set a new secure password</p>
                </div>
            </div>

            <div className="login-form-panel">
                <div className="login-form-card">
                    <h2 className="login-form-title">Reset Password</h2>
                    <p className="login-form-subtitle">Choose a new password for your account.</p>

                    <form onSubmit={handleSubmit}>
                        <div className="login-input-group">
                            <label>New Password</label>
                            <div className="login-input-wrapper">
                                <span className="login-input-icon">🔒</span>
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
                                <span className="login-input-icon">🔒</span>
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

                        <button type="submit" className="login-submit-btn" disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
