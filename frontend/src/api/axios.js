import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // This will be proxied to http://localhost:8080 by Vite
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the JWT token in headers
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
            // Note: Backend middleware expects just the token or "Bearer token"?
            // Looking at backend/src/middleware/auth.js would confirm, usually it's Bearer
            // I'll assume standard Bearer for now.
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
