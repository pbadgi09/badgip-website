/**
 * Simplified Website Settings Management
 * Load website settings and provide comprehensive editing interface
 */

// Website settings management
window.settingsData = {};
window.currentSettingsTab = 'site';

// Load website settings from GitHub API
async function loadWebsiteSettings() {
    try {
        console.log('Loading website settings from GitHub API...');
        const response = await window.api.getSettings();
        window.settingsData = response.data || getDefaultSettings();
        console.log('Loaded website settings:', window.settingsData);
        displaySettingsContent();
        return true;
    } catch (error) {
        console.error('Error loading website settings:', error);
        document.getElementById('websiteSettingsList').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading website settings: ${error.message}</p>
                <button onclick="loadWebsiteSettings()" class="btn btn-primary">Retry</button>
            </div>
        `;
        return false;
    }
}

// Display settings content based on current tab
function displaySettingsContent() {
    const container = document.getElementById('websiteSettingsList');
    if (!container) return;

    const content = generateSettingsForm(window.currentSettingsTab);
    container.innerHTML = content;
    
    // Setup form event listeners
    setupFormEventListeners();
}

// Generate settings form based on selected tab
function generateSettingsForm(tabName) {
    switch (tabName) {
        case 'site':
            return generateSiteInfoForm();
        case 'hero':
            return generateHeroForm();
        case 'navigation':
            return generateNavigationForm();
        case 'social':
            return generateSocialMediaForm();
        case 'contact':
            return generateContactForm();
        case 'footer':
            return generateFooterForm();
        case 'colors':
            return generateColorsForm();
        default:
            return '<div class="info-message">Please select a settings category.</div>';
    }
}

// Generate Site Info form
function generateSiteInfoForm() {
    const site = window.settingsData.site || {};
    
    return `
        <div class="settings-form">
            <h3><i class="fas fa-globe"></i> Site Information</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label for="siteTitle">Site Title</label>
                    <input type="text" id="siteTitle" value="${site.title || ''}" placeholder="Portfolio Website Title">
                </div>
                <div class="form-group">
                    <label for="siteDescription">Meta Description</label>
                    <textarea id="siteDescription" rows="3" placeholder="Brief description for search engines">${site.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="siteAuthor">Author Name</label>
                    <input type="text" id="siteAuthor" value="${site.author || ''}" placeholder="Your name">
                </div>
                <div class="form-group">
                    <label for="siteKeywords">Keywords (comma-separated)</label>
                    <input type="text" id="siteKeywords" value="${site.keywords || ''}" placeholder="portfolio, developer, projects">
                </div>
            </div>
        </div>
    `;
}

// Generate Hero Section form
function generateHeroForm() {
    const hero = window.settingsData.hero || {};
    
    return `
        <div class="settings-form">
            <h3><i class="fas fa-star"></i> Hero Section</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label for="heroGreeting">Greeting Text</label>
                    <input type="text" id="heroGreeting" value="${hero.greeting || ''}" placeholder="Hello, I'm">
                </div>
                <div class="form-group">
                    <label for="heroName">Name</label>
                    <input type="text" id="heroName" value="${hero.name || ''}" placeholder="Your Name">
                </div>
                <div class="form-group">
                    <label for="heroSubtitle">Subtitle</label>
                    <input type="text" id="heroSubtitle" value="${hero.subtitle || ''}" placeholder="Full Stack Developer">
                </div>
                <div class="form-group span-2">
                    <label for="heroDescription">Description</label>
                    <textarea id="heroDescription" rows="4" placeholder="Brief description of what you do">${hero.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="heroPrimaryBtnText">Primary Button Text</label>
                    <input type="text" id="heroPrimaryBtnText" value="${hero.primaryButton?.text || ''}" placeholder="View My Work">
                </div>
                <div class="form-group">
                    <label for="heroPrimaryBtnLink">Primary Button Link</label>
                    <input type="text" id="heroPrimaryBtnLink" value="${hero.primaryButton?.link || ''}" placeholder="#projects">
                </div>
                <div class="form-group">
                    <label for="heroSecondaryBtnText">Secondary Button Text</label>
                    <input type="text" id="heroSecondaryBtnText" value="${hero.secondaryButton?.text || ''}" placeholder="Get In Touch">
                </div>
                <div class="form-group">
                    <label for="heroSecondaryBtnLink">Secondary Button Link</label>
                    <input type="text" id="heroSecondaryBtnLink" value="${hero.secondaryButton?.link || ''}" placeholder="#contact">
                </div>
            </div>
        </div>
    `;
}

// Generate Navigation form
function generateNavigationForm() {
    const nav = window.settingsData.navigation || {};
    const items = nav.items || [];
    
    let itemsHtml = '';
    items.forEach((item, index) => {
        itemsHtml += `
            <div class="nav-item-group">
                <div class="form-group">
                    <label for="navText${index}">Text</label>
                    <input type="text" id="navText${index}" value="${item.text || ''}" placeholder="Home">
                </div>
                <div class="form-group">
                    <label for="navLink${index}">Link</label>
                    <input type="text" id="navLink${index}" value="${item.link || ''}" placeholder="#home">
                </div>
                <div class="form-group">
                    <label for="navSection${index}">Section ID</label>
                    <input type="text" id="navSection${index}" value="${item.section || ''}" placeholder="home">
                </div>
                <div class="form-group">
                    <button type="button" onclick="removeNavItem(${index})" class="btn btn-sm btn-danger">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;
    });
    
    return `
        <div class="settings-form">
            <h3><i class="fas fa-bars"></i> Navigation</h3>
            <div class="form-grid">
                <div class="form-group span-2">
                    <label for="navLogo">Logo Text</label>
                    <input type="text" id="navLogo" value="${nav.logo || ''}" placeholder="Your Name">
                </div>
            </div>
            
            <h4>Navigation Items</h4>
            <div id="navItems" class="nav-items-container">
                ${itemsHtml}
            </div>
            
            <button type="button" onclick="addNavItem()" class="btn btn-outline">
                <i class="fas fa-plus"></i> Add Navigation Item
            </button>
        </div>
    `;
}

// Generate Social Media form
function generateSocialMediaForm() {
    const social = window.settingsData.social || {};
    
    return `
        <div class="settings-form">
            <h3><i class="fas fa-share-alt"></i> Social Media Links</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="githubEnabled" ${social.github?.enabled ? 'checked' : ''}> 
                        Enable GitHub
                    </label>
                </div>
                <div class="form-group">
                    <label for="githubUrl">GitHub URL</label>
                    <input type="url" id="githubUrl" value="${social.github?.url || ''}" placeholder="https://github.com/username">
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="linkedinEnabled" ${social.linkedin?.enabled ? 'checked' : ''}> 
                        Enable LinkedIn
                    </label>
                </div>
                <div class="form-group">
                    <label for="linkedinUrl">LinkedIn URL</label>
                    <input type="url" id="linkedinUrl" value="${social.linkedin?.url || ''}" placeholder="https://linkedin.com/in/username">
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="youtubeEnabled" ${social.youtube?.enabled ? 'checked' : ''}> 
                        Enable YouTube
                    </label>
                </div>
                <div class="form-group">
                    <label for="youtubeUrl">YouTube URL</label>
                    <input type="url" id="youtubeUrl" value="${social.youtube?.url || ''}" placeholder="https://youtube.com/@username">
                </div>
            </div>
        </div>
    `;
}

// Generate Contact form
function generateContactForm() {
    const contact = window.settingsData.contact || {};
    
    return `
        <div class="settings-form">
            <h3><i class="fas fa-envelope"></i> Contact Information</h3>
            <div class="form-grid">
                <div class="form-group span-2">
                    <label for="contactTitle">Section Title</label>
                    <input type="text" id="contactTitle" value="${contact.title || ''}" placeholder="Get In Touch">
                </div>
                <div class="form-group span-2">
                    <label for="contactSubtitle">Section Subtitle</label>
                    <input type="text" id="contactSubtitle" value="${contact.subtitle || ''}" placeholder="Let's discuss your next project">
                </div>
                
                <div class="form-group">
                    <label for="emailLabel">Email Label</label>
                    <input type="text" id="emailLabel" value="${contact.email?.label || ''}" placeholder="Email">
                </div>
                <div class="form-group">
                    <label for="emailValue">Email Address</label>
                    <input type="email" id="emailValue" value="${contact.email?.value || ''}" placeholder="hello@example.com">
                </div>
                
                <div class="form-group">
                    <label for="locationLabel">Location Label</label>
                    <input type="text" id="locationLabel" value="${contact.location?.label || ''}" placeholder="Location">
                </div>
                <div class="form-group">
                    <label for="locationValue">Location Value</label>
                    <input type="text" id="locationValue" value="${contact.location?.value || ''}" placeholder="Available for remote work">
                </div>
                
                <div class="form-group">
                    <label for="phoneLabel">Phone Label</label>
                    <input type="text" id="phoneLabel" value="${contact.phone?.label || ''}" placeholder="Phone">
                </div>
                <div class="form-group">
                    <label for="phoneValue">Phone Value</label>
                    <input type="text" id="phoneValue" value="${contact.phone?.value || ''}" placeholder="Available on request">
                </div>
            </div>
        </div>
    `;
}

// Generate Footer form
function generateFooterForm() {
    const footer = window.settingsData.footer || {};
    
    return `
        <div class="settings-form">
            <h3><i class="fas fa-copyright"></i> Footer Settings</h3>
            <div class="form-grid">
                <div class="form-group span-2">
                    <label for="footerDescription">Footer Description</label>
                    <textarea id="footerDescription" rows="3" placeholder="Brief description for footer">${footer.description || ''}</textarea>
                </div>
                <div class="form-group span-2">
                    <label for="footerCopyright">Copyright Text</label>
                    <input type="text" id="footerCopyright" value="${footer.copyright || ''}" placeholder="© 2023 Your Name. All rights reserved.">
                </div>
            </div>
        </div>
    `;
}

// Generate Colors form with color pickers
function generateColorsForm() {
    const colors = window.settingsData.colors || {};
    
    return `
        <div class="settings-form">
            <h3><i class="fas fa-palette"></i> Color Scheme</h3>
            <div class="color-grid">
                <div class="color-group">
                    <label for="primaryColor">Primary Color</label>
                    <input type="color" id="primaryColor" value="${colors.primary || '#6366f1'}" onchange="previewColor('primary', this.value)">
                    <input type="text" id="primaryColorText" value="${colors.primary || '#6366f1'}" placeholder="#6366f1">
                </div>
                
                <div class="color-group">
                    <label for="primaryLightColor">Primary Light</label>
                    <input type="color" id="primaryLightColor" value="${colors.primaryLight || '#818cf8'}" onchange="previewColor('primaryLight', this.value)">
                    <input type="text" id="primaryLightColorText" value="${colors.primaryLight || '#818cf8'}" placeholder="#818cf8">
                </div>
                
                <div class="color-group">
                    <label for="primaryDarkColor">Primary Dark</label>
                    <input type="color" id="primaryDarkColor" value="${colors.primaryDark || '#4f46e5'}" onchange="previewColor('primaryDark', this.value)">
                    <input type="text" id="primaryDarkColorText" value="${colors.primaryDark || '#4f46e5'}" placeholder="#4f46e5">
                </div>
                
                <div class="color-group">
                    <label for="secondaryColor">Secondary Color</label>
                    <input type="color" id="secondaryColor" value="${colors.secondary || '#f59e0b'}" onchange="previewColor('secondary', this.value)">
                    <input type="text" id="secondaryColorText" value="${colors.secondary || '#f59e0b'}" placeholder="#f59e0b">
                </div>
                
                <div class="color-group">
                    <label for="accentColor">Accent Color</label>
                    <input type="color" id="accentColor" value="${colors.accent || '#06b6d4'}" onchange="previewColor('accent', this.value)">
                    <input type="text" id="accentColorText" value="${colors.accent || '#06b6d4'}" placeholder="#06b6d4">
                </div>
                
                <div class="color-group">
                    <label for="backgroundColorInput">Background Color</label>
                    <input type="color" id="backgroundColorInput" value="${colors.background || '#111827'}" onchange="previewColor('background', this.value)">
                    <input type="text" id="backgroundColorText" value="${colors.background || '#111827'}" placeholder="#111827">
                </div>
            </div>
        </div>
    `;
}

// Setup form event listeners
function setupFormEventListeners() {
    // Settings navigation tabs
    document.querySelectorAll('.settings-nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            document.querySelectorAll('.settings-nav-btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            // Update current tab
            window.currentSettingsTab = this.dataset.settingsTab;
            // Display new content
            displaySettingsContent();
        });
    });
}

// Color preview function
function previewColor(colorKey, colorValue) {
    // Update the text input
    const textInput = document.getElementById(`${colorKey}ColorText`) || document.getElementById(`${colorKey}Color`);
    if (textInput) {
        textInput.value = colorValue;
    }
    
    // Apply color to CSS variable for live preview
    const cssVarName = '--' + colorKey.replace(/([A-Z])/g, '-$1').toLowerCase();
    document.documentElement.style.setProperty(cssVarName, colorValue);
}

// Navigation item management
function addNavItem() {
    const container = document.getElementById('navItems');
    const index = container.children.length;
    
    const newItem = document.createElement('div');
    newItem.className = 'nav-item-group';
    newItem.innerHTML = `
        <div class="form-group">
            <label for="navText${index}">Text</label>
            <input type="text" id="navText${index}" value="" placeholder="Menu Item">
        </div>
        <div class="form-group">
            <label for="navLink${index}">Link</label>
            <input type="text" id="navLink${index}" value="" placeholder="#section">
        </div>
        <div class="form-group">
            <label for="navSection${index}">Section ID</label>
            <input type="text" id="navSection${index}" value="" placeholder="section">
        </div>
        <div class="form-group">
            <button type="button" onclick="removeNavItem(${index})" class="btn btn-sm btn-danger">
                <i class="fas fa-trash"></i> Remove
            </button>
        </div>
    `;
    container.appendChild(newItem);
}

function removeNavItem(index) {
    const container = document.getElementById('navItems');
    const items = container.children;
    if (items[index]) {
        items[index].remove();
    }
}

// Collect form data from current tab
function collectCurrentTabData() {
    const tabName = window.currentSettingsTab;
    
    switch (tabName) {
        case 'site':
            return {
                site: {
                    title: document.getElementById('siteTitle')?.value || '',
                    description: document.getElementById('siteDescription')?.value || '',
                    author: document.getElementById('siteAuthor')?.value || '',
                    keywords: document.getElementById('siteKeywords')?.value || ''
                }
            };
        case 'hero':
            return {
                hero: {
                    greeting: document.getElementById('heroGreeting')?.value || '',
                    name: document.getElementById('heroName')?.value || '',
                    subtitle: document.getElementById('heroSubtitle')?.value || '',
                    description: document.getElementById('heroDescription')?.value || '',
                    primaryButton: {
                        text: document.getElementById('heroPrimaryBtnText')?.value || '',
                        link: document.getElementById('heroPrimaryBtnLink')?.value || ''
                    },
                    secondaryButton: {
                        text: document.getElementById('heroSecondaryBtnText')?.value || '',
                        link: document.getElementById('heroSecondaryBtnLink')?.value || ''
                    }
                }
            };
        case 'social':
            return {
                social: {
                    github: {
                        url: document.getElementById('githubUrl')?.value || '',
                        enabled: document.getElementById('githubEnabled')?.checked || false,
                        label: 'GitHub'
                    },
                    linkedin: {
                        url: document.getElementById('linkedinUrl')?.value || '',
                        enabled: document.getElementById('linkedinEnabled')?.checked || false,
                        label: 'LinkedIn'
                    },
                    youtube: {
                        url: document.getElementById('youtubeUrl')?.value || '',
                        enabled: document.getElementById('youtubeEnabled')?.checked || false,
                        label: 'YouTube'
                    }
                }
            };
        case 'contact':
            return {
                contact: {
                    title: document.getElementById('contactTitle')?.value || '',
                    subtitle: document.getElementById('contactSubtitle')?.value || '',
                    email: {
                        label: document.getElementById('emailLabel')?.value || '',
                        value: document.getElementById('emailValue')?.value || ''
                    },
                    location: {
                        label: document.getElementById('locationLabel')?.value || '',
                        value: document.getElementById('locationValue')?.value || ''
                    },
                    phone: {
                        label: document.getElementById('phoneLabel')?.value || '',
                        value: document.getElementById('phoneValue')?.value || ''
                    }
                }
            };
        case 'footer':
            return {
                footer: {
                    description: document.getElementById('footerDescription')?.value || '',
                    copyright: document.getElementById('footerCopyright')?.value || ''
                }
            };
        case 'colors':
            return {
                colors: {
                    primary: document.getElementById('primaryColorText')?.value || '#6366f1',
                    primaryLight: document.getElementById('primaryLightColorText')?.value || '#818cf8',
                    primaryDark: document.getElementById('primaryDarkColorText')?.value || '#4f46e5',
                    secondary: document.getElementById('secondaryColorText')?.value || '#f59e0b',
                    accent: document.getElementById('accentColorText')?.value || '#06b6d4',
                    background: document.getElementById('backgroundColorText')?.value || '#111827'
                }
            };
        default:
            return {};
    }
}

// Save settings section
async function saveSettingsSection() {
    try {
        const sectionData = collectCurrentTabData();
        console.log('Saving settings section:', window.currentSettingsTab, sectionData);
        
        const response = await window.api.updateSettingsSection(Object.keys(sectionData)[0], Object.values(sectionData)[0]);
        
        if (response.success) {
            // Update local data
            window.settingsData = { ...window.settingsData, ...sectionData };
            alert(`${window.currentSettingsTab} settings saved successfully!`);
        }
    } catch (error) {
        console.error('Error saving settings section:', error);
        alert(`Error saving settings: ${error.message}`);
    }
}

// Save all settings
async function saveAllSettings() {
    try {
        console.log('Saving all settings:', window.settingsData);
        const response = await window.api.updateSettings(window.settingsData);
        
        if (response.success) {
            alert('All settings saved successfully!');
        }
    } catch (error) {
        console.error('Error saving all settings:', error);
        alert(`Error saving settings: ${error.message}`);
    }
}

// Get default settings
function getDefaultSettings() {
    return {
        site: {
            title: "Portfolio Website",
            description: "A modern portfolio website",
            author: "Website Owner",
            keywords: "portfolio, developer"
        },
        hero: {
            greeting: "Hello, I'm",
            name: "Your Name", 
            subtitle: "Web Developer",
            description: "Building modern web applications.",
            primaryButton: { text: "View Work", link: "#projects" },
            secondaryButton: { text: "Contact", link: "#contact" }
        },
        colors: {
            primary: "#6366f1",
            primaryLight: "#818cf8",
            primaryDark: "#4f46e5"
        }
    };
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Settings action buttons
    const saveAllBtn = document.getElementById('saveAllSettings');
    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', saveAllSettings);
    }
    
    const previewBtn = document.getElementById('previewSettings');  
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            window.open(window.location.origin, '_blank');
        });
    }
});

// Export for admin panel to use
window.loadWebsiteSettings = loadWebsiteSettings;
window.websiteSettingsManager = {
    loadSettings: loadWebsiteSettings
};