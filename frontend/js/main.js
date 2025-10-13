/*
 * Modern Portfolio Website - Main JavaScript
 * Features: Smooth scrolling, mobile navigation, form handling, animations
 * Author: Pranav Badgi
 */

// ==============================================
// Application Configuration
// ==============================================
const CONFIG = {
  // Version for cache busting
  VERSION: '1.0.1-blog-fix',
  
  // API endpoints - connected to Railway backend
  API_BASE_URL: 'https://badgip-website-production.up.railway.app/api',
  
  // Animation settings
  SCROLL_OFFSET: 100,
  ANIMATION_DELAY: 150,
  
  // Form settings
  FORM_SUBMIT_TIMEOUT: 5000,
  
  // Intersection Observer settings
  OBSERVER_OPTIONS: {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  }
};

// ==============================================
// Utility Functions
// ==============================================

/**
 * Debounce function to limit the rate of function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately
 * @returns {Function} Debounced function
 */
function debounce(func, wait, immediate) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

/**
 * Throttle function to limit function execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Check if element is in viewport
 * @param {Element} element - DOM element to check
 * @returns {boolean} True if element is in viewport
 */
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Smooth scroll to target element
 * @param {string} targetId - ID of target element
 * @param {number} offset - Scroll offset
 */
function smoothScrollTo(targetId, offset = CONFIG.SCROLL_OFFSET) {
  const targetElement = document.getElementById(targetId);
  if (targetElement) {
    const targetPosition = targetElement.offsetTop - offset;
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  }
}

/**
 * Show loading state on button
 * @param {Element} button - Button element
 * @param {string} loadingText - Loading text to display
 */
function showButtonLoading(button, loadingText = 'Loading...') {
  button.dataset.originalText = button.textContent;
  button.innerHTML = `<span class="loading"></span> ${loadingText}`;
  button.disabled = true;
}

/**
 * Hide loading state on button
 * @param {Element} button - Button element
 */
function hideButtonLoading(button) {
  button.textContent = button.dataset.originalText || 'Submit';
  button.disabled = false;
  delete button.dataset.originalText;
}

/**
 * Display notification message
 * @param {string} message - Message to display
 * @param {string} type - Notification type (success, error, info)
 */
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-message">${message}</span>
      <button class="notification-close" aria-label="Close">&times;</button>
    </div>
  `;
  
  // Add to DOM
  document.body.appendChild(notification);
  
  // Show notification
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // Auto-hide after 5 seconds
  const hideTimeout = setTimeout(() => {
    hideNotification(notification);
  }, 5000);
  
  // Handle close button
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    clearTimeout(hideTimeout);
    hideNotification(notification);
  });
}

/**
 * Hide notification
 * @param {Element} notification - Notification element
 */
function hideNotification(notification) {
  notification.classList.remove('show');
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
}

// ==============================================
// Navigation Component
// ==============================================
class Navigation {
  constructor() {
    this.navbar = document.getElementById('navbar');
    this.navMenu = document.getElementById('nav-menu');
    this.hamburger = document.getElementById('hamburger');
    this.navLinks = document.querySelectorAll('.nav-link');
    this.isMenuOpen = false;
    
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.updateActiveLink();
  }
  
  bindEvents() {
    // Mobile menu toggle
    if (this.hamburger) {
      this.hamburger.addEventListener('click', () => this.toggleMobileMenu());
    }
    
    // Navigation link clicks
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => this.handleNavLinkClick(e));
    });
    
    // Scroll event for navbar styling and active link updates
    window.addEventListener('scroll', throttle(() => {
      this.updateNavbarStyle();
      this.updateActiveLink();
    }, 100));
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isMenuOpen && !this.navbar.contains(e.target)) {
        this.closeMobileMenu();
      }
    });
    
    // Handle escape key to close mobile menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isMenuOpen) {
        this.closeMobileMenu();
      }
    });
  }
  
  toggleMobileMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    
    if (this.isMenuOpen) {
      this.openMobileMenu();
    } else {
      this.closeMobileMenu();
    }
  }
  
  openMobileMenu() {
    this.navMenu.classList.add('active');
    this.hamburger.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.isMenuOpen = true;
  }
  
  closeMobileMenu() {
    this.navMenu.classList.remove('active');
    this.hamburger.classList.remove('active');
    document.body.style.overflow = '';
    this.isMenuOpen = false;
  }
  
  handleNavLinkClick(e) {
    e.preventDefault();
    const targetId = e.target.getAttribute('href').substring(1);
    
    // Close mobile menu if open
    if (this.isMenuOpen) {
      this.closeMobileMenu();
    }
    
    // Smooth scroll to target
    smoothScrollTo(targetId);
    
    // Update active link
    this.setActiveLink(e.target);
  }
  
  updateNavbarStyle() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 50) {
      this.navbar.classList.add('scrolled');
    } else {
      this.navbar.classList.remove('scrolled');
    }
  }
  
  updateActiveLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    let currentSection = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop - CONFIG.SCROLL_OFFSET - 50;
      const sectionHeight = section.offsetHeight;
      
      if (scrollTop >= sectionTop && scrollTop < sectionTop + sectionHeight) {
        currentSection = section.getAttribute('id');
      }
    });
    
    if (currentSection) {
      this.setActiveLinkBySection(currentSection);
    }
  }
  
  setActiveLink(linkElement) {
    this.navLinks.forEach(link => link.classList.remove('active'));
    linkElement.classList.add('active');
  }
  
  setActiveLinkBySection(sectionId) {
    this.navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${sectionId}`) {
        link.classList.add('active');
      }
    });
  }
}

// ==============================================
// Scroll Animations Component
// ==============================================
class ScrollAnimations {
  constructor() {
    this.observer = null;
    this.animatedElements = document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right');
    
    this.init();
  }
  
  init() {
    this.setupIntersectionObserver();
    this.observeElements();
  }
  
  setupIntersectionObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Add delay for staggered animation
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, index * CONFIG.ANIMATION_DELAY);
          
          // Stop observing this element
          this.observer.unobserve(entry.target);
        }
      });
    }, CONFIG.OBSERVER_OPTIONS);
  }
  
  observeElements() {
    this.animatedElements.forEach(element => {
      this.observer.observe(element);
    });
  }
  
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// ==============================================
// Contact Form Component
// ==============================================
class ContactForm {
  constructor() {
    this.form = document.getElementById('contact-form');
    this.submitButton = null;
    
    if (this.form) {
      this.submitButton = this.form.querySelector('button[type="submit"]');
      this.init();
    }
  }
  
  init() {
    this.bindEvents();
    this.setupValidation();
  }
  
  bindEvents() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Real-time validation
    const inputs = this.form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearFieldError(input));
    });
  }
  
  setupValidation() {
    // Add required attribute validation messages
    const requiredFields = this.form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
      field.addEventListener('invalid', (e) => {
        e.preventDefault();
        this.showFieldError(field, this.getValidationMessage(field));
      });
    });
  }
  
  async handleSubmit(e) {
    e.preventDefault();
    
    if (!this.validateForm()) {
      return;
    }
    
    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData.entries());
    
    try {
      showButtonLoading(this.submitButton, 'Sending...');
      
      // Simulate API call (replace with actual API call)
      await this.submitToAPI(data);
      
      // Success
      showNotification('Message sent successfully! I\'ll get back to you soon.', 'success');
      this.form.reset();
      
    } catch (error) {
      console.error('Form submission error:', error);
      showNotification('Failed to send message. Please try again later.', 'error');
    } finally {
      hideButtonLoading(this.submitButton);
    }
  }
  
  async submitToAPI(data) {
    // Simulate API call - replace with actual endpoint
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate random success/failure for demo
        if (Math.random() > 0.1) {
          resolve({ success: true });
        } else {
          reject(new Error('Network error'));
        }
      }, 2000);
    });
    
    // Actual implementation would be:
    /*
    const response = await fetch(`${CONFIG.API_BASE_URL}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit form');
    }
    
    return response.json();
    */
  }
  
  validateForm() {
    const inputs = this.form.querySelectorAll('input, textarea');
    let isValid = true;
    
    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });
    
    return isValid;
  }
  
  validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let message = '';
    
    // Required field check
    if (field.hasAttribute('required') && !value) {
      isValid = false;
      message = `${this.getFieldLabel(field)} is required`;
    }
    
    // Email validation
    if (field.type === 'email' && value && !this.isValidEmail(value)) {
      isValid = false;
      message = 'Please enter a valid email address';
    }
    
    // Name validation (at least 2 characters)
    if (field.name === 'name' && value && value.length < 2) {
      isValid = false;
      message = 'Name must be at least 2 characters long';
    }
    
    // Message validation (at least 10 characters)
    if (field.name === 'message' && value && value.length < 10) {
      isValid = false;
      message = 'Message must be at least 10 characters long';
    }
    
    if (isValid) {
      this.clearFieldError(field);
    } else {
      this.showFieldError(field, message);
    }
    
    return isValid;
  }
  
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  getFieldLabel(field) {
    const label = this.form.querySelector(`label[for="${field.id}"]`);
    return label ? label.textContent.trim() : field.name;
  }
  
  getValidationMessage(field) {
    if (field.validity.valueMissing) {
      return `${this.getFieldLabel(field)} is required`;
    }
    if (field.validity.typeMismatch) {
      return `Please enter a valid ${field.type}`;
    }
    return 'Please check this field';
  }
  
  showFieldError(field, message) {
    this.clearFieldError(field);
    
    field.classList.add('error');
    
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    
    field.parentNode.appendChild(errorElement);
  }
  
  clearFieldError(field) {
    field.classList.remove('error');
    
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
      errorElement.remove();
    }
  }
}

// ==============================================
// Content Management System
// ==============================================
class ContentManager {
  constructor() {
    console.log('📦 BLOG DEBUG: JavaScript version loaded:', CONFIG.VERSION);
    console.log('🔄 BLOG DEBUG: ContentManager constructor starting');
    
    this.projectsContainer = document.getElementById('projects-grid');
    this.blogContainer = document.getElementById('blog-grid');
    this.youtubeContainer = document.getElementById('youtube-grid');
    this.loadMoreProjectsBtn = document.getElementById('load-more-projects');
    
    console.log('🔄 BLOG DEBUG: blogContainer found:', !!this.blogContainer);
    
    this.currentProjectPage = 1;
    this.projectsPerPage = 6;
    
    this.init();
  }
  
  init() {
    this.bindEvents();
    // Load initial content (will be replaced with API calls)
    this.loadSampleContent();
  }
  
  bindEvents() {
    if (this.loadMoreProjectsBtn) {
      this.loadMoreProjectsBtn.addEventListener('click', () => this.loadMoreProjects());
    }
    
    // Video play buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('.play-button')) {
        this.handleVideoPlay(e.target.closest('.video-card'));
      }
    });
  }
  
  async loadMoreProjects() {
    try {
      showButtonLoading(this.loadMoreProjectsBtn, 'Loading...');
      
      // Simulate API call
      const projects = await this.fetchProjects(this.currentProjectPage + 1);
      
      if (projects.length > 0) {
        this.renderProjects(projects, true);
        this.currentProjectPage++;
      } else {
        this.loadMoreProjectsBtn.style.display = 'none';
        showNotification('No more projects to load', 'info');
      }
      
    } catch (error) {
      console.error('Error loading projects:', error);
      showNotification('Failed to load more projects', 'error');
    } finally {
      hideButtonLoading(this.loadMoreProjectsBtn);
    }
  }
  
  async fetchProjects(page = 1) {
    try {
      const url = `${CONFIG.API_BASE_URL}/projects?page=${page}&limit=${this.projectsPerPage}`;
      console.log('🌐 Fetching from URL:', url);
      
      const response = await fetch(url);
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 API Response:', data);
      
      if (data.success && data.data && data.data.projects) {
        console.log('✅ Successfully parsed projects:', data.data.projects.length);
        return data.data.projects;
      } else {
        console.log('⚠️ API response structure unexpected:', data);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching projects:', error);
      console.log('🔄 No fallback projects - returning empty array');
      // Return empty array instead of sample projects
      return [];
    }
  }
  
  generateSampleProjects(count) {
    const projects = [];
    const techs = ['React', 'Vue.js', 'Node.js', 'Python', 'MongoDB', 'PostgreSQL', 'Docker', 'AWS'];
    
    for (let i = 0; i < count; i++) {
      projects.push({
        id: Date.now() + i,
        title: `Sample Project ${this.currentProjectPage * 3 + i + 1}`,
        description: 'A comprehensive web application built with modern technologies and best practices.',
        image: 'assets/images/project-placeholder.jpg',
        technologies: this.getRandomTechs(techs, 3),
        liveUrl: '#',
        githubUrl: '#'
      });
    }
    
    return projects;
  }
  
  getRandomTechs(techs, count) {
    const shuffled = [...techs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
  
  renderProjects(projects, append = false) {
    console.log('🎨 Rendering projects:', { projects: projects.length, append, containerExists: !!this.projectsContainer });
    
    if (!this.projectsContainer) {
      console.error('❌ Projects container not found! Looking for element with ID: projects-grid');
      return;
    }
    
    if (!append) {
      console.log('🧹 Clearing existing content from projects container');
      this.projectsContainer.innerHTML = '';
    }
    
    projects.forEach((project, index) => {
      console.log(`📝 Creating project card ${index + 1}:`, project.title);
      const projectCard = this.createProjectCard(project);
      this.projectsContainer.appendChild(projectCard);
    });
    
    console.log('✅ Projects rendering complete. Container children:', this.projectsContainer.children.length);
  }
  
  createProjectCard(project) {
    console.log('🎨 Creating project card for:', project);
    
    const card = document.createElement('div');
    card.className = 'project-card glass-card fade-in';
    card.setAttribute('data-project', project._id || project.id);
    
    console.log('📦 Created card element:', card);
    
    // Handle both API data structure and sample data structure
    const projectImage = project.primaryImage?.url || project.image || 'https://via.placeholder.com/400x200/6366f1/ffffff?text=Project+Image';
    const liveUrl = project.links?.live || project.liveUrl || '';
    const githubUrl = project.links?.github || project.githubUrl || '';
    const technologies = project.technologies || [];
    
    // Add inline styles to ensure visibility
    card.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      min-height: 400px;
      margin-bottom: 20px;
      backdrop-filter: blur(20px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      visibility: visible !important;
      display: block !important;
      opacity: 1 !important;
    `;
    
    card.innerHTML = `
      <div class="project-image" style="height: 200px; background: #6366f1; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">
        ${project.title} - Image
      </div>
      <div class="project-content" style="padding: 20px; color: white;">
        <h3 class="project-title" style="margin: 0 0 10px 0; color: white; font-size: 20px;">${project.title}</h3>
        <p class="project-description" style="margin: 0 0 15px 0; color: rgba(255,255,255,0.8);">${project.description}</p>
        <div class="project-tech" style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${technologies.map(tech => `<span style="background: #6366f1; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">${tech}</span>`).join('')}
        </div>
        ${project.featured ? '<div style="position: absolute; top: 10px; right: 10px; background: #06b6d4; color: white; padding: 4px 12px; border-radius: 20px; font-size: 10px; text-transform: uppercase;">Featured</div>' : ''}
      </div>
    `;
    
    console.log('✅ Project card HTML created with proper styling');
    
    return card;
  }
  
  handleVideoPlay(videoCard) {
    const thumbnail = videoCard.querySelector('.video-thumbnail img');
    const videoUrl = videoCard.dataset.videoUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    
    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = `${videoUrl}?autoplay=1`;
    iframe.setAttribute('allowfullscreen', '');
    iframe.style.width = '100%';
    iframe.style.height = '200px';
    iframe.style.border = 'none';
    
    // Replace thumbnail with iframe
    const thumbnailContainer = videoCard.querySelector('.video-thumbnail');
    thumbnailContainer.innerHTML = '';
    thumbnailContainer.appendChild(iframe);
  }
  
  async loadSampleContent() {
    console.log('🚀 Starting to load content from API...');
    
    try {
      // Load initial projects
      console.log('📂 Fetching projects from API...');
      const projects = await this.fetchProjects(1);
      console.log('📊 Received projects:', projects);
      
      if (projects.length > 0) {
        console.log('✅ Rendering projects:', projects.length);
        this.renderProjects(projects);
        this.showSection('projects');
        this.currentProjectPage = 1;
      } else {
        console.log('⚠️ No projects found, hiding projects section');
        this.hideSection('projects');
      }
      
      // Load blog posts and YouTube videos
      const blogHasContent = await this.loadBlogPosts();
      const youtubeHasContent = await this.loadYouTubeVideos();
      
      // Update navigation based on available content
      this.updateNavigation(projects.length > 0, blogHasContent, youtubeHasContent);
      
      console.log('✅ Content management system initialized with real data');
    } catch (error) {
      console.error('❌ Error loading initial content:', error);
      console.log('🔄 Content management system initialized with fallback data');
    }
  }

  async loadBlogPosts() {
    try {
      console.log('🔄 BLOG DEBUG: Starting loadBlogPosts function');
      console.log('🔄 BLOG DEBUG: API URL:', `${CONFIG.API_BASE_URL}/blog?limit=3`);
      console.log('🔄 BLOG DEBUG: blogContainer element:', this.blogContainer);
      
      const response = await fetch(`${CONFIG.API_BASE_URL}/blog?limit=3`);
      console.log('🔄 BLOG DEBUG: Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔄 BLOG DEBUG: Raw API response:', data);
        
        const posts = data.success ? data.data.posts : [];
        console.log('📝 BLOG DEBUG: Processed posts:', posts);
        console.log('📝 BLOG DEBUG: Posts length:', posts.length);
        
        if (posts.length > 0) {
          console.log('✅ BLOG DEBUG: Found posts, calling renderBlogPosts');
          this.renderBlogPosts(posts);
          console.log('✅ BLOG DEBUG: Called renderBlogPosts, now showing section');
          this.showSection('blog');
          console.log('✅ BLOG DEBUG: Blog section should now be visible');
          return true;
        } else {
          console.log('⚠️ BLOG DEBUG: No blog posts found, hiding blog section');
          this.hideSection('blog');
          return false;
        }
      } else {
        console.error('❌ BLOG DEBUG: Response not OK:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ BLOG DEBUG: Error loading blog posts:', error);
      this.hideSection('blog');
      return false;
    }
  }

  async loadYouTubeVideos() {
    try {
      console.log('🎥 Fetching YouTube videos from API...');
      const response = await fetch(`${CONFIG.API_BASE_URL}/youtube?limit=3&featured=true`);
      if (response.ok) {
        const data = await response.json();
        const videos = data.success ? data.data.videos : [];
        console.log('🎥 Received YouTube videos:', videos.length);
        
        if (videos.length > 0) {
          this.renderYouTubeVideos(videos);
          this.showSection('youtube');
          return true;
        } else {
          console.log('⚠️ No YouTube videos found, hiding YouTube section');
          this.hideSection('youtube');
          return false;
        }
      }
    } catch (error) {
      console.error('❌ Error loading YouTube videos:', error);
      this.hideSection('youtube');
      return false;
    }
  }

  renderBlogPosts(posts) {
    if (!this.blogContainer || posts.length === 0) return;
    
    this.blogContainer.innerHTML = '';
    
    posts.forEach(post => {
      const blogCard = document.createElement('article');
      blogCard.className = 'blog-card glass-card fade-in';
      blogCard.style.cssText = `
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        min-height: 300px;
        margin-bottom: 20px;
        padding: 20px;
        backdrop-filter: blur(20px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        visibility: visible !important;
        display: block !important;
        opacity: 1 !important;
        color: white;
      `;
      
      blogCard.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: white; font-size: 20px;">${post.title}</h3>
        <p style="margin: 0 0 15px 0; color: rgba(255,255,255,0.8);">${post.excerpt || post.description}</p>
        <div style="display: flex; gap: 15px; margin-bottom: 15px; font-size: 14px; color: rgba(255,255,255,0.7);">
          <span>${new Date(post.createdAt).toLocaleDateString()}</span>
          <span>${post.category}</span>
        </div>
        <a href="#" style="color: #6366f1; text-decoration: none;">Read More</a>
      `;
      
      this.blogContainer.appendChild(blogCard);
    });
  }

  renderYouTubeVideos(videos) {
    if (!this.youtubeContainer || videos.length === 0) return;
    
    this.youtubeContainer.innerHTML = '';
    
    videos.forEach(video => {
      const videoCard = document.createElement('div');
      videoCard.className = 'video-card glass-card fade-in';
      videoCard.setAttribute('data-video-url', video.embedUrl);
      videoCard.style.cssText = `
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 16px;
        min-height: 350px;
        margin-bottom: 20px;
        backdrop-filter: blur(20px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        visibility: visible !important;
        display: block !important;
        opacity: 1 !important;
        overflow: hidden;
      `;
      
      videoCard.innerHTML = `
        <div style="height: 200px; background: #dc2626; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; position: relative;">
          <img src="${video.thumbnail}" alt="${video.title}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <svg viewBox="0 0 24 24" fill="white" style="width: 24px; height: 24px; margin-left: 3px;">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          </div>
        </div>
        <div style="padding: 20px; color: white;">
          <h3 style="margin: 0 0 10px 0; color: white; font-size: 18px;">${video.title}</h3>
          <p style="margin: 0 0 15px 0; color: rgba(255,255,255,0.8); font-size: 14px;">${video.description || ''}</p>
          <div style="display: flex; gap: 15px; font-size: 12px; color: rgba(255,255,255,0.7);">
            <span>${video.metrics?.views || 0} views</span>
            <span>${new Date(video.publishedAt || video.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      `;
      
      this.youtubeContainer.appendChild(videoCard);
    });
  }

  showSection(sectionName) {
    const section = document.getElementById(sectionName);
    if (section) {
      section.style.display = 'block';
      console.log(`✅ Showing ${sectionName} section`);
    }
  }

  hideSection(sectionName) {
    const section = document.getElementById(sectionName);
    if (section) {
      section.style.display = 'none';
      console.log(`🙈 Hiding ${sectionName} section`);
    }
  }

  updateNavigation(hasProjects, hasBlog, hasYoutube) {
    console.log('🧭 Updating navigation:', { hasProjects, hasBlog, hasYoutube });
    
    // Find navigation links
    const projectsLink = document.querySelector('a[data-section="projects"]');
    const blogLink = document.querySelector('a[data-section="blog"]');
    const youtubeLink = document.querySelector('a[data-section="youtube"]');
    
    // Hide/show navigation links based on content availability
    if (projectsLink) {
      projectsLink.style.display = hasProjects ? 'block' : 'none';
    }
    if (blogLink) {
      blogLink.style.display = hasBlog ? 'block' : 'none';
    }
    if (youtubeLink) {
      youtubeLink.style.display = hasYoutube ? 'block' : 'none';
    }
  }
}

// ==============================================
// Performance Monitor
// ==============================================
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      loadTime: 0,
      renderTime: 0,
      interactionTime: 0
    };
    
    this.init();
  }
  
  init() {
    this.measureLoadTime();
    this.measureRenderTime();
    this.setupInteractionTracking();
  }
  
  measureLoadTime() {
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0];
      this.metrics.loadTime = perfData.loadEventEnd - perfData.loadEventStart;
      console.log(`Page load time: ${this.metrics.loadTime}ms`);
    });
  }
  
  measureRenderTime() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
          this.metrics.renderTime = entry.startTime;
          console.log(`First contentful paint: ${this.metrics.renderTime}ms`);
        }
      });
    });
    
    observer.observe({ entryTypes: ['paint'] });
  }
  
  setupInteractionTracking() {
    ['click', 'touchstart', 'keydown'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        if (this.metrics.interactionTime === 0) {
          this.metrics.interactionTime = performance.now();
          console.log(`First interaction: ${this.metrics.interactionTime}ms`);
        }
      }, { once: true });
    });
  }
  
  getMetrics() {
    return this.metrics;
  }
}

// ==============================================
// Application Initialization
// ==============================================
class Portfolio {
  constructor() {
    this.components = {};
    this.isInitialized = false;
    
    this.init();
  }
  
  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
    } else {
      this.initializeComponents();
    }
  }
  
  initializeComponents() {
    try {
      // Initialize core components
      this.components.navigation = new Navigation();
      this.components.scrollAnimations = new ScrollAnimations();
      this.components.contactForm = new ContactForm();
      this.components.contentManager = new ContentManager();
      this.components.performanceMonitor = new PerformanceMonitor();
      
      // Setup global event listeners
      this.setupGlobalEvents();
      
      // Mark as initialized
      this.isInitialized = true;
      
      console.log('Portfolio website initialized successfully');
      
    } catch (error) {
      console.error('Error initializing portfolio:', error);
      showNotification('Website initialization failed. Please refresh the page.', 'error');
    }
  }
  
  setupGlobalEvents() {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('Page hidden');
      } else {
        console.log('Page visible');
      }
    });
    
    // Handle online/offline status
    window.addEventListener('online', () => {
      showNotification('Connection restored', 'success');
    });
    
    window.addEventListener('offline', () => {
      showNotification('No internet connection', 'error');
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    });
    
    // Handle errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });
  }
  
  destroy() {
    // Cleanup components
    Object.values(this.components).forEach(component => {
      if (component && typeof component.destroy === 'function') {
        component.destroy();
      }
    });
    
    this.components = {};
    this.isInitialized = false;
  }
}

// ==============================================
// CSS for JavaScript-generated elements
// ==============================================
const dynamicStyles = `
  /* Notification Styles */
  .notification {
    position: fixed;
    top: 20px;
    right: 20px;
    max-width: 400px;
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    z-index: var(--z-tooltip);
    transform: translateX(100%);
    transition: transform var(--transition-medium);
  }
  
  .notification.show {
    transform: translateX(0);
  }
  
  .notification-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-4) var(--spacing-6);
  }
  
  .notification-message {
    color: var(--white);
    font-weight: 500;
  }
  
  .notification-close {
    background: none;
    border: none;
    color: var(--white);
    font-size: var(--text-xl);
    cursor: pointer;
    padding: 0;
    margin-left: var(--spacing-4);
    transition: opacity var(--transition-fast);
  }
  
  .notification-close:hover {
    opacity: 0.7;
  }
  
  .notification-success {
    border-left: 4px solid var(--accent-color);
  }
  
  .notification-error {
    border-left: 4px solid #ef4444;
  }
  
  .notification-info {
    border-left: 4px solid var(--primary-color);
  }
  
  /* Form Error Styles */
  .form-input.error,
  .form-textarea.error {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }
  
  .field-error {
    color: #ef4444;
    font-size: var(--text-sm);
    margin-top: var(--spacing-1);
  }
  
  /* Mobile Menu Active State */
  .hamburger.active .bar:nth-child(1) {
    transform: rotate(45deg) translate(5px, 5px);
  }
  
  .hamburger.active .bar:nth-child(2) {
    opacity: 0;
  }
  
  .hamburger.active .bar:nth-child(3) {
    transform: rotate(-45deg) translate(7px, -6px);
  }
  
  /* Scrolled Navbar */
  .navbar.scrolled {
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(20px);
  }
`;

// Inject dynamic styles
const styleSheet = document.createElement('style');
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);

// ==============================================
// Initialize Application
// ==============================================
window.portfolio = new Portfolio();