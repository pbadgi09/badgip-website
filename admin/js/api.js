/**
 * GitHub API Communication Module
 * Handles all communication with GitHub for data management
 */

class API {
    constructor() {
        this.githubRepo = 'pbadgi09/badgip-website'; // Replace with your GitHub repo
        this.githubToken = localStorage.getItem('github_token') || '';
        this.githubBaseURL = 'https://api.github.com';
        this.timeout = 30000; // 30 seconds
        this.init();
    }

    init() {
        // Load saved GitHub token from settings
        const savedToken = localStorage.getItem('github_token');
        if (savedToken) {
            this.githubToken = savedToken;
        }
    }

    // Generic GitHub API request method
    async githubRequest(endpoint, options = {}) {
        if (!this.githubToken) {
            throw new Error('GitHub token not configured. Please set your GitHub Personal Access Token in settings.');
        }

        const url = `${this.githubBaseURL}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Authorization': `token ${this.githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            timeout: this.timeout
        };

        const requestOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            console.log(`Making GitHub API request to: ${url}`);
            console.log('Request options:', requestOptions);
            
            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), this.timeout);
            });

            // Make the request
            const fetchPromise = fetch(url, requestOptions);
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            console.log(`GitHub API response status: ${response.status} ${response.statusText}`);

            // Handle response
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            console.error('GitHub API Request failed:', error);
            
            // Handle specific error types
            if (error.message === 'Request timeout') {
                throw new Error('Request timed out. Please check your connection and try again.');
            } else if (error.message.includes('Failed to fetch')) {
                throw new Error('Unable to connect to GitHub. Please check your internet connection.');
            } else if (error.message.includes('Bad credentials')) {
                throw new Error('Invalid GitHub token. Please check your Personal Access Token.');
            } else {
                throw error;
            }
        }
    }

    // Helper method to read file contents
    async getFileContent(filePath) {
        try {
            const response = await this.githubRequest(`/repos/${this.githubRepo}/contents/${filePath}`);
            return {
                content: JSON.parse(atob(response.content)),
                sha: response.sha
            };
        } catch (error) {
            if (error.message.includes('404')) {
                // File doesn't exist, return empty structure
                return { content: null, sha: null };
            }
            throw error;
        }
    }

    // Helper method to update file contents
    async updateFileContent(filePath, content, commitMessage, sha = null) {
        const body = {
            message: commitMessage,
            content: btoa(JSON.stringify(content, null, 2)),
            branch: 'main'
        };

        if (sha) {
            body.sha = sha;
        }

        return await this.githubRequest(`/repos/${this.githubRepo}/contents/${filePath}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    // PROJECTS API METHODS (GitHub-based)
    async getProjects(params = {}) {
        try {
            const { content } = await this.getFileContent('data/projects.json');
            const projects = content?.projects || [];
            
            // Apply client-side filtering/pagination if needed
            let filteredProjects = projects;
            
            if (params.category) {
                filteredProjects = projects.filter(p => p.category === params.category);
            }
            
            if (params.featured) {
                filteredProjects = projects.filter(p => p.featured);
            }
            
            // Simple pagination
            const limit = parseInt(params.limit) || 10;
            const page = parseInt(params.page) || 1;
            const start = (page - 1) * limit;
            const end = start + limit;
            
            return {
                success: true,
                data: {
                    projects: filteredProjects.slice(start, end),
                    pagination: {
                        totalItems: filteredProjects.length,
                        totalPages: Math.ceil(filteredProjects.length / limit),
                        currentPage: page,
                        limit: limit
                    }
                }
            };
        } catch (error) {
            console.error('Error getting projects:', error);
            throw error;
        }
    }

    async getProject(slug) {
        try {
            const { content } = await this.getFileContent('data/projects.json');
            const projects = content?.projects || [];
            const project = projects.find(p => p.seo?.slug === slug || p._id === slug);
            
            if (!project) {
                throw new Error('Project not found');
            }
            
            return {
                success: true,
                data: { project }
            };
        } catch (error) {
            console.error('Error getting project:', error);
            throw error;
        }
    }

    async createProject(projectData) {
        try {
            const { content, sha } = await this.getFileContent('data/projects.json');
            const projects = content?.projects || [];
            
            // Generate new ID
            const newProject = {
                ...projectData,
                _id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            projects.push(newProject);
            
            await this.updateFileContent('data/projects.json', { projects }, `Add new project: ${projectData.title}`, sha);
            
            return {
                success: true,
                data: { project: newProject }
            };
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    }

    async updateProject(slug, projectData) {
        try {
            const { content, sha } = await this.getFileContent('data/projects.json');
            const projects = content?.projects || [];
            const index = projects.findIndex(p => p.seo?.slug === slug || p._id === slug);
            
            if (index === -1) {
                throw new Error('Project not found');
            }
            
            projects[index] = {
                ...projects[index],
                ...projectData,
                updatedAt: new Date().toISOString()
            };
            
            await this.updateFileContent('data/projects.json', { projects }, `Update project: ${projectData.title || projects[index].title}`, sha);
            
            return {
                success: true,
                data: { project: projects[index] }
            };
        } catch (error) {
            console.error('Error updating project:', error);
            throw error;
        }
    }

    async deleteProject(slug) {
        try {
            const { content, sha } = await this.getFileContent('data/projects.json');
            const projects = content?.projects || [];
            const index = projects.findIndex(p => p.seo?.slug === slug || p._id === slug);
            
            if (index === -1) {
                throw new Error('Project not found');
            }
            
            const deletedProject = projects[index];
            projects.splice(index, 1);
            
            await this.updateFileContent('data/projects.json', { projects }, `Delete project: ${deletedProject.title}`, sha);
            
            return {
                success: true,
                data: { message: 'Project deleted successfully' }
            };
        } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    }

    async getFeaturedProjects(limit = 6) {
        return await this.getProjects({ featured: true, limit });
    }

    async getProjectCategories() {
        try {
            const { content } = await this.getFileContent('data/projects.json');
            const projects = content?.projects || [];
            const categories = [...new Set(projects.map(p => p.category))];
            return {
                success: true,
                data: { categories }
            };
        } catch (error) {
            console.error('Error getting project categories:', error);
            throw error;
        }
    }

    async getProjectTechnologies() {
        try {
            const { content } = await this.getFileContent('data/projects.json');
            const projects = content?.projects || [];
            const technologies = [...new Set(projects.flatMap(p => p.technologies || []))];
            return {
                success: true,
                data: { technologies }
            };
        } catch (error) {
            console.error('Error getting project technologies:', error);
            throw error;
        }
    }

    // BLOG API METHODS (GitHub-based)
    async getBlogPosts(params = {}) {
        try {
            const { content } = await this.getFileContent('data/blog.json');
            const posts = content?.posts || [];
            
            // Apply client-side filtering
            let filteredPosts = posts;
            
            if (params.category) {
                filteredPosts = posts.filter(p => p.category === params.category);
            }
            
            if (params.featured) {
                filteredPosts = posts.filter(p => p.featured);
            }
            
            if (params.status) {
                filteredPosts = posts.filter(p => p.status === params.status);
            }
            
            // Simple pagination
            const limit = parseInt(params.limit) || 10;
            const page = parseInt(params.page) || 1;
            const start = (page - 1) * limit;
            const end = start + limit;
            
            return {
                success: true,
                data: {
                    posts: filteredPosts.slice(start, end),
                    pagination: {
                        totalItems: filteredPosts.length,
                        totalPages: Math.ceil(filteredPosts.length / limit),
                        currentPage: page,
                        limit: limit
                    }
                }
            };
        } catch (error) {
            console.error('Error getting blog posts:', error);
            throw error;
        }
    }

    async getBlogPost(slug) {
        try {
            const { content } = await this.getFileContent('data/blog.json');
            const posts = content?.posts || [];
            const post = posts.find(p => p.seo?.slug === slug || p._id === slug);
            
            if (!post) {
                throw new Error('Blog post not found');
            }
            
            return {
                success: true,
                data: { post }
            };
        } catch (error) {
            console.error('Error getting blog post:', error);
            throw error;
        }
    }

    async createBlogPost(postData) {
        try {
            const { content, sha } = await this.getFileContent('data/blog.json');
            const posts = content?.posts || [];
            
            // Generate new ID
            const newPost = {
                ...postData,
                _id: Date.now().toString(),
                publishedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            posts.push(newPost);
            
            await this.updateFileContent('data/blog.json', { posts }, `Add new blog post: ${postData.title}`, sha);
            
            return {
                success: true,
                data: { post: newPost }
            };
        } catch (error) {
            console.error('Error creating blog post:', error);
            throw error;
        }
    }

    async updateBlogPost(slug, postData) {
        try {
            const { content, sha } = await this.getFileContent('data/blog.json');
            const posts = content?.posts || [];
            const index = posts.findIndex(p => p.seo?.slug === slug || p._id === slug);
            
            if (index === -1) {
                throw new Error('Blog post not found');
            }
            
            posts[index] = {
                ...posts[index],
                ...postData,
                updatedAt: new Date().toISOString()
            };
            
            await this.updateFileContent('data/blog.json', { posts }, `Update blog post: ${postData.title || posts[index].title}`, sha);
            
            return {
                success: true,
                data: { post: posts[index] }
            };
        } catch (error) {
            console.error('Error updating blog post:', error);
            throw error;
        }
    }

    async deleteBlogPost(slug) {
        try {
            const { content, sha } = await this.getFileContent('data/blog.json');
            const posts = content?.posts || [];
            const index = posts.findIndex(p => p.seo?.slug === slug || p._id === slug);
            
            if (index === -1) {
                throw new Error('Blog post not found');
            }
            
            const deletedPost = posts[index];
            posts.splice(index, 1);
            
            await this.updateFileContent('data/blog.json', { posts }, `Delete blog post: ${deletedPost.title}`, sha);
            
            return {
                success: true,
                data: { message: 'Blog post deleted successfully' }
            };
        } catch (error) {
            console.error('Error deleting blog post:', error);
            throw error;
        }
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

    // YOUTUBE API METHODS (GitHub-based)
    async getYouTubeVideos(params = {}) {
        try {
            const { content } = await this.getFileContent('data/youtube.json');
            const videos = content?.videos || [];
            
            // Apply client-side filtering
            let filteredVideos = videos;
            
            if (params.category) {
                filteredVideos = videos.filter(v => v.category === params.category);
            }
            
            if (params.featured) {
                filteredVideos = videos.filter(v => v.featured);
            }
            
            if (params.isActive !== undefined) {
                filteredVideos = videos.filter(v => v.isActive === params.isActive);
            }
            
            // Simple pagination
            const limit = parseInt(params.limit) || 10;
            const page = parseInt(params.page) || 1;
            const start = (page - 1) * limit;
            const end = start + limit;
            
            return {
                success: true,
                data: {
                    videos: filteredVideos.slice(start, end),
                    pagination: {
                        totalItems: filteredVideos.length,
                        totalPages: Math.ceil(filteredVideos.length / limit),
                        currentPage: page,
                        limit: limit
                    }
                }
            };
        } catch (error) {
            console.error('Error getting YouTube videos:', error);
            throw error;
        }
    }

    async getYouTubeVideo(id) {
        try {
            const { content } = await this.getFileContent('data/youtube.json');
            const videos = content?.videos || [];
            const video = videos.find(v => v._id === id || v.videoId === id);
            
            if (!video) {
                throw new Error('YouTube video not found');
            }
            
            return {
                success: true,
                data: { video }
            };
        } catch (error) {
            console.error('Error getting YouTube video:', error);
            throw error;
        }
    }

    async createYouTubeVideo(videoData) {
        try {
            const { content, sha } = await this.getFileContent('data/youtube.json');
            const videos = content?.videos || [];
            
            // Generate new ID
            const newVideo = {
                ...videoData,
                _id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            videos.push(newVideo);
            
            await this.updateFileContent('data/youtube.json', { videos }, `Add new YouTube video: ${videoData.title}`, sha);
            
            return {
                success: true,
                data: { video: newVideo }
            };
        } catch (error) {
            console.error('Error creating YouTube video:', error);
            throw error;
        }
    }

    async updateYouTubeVideo(id, videoData) {
        try {
            const { content, sha } = await this.getFileContent('data/youtube.json');
            const videos = content?.videos || [];
            const index = videos.findIndex(v => v._id === id || v.videoId === id);
            
            if (index === -1) {
                throw new Error('YouTube video not found');
            }
            
            videos[index] = {
                ...videos[index],
                ...videoData,
                updatedAt: new Date().toISOString()
            };
            
            await this.updateFileContent('data/youtube.json', { videos }, `Update YouTube video: ${videoData.title || videos[index].title}`, sha);
            
            return {
                success: true,
                data: { video: videos[index] }
            };
        } catch (error) {
            console.error('Error updating YouTube video:', error);
            throw error;
        }
    }

    async deleteYouTubeVideo(id) {
        try {
            const { content, sha } = await this.getFileContent('data/youtube.json');
            const videos = content?.videos || [];
            const index = videos.findIndex(v => v._id === id || v.videoId === id);
            
            if (index === -1) {
                throw new Error('YouTube video not found');
            }
            
            const deletedVideo = videos[index];
            videos.splice(index, 1);
            
            await this.updateFileContent('data/youtube.json', { videos }, `Delete YouTube video: ${deletedVideo.title}`, sha);
            
            return {
                success: true,
                data: { message: 'YouTube video deleted successfully' }
            };
        } catch (error) {
            console.error('Error deleting YouTube video:', error);
            throw error;
        }
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

    // IMAGE MANAGEMENT API METHODS (GitHub-based)
    async uploadImages(formData) {
        // For GitHub-based system, we'll handle image uploads differently
        // Images can be uploaded to GitHub or use external services like Cloudinary
        console.warn('Image upload needs to be implemented for GitHub-based system');
        throw new Error('Image upload not yet implemented for GitHub-based system. Use external image hosting or upload manually to GitHub.');
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
            // Test GitHub API connection
            const response = await this.githubRequest(`/repos/${this.githubRepo}`);
            return { 
                success: true, 
                data: {
                    repo: response.name,
                    owner: response.owner.login,
                    private: response.private,
                    message: `Connected to ${response.full_name}`
                }
            };
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
    setGitHubToken(token) {
        this.githubToken = token;
        localStorage.setItem('github_token', token);
    }

    getGitHubToken() {
        return this.githubToken;
    }

    setGitHubRepo(repo) {
        this.githubRepo = repo;
        localStorage.setItem('github_repo', repo);
    }

    getGitHubRepo() {
        return this.githubRepo;
    }

    // Legacy methods for compatibility
    setBaseURL(url) {
        // For GitHub-based system, this could set the repo
        console.warn('setBaseURL is deprecated. Use setGitHubRepo instead.');
    }

    getBaseURL() {
        // Return the data URL for compatibility
        return '/data';
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

    // Settings API methods
    async getSettings() {
        try {
            const { content } = await this.getFileContent('data/settings.json');
            return {
                success: true,
                data: content
            };
        } catch (error) {
            console.error('Error fetching settings:', error);
            throw error;
        }
    }

    async updateSettings(settingsData) {
        try {
            const { content, sha } = await this.getFileContent('data/settings.json');
            
            // Merge new settings with existing ones
            const updatedSettings = {
                ...content,
                ...settingsData,
                meta: {
                    ...content.meta,
                    lastUpdated: new Date().toISOString(),
                    updatedBy: 'admin'
                }
            };
            
            await this.updateFileContent('data/settings.json', updatedSettings, 'Update website settings', sha);
            
            return {
                success: true,
                data: updatedSettings
            };
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    }

    async updateSettingsSection(section, sectionData) {
        try {
            const { content, sha } = await this.getFileContent('data/settings.json');
            
            // Update specific section
            const updatedSettings = {
                ...content,
                [section]: {
                    ...content[section],
                    ...sectionData
                },
                meta: {
                    ...content.meta,
                    lastUpdated: new Date().toISOString(),
                    updatedBy: 'admin'
                }
            };
            
            await this.updateFileContent('data/settings.json', updatedSettings, `Update ${section} settings`, sha);
            
            return {
                success: true,
                data: updatedSettings
            };
        } catch (error) {
            console.error('Error updating settings section:', error);
            throw error;
        }
    }
}

// Initialize API
const api = new API();

// Export for global access
window.api = api;