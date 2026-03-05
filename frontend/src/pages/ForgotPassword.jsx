import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'react-toastify';
import './Login.css'; // Reuse login styling

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/auth/forgot-password', { email });
            toast.success(response.data.message || 'If this email is registered you will receive a reset link shortly.');
            setEmail('');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to request password reset');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-brand-panel">
                <div className="login-shape login-shape-1"></div>
                <div className="login-shape login-shape-2"></div>
                <div className="login-brand-content">
                    <img src="/images/icon.png" alt="SmartScore" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 8 }} />
                    <h1 className="login-brand-title">Smart<span style={{ color: '#818cf8' }}>Score</span></h1>
                    <p className="login-brand-tagline">Recover Your Account</p>
                </div>
            </div>

            <div className="login-form-panel">
                <div className="login-form-card">
                    <h2 className="login-form-title">Forgot Password?</h2>
                    <p className="login-form-subtitle">Enter your email and we'll send a reset link.</p>

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

                        <button type="submit" className="login-submit-btn" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>

                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <button
                            className="login-submit-btn"
                            style={{ background: 'transparent', color: 'var(--lg-text-muted)', border: '1px solid var(--lg-border)', boxShadow: 'none' }}
                            onClick={() => navigate('/login')}
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
