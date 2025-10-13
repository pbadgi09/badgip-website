/**
 * Authentication Module
 * Simple password-based authentication for local admin panel
 */

class Auth {
    constructor() {
        this.adminPassword = 'admin123'; // Simple password for local use
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }

    bindEvents() {
        const loginForm = document.getElementById('loginForm');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Auto-logout on tab close
        window.addEventListener('beforeunload', () => {
            this.updateLastActivity();
        });

        // Check for inactivity every minute
        setInterval(() => this.checkInactivity(), 60000);
    }

    handleLogin(e) {
        e.preventDefault();
        
        const passwordInput = document.getElementById('adminPassword');
        const errorElement = document.getElementById('loginError');
        const submitButton = e.target.querySelector('button[type="submit"]');
        
        const password = passwordInput.value.trim();
        
        // Clear previous errors
        errorElement.style.display = 'none';
        errorElement.textContent = '';
        
        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        
        // Simulate authentication delay
        setTimeout(() => {
            if (password === this.adminPassword) {
                this.setAuthenticated(true);
                this.showDashboard();
                this.showToast('Welcome back!', 'success');
            } else {
                this.showLoginError('Invalid password. Please try again.');
            }
            
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            passwordInput.value = '';
        }, 1000);
    }

    showLoginError(message) {
        const errorElement = document.getElementById('loginError');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Shake animation
        const loginContainer = document.querySelector('.login-container');
        loginContainer.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            loginContainer.style.animation = '';
        }, 500);
    }

    logout() {
        this.setAuthenticated(false);
        this.showLoginScreen();
        this.showToast('You have been logged out', 'info');
    }

    setAuthenticated(status) {
        const authData = {
            isAuthenticated: status,
            timestamp: Date.now(),
            lastActivity: Date.now()
        };
        
        localStorage.setItem('admin_auth', JSON.stringify(authData));
    }

    isAuthenticated() {
        try {
            const authData = JSON.parse(localStorage.getItem('admin_auth'));
            
            if (!authData || !authData.isAuthenticated) {
                return false;
            }
            
            // Check if session has expired
            const currentTime = Date.now();
            const sessionAge = currentTime - authData.timestamp;
            
            if (sessionAge > this.sessionTimeout) {
                this.setAuthenticated(false);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error checking authentication:', error);
            return false;
        }
    }

    updateLastActivity() {
        try {
            const authData = JSON.parse(localStorage.getItem('admin_auth'));
            if (authData && authData.isAuthenticated) {
                authData.lastActivity = Date.now();
                localStorage.setItem('admin_auth', JSON.stringify(authData));
            }
        } catch (error) {
            console.error('Error updating last activity:', error);
        }
    }

    checkInactivity() {
        try {
            const authData = JSON.parse(localStorage.getItem('admin_auth'));
            
            if (!authData || !authData.isAuthenticated) {
                return;
            }
            
            const currentTime = Date.now();
            const inactiveTime = currentTime - (authData.lastActivity || authData.timestamp);
            const maxInactiveTime = 2 * 60 * 60 * 1000; // 2 hours
            
            if (inactiveTime > maxInactiveTime) {
                this.logout();
                this.showToast('Session expired due to inactivity', 'warning');
            }
        } catch (error) {
            console.error('Error checking inactivity:', error);
        }
    }

    checkAuthStatus() {
        if (this.isAuthenticated()) {
            this.showDashboard();
        } else {
            this.showLoginScreen();
        }
    }

    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const adminDashboard = document.getElementById('adminDashboard');
        
        if (loginScreen && adminDashboard) {
            loginScreen.style.display = 'flex';
            adminDashboard.style.display = 'none';
        }
    }

    showDashboard() {
        const loginScreen = document.getElementById('loginScreen');
        const adminDashboard = document.getElementById('adminDashboard');
        
        if (loginScreen && adminDashboard) {
            loginScreen.style.display = 'none';
            adminDashboard.style.display = 'block';
            
            // Update last activity when accessing dashboard
            this.updateLastActivity();
            
            // Initialize dashboard if needed
            if (window.adminDashboard && window.adminDashboard.init) {
                window.adminDashboard.init();
            }
        }
    }

    showToast(message, type = 'info', duration = 4000) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);

        // Remove toast after duration
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Security helper methods
    generateCSRFToken() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    getCSRFToken() {
        let token = localStorage.getItem('csrf_token');
        if (!token) {
            token = this.generateCSRFToken();
            localStorage.setItem('csrf_token', token);
        }
        return token;
    }

    // Session management
    extendSession() {
        if (this.isAuthenticated()) {
            this.updateLastActivity();
            const authData = JSON.parse(localStorage.getItem('admin_auth'));
            authData.timestamp = Date.now(); // Extend session
            localStorage.setItem('admin_auth', JSON.stringify(authData));
        }
    }

    getSessionInfo() {
        try {
            const authData = JSON.parse(localStorage.getItem('admin_auth'));
            if (authData && authData.isAuthenticated) {
                return {
                    loginTime: new Date(authData.timestamp),
                    lastActivity: new Date(authData.lastActivity || authData.timestamp),
                    timeRemaining: this.sessionTimeout - (Date.now() - authData.timestamp)
                };
            }
        } catch (error) {
            console.error('Error getting session info:', error);
        }
        return null;
    }
}

// Add shake animation CSS
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 20%, 40%, 60%, 80% {
            transform: translateX(0);
        }
        10%, 30%, 50%, 70%, 90% {
            transform: translateX(-10px);
        }
    }
`;
document.head.appendChild(shakeStyle);

// Initialize authentication
const auth = new Auth();

// Export for global access
window.auth = auth;