/**
 * Main Admin Dashboard Module
 * Handles dashboard functionality, navigation, and coordination
 */

class AdminDashboard {
    constructor() {
        this.currentTab = 'dashboard';
        this.isInitialized = false;
        this.stats = {
            projects: 0,
            blog: 0,
            youtube: 0,
            totalViews: 0
        };
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        this.bindEvents();
        this.loadDashboardData();
        this.setupSettings();
        this.isInitialized = true;
    }

    bindEvents() {
        // Navigation events
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => this.handleTabSwitch(e));
        });

        // Settings events
        const githubTokenInput = document.getElementById('githubToken');
        const githubRepoInput = document.getElementById('githubRepo');
        const darkModeToggle = document.getElementById('darkMode');
        const autoSaveToggle = document.getElementById('autoSave');

        if (githubTokenInput) {
            githubTokenInput.addEventListener('change', () => this.updateGitHubToken());
        }

        if (githubRepoInput) {
            githubRepoInput.addEventListener('change', () => this.updateGitHubRepo());
        }

        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', () => this.toggleDarkMode());
        }

        if (autoSaveToggle) {
            autoSaveToggle.addEventListener('change', () => this.toggleAutoSave());
        }

        // Test connection button
        const testConnectionBtn = document.querySelector('.setting-card .btn-outline');
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => this.testApiConnection());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Periodic data refresh
        setInterval(() => this.refreshStats(), 5 * 60 * 1000); // Every 5 minutes
    }

    async loadDashboardData() {
        try {
            // Show loading state
            this.showStatsLoading(true);


            // Fetch stats from API
            const stats = await window.api.getStats();
            this.stats = stats;

            // Update dashboard stats
            this.updateStatsDisplay(stats);

            // Don't load initial tab content - let it load when user clicks tabs
            // This prevents timing issues with manager initialization

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            
            window.api.handleError(error, 'loading dashboard');
        } finally {
            this.showStatsLoading(false);
        }
    }

    updateStatsDisplay(stats) {
        const elements = {
            projectsCount: document.getElementById('projectsCount'),
            blogCount: document.getElementById('blogCount'),
            youtubeCount: document.getElementById('youtubeCount'),
            totalViews: document.getElementById('totalViews')
        };

        Object.entries(elements).forEach(([key, element]) => {
            if (element) {
                const statKey = key.replace('Count', '').replace('total', '').toLowerCase();
                const value = stats[statKey] || stats[key.replace('Count', '')] || 0;
                this.animateNumber(element, value);
            }
        });
    }

    animateNumber(element, targetValue) {
        const startValue = parseInt(element.textContent) || 0;
        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(startValue + (targetValue - startValue) * easeOut);
            
            element.textContent = currentValue.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    showStatsLoading(show) {
        const statNumbers = document.querySelectorAll('.stat-content h3');
        statNumbers.forEach(element => {
            if (show) {
                element.textContent = '...';
            }
        });
    }

    handleTabSwitch(e) {
        e.preventDefault();
        
        const link = e.currentTarget;
        const tabName = link.getAttribute('data-tab');
        
        if (tabName === this.currentTab) return;
        
        this.switchTab(tabName);
    }

    async switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Update current tab
        this.currentTab = tabName;

        // Load tab-specific content
        await this.loadTabContent(tabName);

        // Update URL hash
        window.location.hash = tabName;
    }

    async loadTabContent(tabName) {
        try {
            console.log(`Loading content for tab: ${tabName}`);
            
            switch (tabName) {
                case 'projects':
                    if (window.projectsManager) {
                        console.log('Loading projects...');
                        await window.projectsManager.loadProjects();
                    } else {
                        console.error('projectsManager not found');
                        window.auth.showToast('Projects manager not available', 'error');
                    }
                    break;
                case 'blog':
                    if (window.blogManager) {
                        console.log('Loading blog posts...');
                        await window.blogManager.loadBlogPosts();
                    } else {
                        console.error('blogManager not found');
                        window.auth.showToast('Blog manager not available', 'error');
                    }
                    break;
                case 'youtube':
                    if (window.youtubeManager) {
                        console.log('Loading YouTube videos...');
                        await window.youtubeManager.loadVideos();
                    } else {
                        console.error('youtubeManager not found');
                        window.auth.showToast('YouTube manager not available', 'error');
                    }
                    break;
                case 'images':
                    if (window.imageManager) {
                        console.log('Loading images...');
                        await window.imageManager.loadImages();
                    } else {
                        console.error('imageManager not found');
                        window.auth.showToast('Images manager not available', 'error');
                    }
                    break;
                case 'website-settings':
                    if (window.websiteSettingsManager) {
                        console.log('Loading website settings...');
                        await window.websiteSettingsManager.loadSettings();
                    } else {
                        console.error('websiteSettingsManager not found');
                        window.auth.showToast('Website settings manager not available', 'error');
                    }
                    break;
                case 'dashboard':
                    console.log('Refreshing dashboard stats...');
                    await this.refreshStats();
                    break;
            }
            console.log(`Successfully loaded ${tabName} content`);
        } catch (error) {
            console.error(`Error loading ${tabName} content:`, error);
            window.auth.showToast(`Failed to load ${tabName} content: ${error.message}`, 'error');
        }
    }

    async refreshStats() {
        try {
            const stats = await window.api.getStats();
            this.stats = stats;
            this.updateStatsDisplay(stats);
        } catch (error) {
            console.error('Error refreshing stats:', error);
        }
    }

    setupSettings() {
        // Load saved settings
        const darkMode = localStorage.getItem('dark_mode') === 'true';
        const autoSave = localStorage.getItem('auto_save') !== 'false'; // Default true
        const githubToken = localStorage.getItem('github_token') || '';
        const githubRepo = localStorage.getItem('github_repo') || 'pbadgi09/badgip-website';

        const darkModeToggle = document.getElementById('darkMode');
        const autoSaveToggle = document.getElementById('autoSave');
        const githubTokenInput = document.getElementById('githubToken');
        const githubRepoInput = document.getElementById('githubRepo');

        if (darkModeToggle) {
            darkModeToggle.checked = darkMode;
            if (darkMode) {
                this.enableDarkMode();
            }
        }

        if (autoSaveToggle) {
            autoSaveToggle.checked = autoSave;
        }

        if (githubTokenInput) {
            githubTokenInput.value = githubToken;
        }

        if (githubRepoInput) {
            githubRepoInput.value = githubRepo;
        }
    }

    updateGitHubToken() {
        const tokenInput = document.getElementById('githubToken');
        if (tokenInput && tokenInput.value.trim()) {
            window.api.setGitHubToken(tokenInput.value.trim());
            window.auth.showToast('GitHub token updated successfully', 'success');
        }
    }

    updateGitHubRepo() {
        const repoInput = document.getElementById('githubRepo');
        if (repoInput && repoInput.value.trim()) {
            window.api.setGitHubRepo(repoInput.value.trim());
            window.auth.showToast('GitHub repository updated successfully', 'success');
        }
    }

    async testApiConnection() {
        const button = document.querySelector('.setting-card .btn-outline');
        const originalText = button.innerHTML;
        
        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
            
            console.log('Testing API connection to:', window.api.baseURL);
            
            // First test basic connectivity
            const result = await window.api.testConnection();
            console.log('API test result:', result);
            
            if (result.success) {
                window.auth.showToast('Connection successful!', 'success');
                button.innerHTML = '<i class="fas fa-check"></i> Connected';
                
                // Also test a simple endpoint
                try {
                    console.log('Testing projects endpoint...');
                    const projectsTest = await window.api.getProjects({ limit: 1 });
                    console.log('Projects test result:', projectsTest);
                    
                    window.auth.showToast(`API working! Found ${projectsTest.data?.pagination?.totalItems || 0} projects`, 'success');
                } catch (endpointError) {
                    console.error('Endpoint test failed:', endpointError);
                    window.auth.showToast(`Connection OK but endpoints may have issues: ${endpointError.message}`, 'warning');
                }
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                }, 3000);
            } else {
                window.auth.showToast(`Connection failed: ${result.error}`, 'error');
                button.innerHTML = '<i class="fas fa-times"></i> Failed';
                setTimeout(() => {
                    button.innerHTML = originalText;
                }, 2000);
            }
        } catch (error) {
            console.error('Connection test error:', error);
            window.auth.showToast(`Connection test failed: ${error.message}`, 'error');
            button.innerHTML = '<i class="fas fa-times"></i> Failed';
            setTimeout(() => {
                button.innerHTML = originalText;
            }, 2000);
        } finally {
            button.disabled = false;
        }
    }

    toggleDarkMode() {
        const darkModeToggle = document.getElementById('darkMode');
        const isDarkMode = darkModeToggle.checked;
        
        localStorage.setItem('dark_mode', isDarkMode);
        
        if (isDarkMode) {
            this.enableDarkMode();
        } else {
            this.disableDarkMode();
        }
        
        window.auth.showToast(`Dark mode ${isDarkMode ? 'enabled' : 'disabled'}`, 'info');
    }

    enableDarkMode() {
        document.body.classList.add('dark-mode');
        // You can add dark mode CSS variables here
    }

    disableDarkMode() {
        document.body.classList.remove('dark-mode');
    }

    toggleAutoSave() {
        const autoSaveToggle = document.getElementById('autoSave');
        const isAutoSave = autoSaveToggle.checked;
        
        localStorage.setItem('auto_save', isAutoSave);
        window.auth.showToast(`Auto-save ${isAutoSave ? 'enabled' : 'disabled'}`, 'info');
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + number keys for tab switching
        if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
            e.preventDefault();
            const tabs = ['dashboard', 'projects', 'blog', 'youtube', 'settings'];
            const tabIndex = parseInt(e.key) - 1;
            if (tabs[tabIndex]) {
                this.switchTab(tabs[tabIndex]);
            }
        }

        // Escape key to close modals
        if (e.key === 'Escape') {
            this.closeAllModals();
        }

        // Ctrl/Cmd + S for quick save (if in form)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            const activeForm = document.querySelector('.modal.show form');
            if (activeForm) {
                e.preventDefault();
                const submitButton = activeForm.querySelector('button[type="submit"]');
                if (submitButton && !submitButton.disabled) {
                    submitButton.click();
                }
            }
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
    }

    // Utility methods for other modules
    showLoading(elementId, show = true) {
        const element = document.getElementById(elementId);
        if (element) {
            if (show) {
                element.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
            }
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatNumber(number) {
        return new Intl.NumberFormat().format(number);
    }

    truncateText(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Auto-save functionality
    setupAutoSave(formElement, saveCallback, interval = 30000) {
        if (localStorage.getItem('auto_save') === 'false') return;

        let autoSaveTimer;
        const inputs = formElement.querySelectorAll('input, textarea, select');
        
        const resetTimer = () => {
            if (autoSaveTimer) clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => {
                saveCallback('draft');
                window.auth.showToast('Draft saved automatically', 'info', 2000);
            }, interval);
        };

        inputs.forEach(input => {
            input.addEventListener('input', resetTimer);
            input.addEventListener('change', resetTimer);
        });

        return () => {
            if (autoSaveTimer) clearTimeout(autoSaveTimer);
        };
    }

    // Initialize on DOM load
    static initializeWhenReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.adminDashboard = new AdminDashboard();
            });
        } else {
            window.adminDashboard = new AdminDashboard();
        }
    }
}

// Global utility functions
window.switchTab = function(tabName) {
    if (window.adminDashboard) {
        window.adminDashboard.switchTab(tabName);
    }
};

window.showModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        // Focus first input
        const firstInput = modal.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
};

window.hideModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
};

// Initialize dashboard when ready
AdminDashboard.initializeWhenReady();