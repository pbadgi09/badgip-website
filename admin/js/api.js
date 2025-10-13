/**
 * API Communication Module
 * Handles all communication with the backend API
 */

class API {
    constructor() {
        this.baseURL = 'https://badgip-website-production.up.railway.app/api';
        this.timeout = 30000; // 30 seconds
        this.init();
    }

    init() {
        // Load saved API URL from settings
        const savedURL = localStorage.getItem('api_url');
        if (savedURL) {
            this.baseURL = savedURL;
        }
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Admin-Key': 'admin123' // Admin authentication key
            },
            timeout: this.timeout
        };

        // Add CSRF token for non-GET requests
        if (options.method && options.method !== 'GET') {
            defaultOptions.headers['X-CSRF-Token'] = window.auth?.getCSRFToken();
        }

        const requestOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), this.timeout);
            });

            // Make the request
            const fetchPromise = fetch(url, requestOptions);
            const response = await Promise.race([fetchPromise, timeoutPromise]);

            // Handle response
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }

        } catch (error) {
            console.error('API Request failed:', error);
            
            // Handle specific error types
            if (error.message === 'Request timeout') {
                throw new Error('Request timed out. Please check your connection and try again.');
            } else if (error.message.includes('Failed to fetch')) {
                throw new Error('Unable to connect to the server. Please check your internet connection.');
            } else {
                throw error;
            }
        }
    }

    // GET request
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return await this.request(url, {
            method: 'GET'
        });
    }

    // POST request
    async post(endpoint, data = {}) {
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data = {}) {
        return await this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return await this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // File upload request
    async upload(endpoint, formData) {
        return await this.request(endpoint, {
            method: 'POST',
            body: formData,
            headers: {} // Let browser set content-type for FormData
        });
    }

    // PROJECTS API METHODS
    async getProjects(params = {}) {
        return await this.get('/projects', params);
    }

    async getProject(slug) {
        return await this.get(`/projects/${slug}`);
    }

    async createProject(projectData) {
        return await this.post('/projects', projectData);
    }

    async updateProject(slug, projectData) {
        return await this.put(`/projects/${slug}`, projectData);
    }

    async deleteProject(slug) {
        return await this.delete(`/projects/${slug}`);
    }

    async getFeaturedProjects(limit = 6) {
        return await this.get('/projects/featured', { limit });
    }

    async getProjectCategories() {
        return await this.get('/projects/categories');
    }

    async getProjectTechnologies() {
        return await this.get('/projects/technologies');
    }

    // BLOG API METHODS
    async getBlogPosts(params = {}) {
        return await this.get('/blog', params);
    }

    async getBlogPost(slug) {
        return await this.get(`/blog/${slug}`);
    }

    async createBlogPost(postData) {
        return await this.post('/blog', postData);
    }

    async updateBlogPost(slug, postData) {
        return await this.put(`/blog/${slug}`, postData);
    }

    async deleteBlogPost(slug) {
        return await this.delete(`/blog/${slug}`);
    }

    async getFeaturedPosts(limit = 3) {
        return await this.get('/blog/featured', { limit });
    }

    async getBlogCategories() {
        return await this.get('/blog/categories');
    }

    async getBlogTags() {
        return await this.get('/blog/tags');
    }

    // YOUTUBE API METHODS
    async getYouTubeVideos(params = {}) {
        return await this.get('/youtube', params);
    }

    async getYouTubeVideo(id) {
        return await this.get(`/youtube/${id}`);
    }

    async createYouTubeVideo(videoData) {
        return await this.post('/youtube', videoData);
    }

    async updateYouTubeVideo(id, videoData) {
        return await this.put(`/youtube/${id}`, videoData);
    }

    async deleteYouTubeVideo(id) {
        return await this.delete(`/youtube/${id}`);
    }

    // CONTACT API METHODS
    async sendContactMessage(messageData) {
        return await this.post('/contact', messageData);
    }

    // UPLOAD API METHODS
    async uploadFile(file, folder = 'general') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);
        
        return await this.upload('/upload', formData);
    }

    async uploadMultipleFiles(files, folder = 'general') {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        formData.append('folder', folder);
        
        return await this.upload('/upload/multiple', formData);
    }

    // IMAGE MANAGEMENT API METHODS
    async uploadImages(formData) {
        return await this.upload('/images/upload', formData);
    }

    async getImages(params = {}) {
        return await this.get('/images', params);
    }

    async getImage(imageId) {
        return await this.get(`/images/${imageId}`);
    }

    async updateImage(imageId, imageData) {
        return await this.put(`/images/${imageId}`, imageData);
    }

    async deleteImage(imageId) {
        return await this.delete(`/images/${imageId}`);
    }

    async getImageStats() {
        return await this.get('/images/stats');
    }

    // IMAGE ASSOCIATION API METHODS
    async associateImage(imageId, contentType, contentId, role = 'gallery', displayOrder = 0, caption = '') {
        return await this.post('/image-associations', {
            imageId,
            contentType,
            contentId,
            role,
            displayOrder,
            caption
        });
    }

    async getContentImages(contentType, contentId, role = null) {
        const endpoint = `/image-associations/content/${contentType}/${contentId}`;
        const params = role ? { role } : {};
        return await this.get(endpoint, params);
    }

    async getFeaturedImage(contentType, contentId) {
        return await this.get(`/image-associations/featured/${contentType}/${contentId}`);
    }

    async updateImageAssociation(imageId, contentType, contentId, updateData) {
        return await this.put(`/image-associations/${imageId}/${contentType}/${contentId}`, updateData);
    }

    async removeImageAssociation(imageId, contentType, contentId) {
        return await this.delete(`/image-associations/${imageId}/${contentType}/${contentId}`);
    }

    async bulkAssociateImages(associations) {
        return await this.post('/image-associations/bulk', { associations });
    }

    async reorderContentImages(contentType, contentId, imageOrders) {
        return await this.put(`/image-associations/reorder/${contentType}/${contentId}`, { imageOrders });
    }

    // UTILITY METHODS
    async testConnection() {
        try {
            const response = await this.get('/health');
            return { success: true, data: response };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // YouTube external API methods
    async fetchYouTubeVideoData(videoUrl) {
        try {
            // Extract video ID from URL
            const videoId = this.extractYouTubeVideoId(videoUrl);
            if (!videoId) {
                throw new Error('Invalid YouTube URL');
            }

            // Use YouTube oEmbed API to get video data
            const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
            
            const response = await fetch(oEmbedUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch video data');
            }

            const data = await response.json();
            
            return {
                success: true,
                data: {
                    videoId: videoId,
                    title: data.title,
                    author: data.author_name,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                    thumbnailMedium: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    embedUrl: `https://www.youtube.com/embed/${videoId}`
                }
            };
        } catch (error) {
            console.error('Error fetching YouTube video data:', error);
            return { success: false, error: error.message };
        }
    }

    extractYouTubeVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return null;
    }

    // Error handling utility
    handleError(error, context = '') {
        console.error(`API Error ${context}:`, error);
        
        let userMessage = 'An unexpected error occurred.';
        
        if (error.message.includes('timeout')) {
            userMessage = 'Request timed out. Please try again.';
        } else if (error.message.includes('Failed to fetch')) {
            userMessage = 'Unable to connect to the server. Please check your connection.';
        } else if (error.message.includes('404')) {
            userMessage = 'The requested resource was not found.';
        } else if (error.message.includes('500')) {
            userMessage = 'Server error. Please try again later.';
        } else if (error.message) {
            userMessage = error.message;
        }

        if (window.auth) {
            window.auth.showToast(userMessage, 'error');
        }

        return userMessage;
    }

    // Settings methods
    setBaseURL(url) {
        this.baseURL = url.replace(/\/$/, ''); // Remove trailing slash
        localStorage.setItem('api_url', this.baseURL);
    }

    getBaseURL() {
        return this.baseURL;
    }

    // Statistics methods
    async getStats() {
        try {
            const [projects, blog, youtube] = await Promise.all([
                this.getProjects({ limit: 1 }),
                this.getBlogPosts({ limit: 1 }),
                this.getYouTubeVideos({ limit: 1 })
            ]);

            return {
                projects: projects.data?.pagination?.totalItems || 0,
                blog: blog.data?.pagination?.totalItems || 0,
                youtube: youtube.data?.pagination?.totalItems || 0,
                totalViews: 0 // Calculate from projects and blog
            };
        } catch (error) {
            console.error('Error fetching stats:', error);
            return {
                projects: 0,
                blog: 0,
                youtube: 0,
                totalViews: 0
            };
        }
    }
}

// Initialize API
const api = new API();

// Export for global access
window.api = api;