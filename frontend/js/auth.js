import CONFIG from './config.js';
import API from './api.js';

const Auth = {
    login: async (pin) => {
        try {
            const response = await API.login(pin);
            if (response.success) {
                sessionStorage.setItem(CONFIG.AUTH_KEY, 'true');
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            // Error toast handled in API.request
            return false;
        }
    },

    logout: async () => {
        try {
            await API.logout();
        } catch (e) {
            console.error('Logout error', e);
        } finally {
            sessionStorage.removeItem(CONFIG.AUTH_KEY);
            window.location.href = 'index.html';
        }
    },

    isAuthenticated: () => {
        return sessionStorage.getItem(CONFIG.AUTH_KEY) === 'true';
    },

    checkAuth: () => {
        if (!Auth.isAuthenticated()) {
            const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('frontend/');
            if (!isLoginPage) {
                window.location.href = 'index.html';
            }
        } else {
            // If authenticated and on login page, go to dashboard
            if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('frontend/')) {
                window.location.href = 'dashboard.html';
            }
        }
    }
};

export default Auth;
