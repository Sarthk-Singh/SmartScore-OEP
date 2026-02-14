import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Container, Card, Form, Button, Alert, Modal } from 'react-bootstrap';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';

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

    // Redirect if already logged in and no password change pending
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
                // Navigation handled by useEffect or here
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
            // Use the temp token to authorize this request
            api.defaults.headers.common['Authorization'] = `Bearer ${tempToken}`;
            await api.post('/change-password', { newPassword });

            toast.success("Password changed successfully! You can now access your dashboard.");

            // Decode token to know where to go
            const decoded = jwtDecode(tempToken);
            if (decoded.role === 'ADMIN') navigate('/admin');
            else if (decoded.role === 'TEACHER') navigate('/teacher');
            else if (decoded.role === 'STUDENT') navigate('/student');
            else navigate('/');

        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to change password");
        }
    };

    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
            <div className="w-100" style={{ maxWidth: "400px" }}>
                <Card>
                    <Card.Body>
                        <h2 className="text-center mb-4">Log In</h2>
                        {error && <Alert variant="danger">{error}</Alert>}
                        <Form onSubmit={handleSubmit}>
                            <Form.Group id="email" className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </Form.Group>
                            <Form.Group id="password" className="mb-3">
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </Form.Group>
                            <Button disabled={loading} className="w-100" type="submit">
                                Log In
                            </Button>
                        </Form>
                    </Card.Body>
                </Card>
            </div>

            <Modal show={showChangePassword} backdrop="static" keyboard={false}>
                <Modal.Header>
                    <Modal.Title>Set New Password</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="info">
                        This is your first login. Please set a new secure password to continue.
                    </Alert>
                    <Form onSubmit={handleChangePassword}>
                        <Form.Group className="mb-3">
                            <Form.Label>New Password</Form.Label>
                            <Form.Control type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Confirm Password</Form.Label>
                            <Form.Control type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        </Form.Group>
                        <Button type="submit" variant="primary" className="w-100">Set Password & Login</Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
};
export default Login;
