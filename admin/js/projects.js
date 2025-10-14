/**
 * Projects Management Module
 * Handles CRUD operations for portfolio projects
 */

class ProjectsManager {
    constructor() {
        this.projects = [];
        this.currentProject = null;
        this.searchTerm = '';
        this.categoryFilter = '';
        this.isLoading = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.createProjectModal();
    }

    bindEvents() {
        // Add project button
        const addBtn = document.getElementById('addProjectBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showProjectModal());
        }

        // Search and filter
        const searchInput = document.getElementById('projectSearch');
        const filterSelect = document.getElementById('projectFilter');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterProjects();
            });
        }

        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.categoryFilter = e.target.value;
                this.filterProjects();
            });
        }
    }

    async loadProjects() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            this.showLoading(true);

            const response = await window.api.getProjects({ limit: 50 });
            this.projects = response.data?.projects || [];
            
            this.renderProjects();
        } catch (error) {
            console.error('ProjectsManager: Error loading projects:', error);
            window.api.handleError(error, 'loading projects');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    renderProjects() {
        const container = document.getElementById('projectsList');
        if (!container) return;

        if (this.projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-code fa-3x"></i>
                    <h3>No Projects Found</h3>
                    <p>Start by adding your first project to showcase your work.</p>
                    <button class="btn btn-primary" onclick="projectsManager.showProjectModal()">
                        <i class="fas fa-plus"></i> Add First Project
                    </button>
                </div>
            `;
            return;
        }

        const filteredProjects = this.getFilteredProjects();
        
        container.innerHTML = filteredProjects.map(project => `
            <div class="content-item" data-project-id="${project._id}">
                <div class="item-info">
                    <div class="item-title">
                        ${project.title}
                        ${project.featured ? '<span class="badge badge-primary">Featured</span>' : ''}
                        <span class="badge badge-${this.getStatusColor(project.status)}">${project.status}</span>
                    </div>
                    <div class="item-description">${project.description}</div>
                    <div class="item-meta">
                        <span><i class="fas fa-tag"></i> ${project.category}</span>
                        <span><i class="fas fa-eye"></i> ${project.metrics?.views || 0} views</span>
                        <span><i class="fas fa-heart"></i> ${project.metrics?.likes || 0} likes</span>
                        <span><i class="fas fa-calendar"></i> ${window.adminDashboard.formatDate(project.createdAt)}</span>
                    </div>
                    <div class="item-technologies">
                        ${project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-sm btn-outline" onclick="projectsManager.viewProject('${project.seo?.slug || project._id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="projectsManager.editProject('${project.seo?.slug || project._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="projectsManager.deleteProject('${project.seo?.slug || project._id}', '${project.title}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    getFilteredProjects() {
        return this.projects.filter(project => {
            const matchesSearch = !this.searchTerm || 
                project.title.toLowerCase().includes(this.searchTerm) ||
                project.description.toLowerCase().includes(this.searchTerm) ||
                project.technologies.some(tech => tech.toLowerCase().includes(this.searchTerm));
            
            const matchesCategory = !this.categoryFilter || project.category === this.categoryFilter;
            
            return matchesSearch && matchesCategory;
        });
    }

    filterProjects() {
        this.renderProjects();
    }

    showProjectModal(project = null) {
        this.currentProject = project;
        const modalId = 'projectModal';
        
        // Create or update modal
        this.updateProjectModal(project);
        
        // Show modal
        window.showModal(modalId);
    }

    createProjectModal() {
        const modalContainer = document.getElementById('modalContainer');
        if (!modalContainer) return;

        const modalHTML = `
            <div id="projectModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title" id="projectModalTitle">Add New Project</h3>
                        <button class="modal-close" onclick="window.hideModal('projectModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="projectForm">
                            <div class="form-grid form-grid-2">
                                <div class="form-group">
                                    <label for="projectTitle" class="required">Project Title</label>
                                    <input type="text" id="projectTitle" class="form-input" required maxlength="100">
                                    <div class="field-error" id="projectTitleError"></div>
                                </div>
                                <div class="form-group">
                                    <label for="projectCategory" class="required">Category</label>
                                    <select id="projectCategory" class="form-select" required>
                                        <option value="">Select Category</option>
                                        <option value="web">Web Development</option>
                                        <option value="mobile">Mobile App</option>
                                        <option value="desktop">Desktop Application</option>
                                        <option value="api">API/Backend</option>
                                        <option value="other">Other</option>
                                    </select>
                                    <div class="field-error" id="projectCategoryError"></div>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="projectDescription" class="required">Short Description</label>
                                <textarea id="projectDescription" class="form-textarea" required maxlength="500" 
                                    placeholder="Brief description of your project (max 500 characters)"></textarea>
                                <div class="field-help">This will be shown in project listings</div>
                                <div class="field-error" id="projectDescriptionError"></div>
                            </div>
                            
                            <div class="form-group">
                                <label for="projectLongDescription">Detailed Description</label>
                                <textarea id="projectLongDescription" class="form-textarea" maxlength="2000" 
                                    placeholder="Detailed description of your project, features, challenges, etc."></textarea>
                                <div class="field-help">Optional detailed description for the project page</div>
                            </div>
                            
                            <div class="form-grid form-grid-2">
                                <div class="form-group">
                                    <label for="projectStatus" class="required">Status</label>
                                    <select id="projectStatus" class="form-select" required>
                                        <option value="completed">Completed</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="planned">Planned</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="projectFeatured">
                                        <input type="checkbox" id="projectFeatured"> Featured Project
                                    </label>
                                    <div class="field-help">Featured projects appear prominently on your portfolio</div>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="projectTechnologies" class="required">Technologies Used</label>
                                <div class="tag-input-wrapper" id="technologiesWrapper">
                                    <input type="text" class="tag-input" id="projectTechInput" 
                                        placeholder="Type technology and press Enter">
                                </div>
                                <div class="field-help">Add technologies like React, Node.js, Python, etc.</div>
                                <div class="field-error" id="projectTechnologiesError"></div>
                            </div>
                            
                            <div class="form-grid form-grid-2">
                                <div class="form-group">
                                    <label for="projectLiveUrl">Live URL</label>
                                    <input type="url" id="projectLiveUrl" class="form-input" 
                                        placeholder="https://your-project.com">
                                    <div class="field-help">Link to the live/deployed project</div>
                                </div>
                                <div class="form-group">
                                    <label for="projectGithubUrl">GitHub URL</label>
                                    <input type="url" id="projectGithubUrl" class="form-input" 
                                        placeholder="https://github.com/username/project">
                                    <div class="field-help">Link to the GitHub repository</div>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="projectDemoUrl">Demo URL</label>
                                <input type="url" id="projectDemoUrl" class="form-input" 
                                    placeholder="https://demo.your-project.com">
                                <div class="field-help">Link to a demo or preview (optional)</div>
                            </div>
                            
                            <div class="form-group">
                                <label for="projectImages">Project Images</label>
                                <div class="file-input-wrapper">
                                    <input type="file" id="projectImages" multiple accept="image/*">
                                    <div class="file-input-display">
                                        <i class="fas fa-cloud-upload-alt"></i>
                                        <div>Drop images here or click to upload</div>
                                        <div class="field-help">Upload screenshots, mockups, or demo images</div>
                                    </div>
                                </div>
                                <div class="image-preview" id="projectImagePreview"></div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="window.hideModal('projectModal')">
                            Cancel
                        </button>
                        <button type="submit" form="projectForm" class="btn btn-primary" id="projectSubmitBtn">
                            <i class="fas fa-save"></i> Save Project
                        </button>
                    </div>
                </div>
            </div>
        `;

        modalContainer.insertAdjacentHTML('beforeend', modalHTML);
        this.bindProjectFormEvents();
    }

    updateProjectModal(project) {
        const title = document.getElementById('projectModalTitle');
        const submitBtn = document.getElementById('projectSubmitBtn');
        
        if (project) {
            title.textContent = 'Edit Project';
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Project';
            this.populateProjectForm(project);
        } else {
            title.textContent = 'Add New Project';
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Project';
            this.resetProjectForm();
        }
    }

    bindProjectFormEvents() {
        const form = document.getElementById('projectForm');
        const techInput = document.getElementById('projectTechInput');
        const imagesInput = document.getElementById('projectImages');

        // Form submission
        form.addEventListener('submit', (e) => this.handleProjectSubmit(e));

        // Technology tags
        this.setupTechnologyInput(techInput);

        // Image upload
        if (imagesInput) {
            imagesInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Auto-save removed for simplicity
    }

    setupTechnologyInput(input) {
        const wrapper = document.getElementById('technologiesWrapper');
        this.technologies = [];

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const tech = input.value.trim();
                if (tech && !this.technologies.includes(tech)) {
                    this.addTechnology(tech);
                    input.value = '';
                }
            }
        });

        input.addEventListener('blur', () => {
            const tech = input.value.trim();
            if (tech && !this.technologies.includes(tech)) {
                this.addTechnology(tech);
                input.value = '';
            }
        });
    }

    addTechnology(tech) {
        this.technologies.push(tech);
        this.renderTechnologies();
    }

    removeTechnology(tech) {
        this.technologies = this.technologies.filter(t => t !== tech);
        this.renderTechnologies();
    }

    renderTechnologies() {
        const wrapper = document.getElementById('technologiesWrapper');
        const input = document.getElementById('projectTechInput');
        
        // Remove existing tags
        const existingTags = wrapper.querySelectorAll('.tag');
        existingTags.forEach(tag => tag.remove());

        // Add tags before input
        this.technologies.forEach(tech => {
            const tag = document.createElement('div');
            tag.className = 'tag';
            tag.innerHTML = `
                ${tech}
                <button type="button" class="tag-remove" onclick="projectsManager.removeTechnology('${tech}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            wrapper.insertBefore(tag, input);
        });
    }

    async handleImageUpload(e) {
        const files = Array.from(e.target.files);
        const preview = document.getElementById('projectImagePreview');
        
        preview.innerHTML = '';
        
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const previewItem = document.createElement('div');
                previewItem.className = 'image-preview-item';
                
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.alt = file.name;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'image-preview-remove';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.onclick = () => previewItem.remove();
                
                previewItem.appendChild(img);
                previewItem.appendChild(removeBtn);
                preview.appendChild(previewItem);
            }
        }
    }

    async handleProjectSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('projectSubmitBtn');
        const originalText = submitBtn.innerHTML;
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            // Validate form
            if (!this.validateProjectForm()) {
                return;
            }
            
            // Collect form data
            const formData = this.collectProjectFormData();
            
            // Submit to API
            let response;
            if (this.currentProject) {
                response = await window.api.updateProject(this.currentProject.seo?.slug || this.currentProject._id, formData);
                window.auth.showToast('Project updated successfully!', 'success');
            } else {
                response = await window.api.createProject(formData);
                window.auth.showToast('Project created successfully!', 'success');
            }
            
            // Close modal and refresh list
            window.hideModal('projectModal');
            await this.loadProjects();
            
        } catch (error) {
            console.error('Error saving project:', error);
            window.api.handleError(error, 'saving project');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    validateProjectForm() {
        let isValid = true;
        const errors = {};

        // Title validation
        const title = document.getElementById('projectTitle').value.trim();
        if (!title) {
            errors.projectTitle = 'Project title is required';
            isValid = false;
        } else if (title.length > 100) {
            errors.projectTitle = 'Title must be less than 100 characters';
            isValid = false;
        }

        // Category validation
        const category = document.getElementById('projectCategory').value;
        if (!category) {
            errors.projectCategory = 'Category is required';
            isValid = false;
        }

        // Description validation
        const description = document.getElementById('projectDescription').value.trim();
        if (!description) {
            errors.projectDescription = 'Description is required';
            isValid = false;
        } else if (description.length > 500) {
            errors.projectDescription = 'Description must be less than 500 characters';
            isValid = false;
        }

        // Technologies validation
        if (this.technologies.length === 0) {
            errors.projectTechnologies = 'At least one technology is required';
            isValid = false;
        }

        // Display errors
        this.displayFormErrors(errors);
        
        return isValid;
    }

    displayFormErrors(errors) {
        // Clear existing errors
        document.querySelectorAll('.field-error').forEach(el => {
            el.textContent = '';
            el.previousElementSibling.classList.remove('error');
        });

        // Display new errors
        Object.entries(errors).forEach(([field, message]) => {
            const errorEl = document.getElementById(`${field}Error`);
            const inputEl = document.getElementById(field);
            
            if (errorEl && inputEl) {
                errorEl.textContent = message;
                errorEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
                inputEl.classList.add('error');
            }
        });
    }

    collectProjectFormData() {
        const title = document.getElementById('projectTitle').value.trim();
        const slug = this.generateSlug(title);
        
        return {
            title: title,
            description: document.getElementById('projectDescription').value.trim(),
            longDescription: document.getElementById('projectLongDescription').value.trim(),
            category: document.getElementById('projectCategory').value,
            status: document.getElementById('projectStatus').value,
            featured: document.getElementById('projectFeatured').checked,
            technologies: this.technologies,
            links: {
                live: document.getElementById('projectLiveUrl').value.trim(),
                github: document.getElementById('projectGithubUrl').value.trim(),
                demo: document.getElementById('projectDemoUrl').value.trim()
            },
            seo: {
                slug: slug
            }
            // Note: Image upload will be handled separately
        };
    }

    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    populateProjectForm(project) {
        document.getElementById('projectTitle').value = project.title || '';
        document.getElementById('projectDescription').value = project.description || '';
        document.getElementById('projectLongDescription').value = project.longDescription || '';
        document.getElementById('projectCategory').value = project.category || '';
        document.getElementById('projectStatus').value = project.status || 'completed';
        document.getElementById('projectFeatured').checked = project.featured || false;
        document.getElementById('projectLiveUrl').value = project.links?.live || '';
        document.getElementById('projectGithubUrl').value = project.links?.github || '';
        document.getElementById('projectDemoUrl').value = project.links?.demo || '';
        
        // Set technologies
        this.technologies = project.technologies || [];
        this.renderTechnologies();
    }

    resetProjectForm() {
        document.getElementById('projectForm').reset();
        this.technologies = [];
        this.renderTechnologies();
        document.getElementById('projectImagePreview').innerHTML = '';
        
        // Clear errors
        this.displayFormErrors({});
    }

    async editProject(slug) {
        try {
            const response = await window.api.getProject(slug);
            const project = response.data?.project;
            
            if (project) {
                this.showProjectModal(project);
            } else {
                window.auth.showToast('Project not found', 'error');
            }
        } catch (error) {
            console.error('Error loading project for edit:', error);
            window.api.handleError(error, 'loading project');
        }
    }

    async deleteProject(slug, title) {
        if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await window.api.deleteProject(slug);
            window.auth.showToast('Project deleted successfully', 'success');
            await this.loadProjects();
        } catch (error) {
            console.error('Error deleting project:', error);
            window.api.handleError(error, 'deleting project');
        }
    }

    viewProject(slug) {
        const baseUrl = window.api.getBaseURL().replace('/api', '');
        const projectUrl = `https://itspranavbadgi.com/project/${slug}`;
        window.open(projectUrl, '_blank');
    }

    showLoading(show) {
        const container = document.getElementById('projectsList');
        if (!container) return;

        if (show) {
            container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading projects...</div>';
        } else {
            // Clear loading - renderProjects() will set the real content
            container.innerHTML = '';
        }
    }

    getStatusColor(status) {
        const colors = {
            'completed': 'success',
            'in-progress': 'warning',
            'planned': 'secondary'
        };
        return colors[status] || 'secondary';
    }
}

// Add badge styles
const badgeStyles = document.createElement('style');
badgeStyles.textContent = `
    .badge {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        font-weight: 500;
        border-radius: 0.375rem;
        margin-left: 0.5rem;
    }
    .badge-primary { background: var(--primary-color); color: white; }
    .badge-success { background: var(--success-color); color: white; }
    .badge-warning { background: var(--warning-color); color: white; }
    .badge-secondary { background: var(--gray-500); color: white; }
    
    .tech-tag {
        display: inline-block;
        background: var(--gray-100);
        color: var(--gray-700);
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        margin-right: 0.5rem;
        margin-bottom: 0.25rem;
    }
    
    .item-technologies {
        margin-top: 0.5rem;
    }
    
    .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        color: var(--gray-500);
    }
    
    .empty-state i {
        color: var(--gray-300);
        margin-bottom: 1rem;
    }
    
    .empty-state h3 {
        color: var(--gray-700);
        margin-bottom: 0.5rem;
    }
`;
document.head.appendChild(badgeStyles);

// Initialize projects manager
const projectsManager = new ProjectsManager();
window.projectsManager = projectsManager;