import React, { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifyToken = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    if (decoded.exp * 1000 < Date.now()) {
                        logout();
                    } else {
                        // Optional: Verify with backend if critical
                        // For now, at least rely on decode. 
                        // But if DB reset, token is valid signature but user ID missing.
                        // We should try to fetch user details or a protected route.
                        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                        await api.get('/protected'); // specific endpoint to check auth
                        setUser(decoded);
                    }
                } catch (error) {
                    console.error("Invalid token or user not found:", error);
                    logout();
                }
            }
            setLoading(false);
        };
        verifyToken();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await api.post('/login', { email, password });
            const { token, firstLogin } = response.data;
            localStorage.setItem('token', token);
            const decoded = jwtDecode(token);
            setUser(decoded);
            return { ...decoded, token, firstLogin };
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const value = {
        user,
        login,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
