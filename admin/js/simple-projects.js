/**
 * Simplified Projects Management
 * Load JSON data directly and provide simple CRUD operations
 */

// Simple projects management without complex classes
window.projectsData = [];

// Load projects data from GitHub API
async function loadProjectsData() {
    try {
        console.log('Loading projects from GitHub API...');
        const response = await window.api.getProjects({ limit: 50 });
        window.projectsData = response.data?.projects || [];
        console.log('Loaded projects:', window.projectsData.length);
        displayProjects();
        return true;
    } catch (error) {
        console.error('Error loading projects:', error);
        document.getElementById('projectsList').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading projects: ${error.message}</p>
                <button onclick="loadProjectsData()" class="btn btn-primary">Retry</button>
            </div>
        `;
        return false;
    }
}

// Display projects in a simple table
function displayProjects() {
    const container = document.getElementById('projectsList');
    if (!container) return;

    if (window.projectsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-code fa-3x"></i>
                <h3>No Projects Found</h3>
                <p>Start by adding your first project to showcase your work.</p>
                <button onclick="showAddProjectForm()" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Add First Project
                </button>
            </div>
        `;
        return;
    }

    const projectsHTML = window.projectsData.map(project => `
        <div class="content-item" data-project-id="${project._id}">
            <div class="item-info">
                <div class="item-title">
                    ${project.title}
                    ${project.featured ? '<span class="badge badge-primary">Featured</span>' : ''}
                    <span class="badge badge-${getStatusColor(project.status)}">${project.status}</span>
                </div>
                <div class="item-description">${project.description}</div>
                <div class="item-meta">
                    <span><i class="fas fa-tag"></i> ${project.category}</span>
                    <span><i class="fas fa-eye"></i> ${project.metrics?.views || 0} views</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(project.createdAt)}</span>
                </div>
                <div class="item-technologies">
                    ${project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-sm btn-outline" onclick="viewProject('${project.seo?.slug || project._id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-sm btn-primary" onclick="editProject('${project._id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteProject('${project._id}', '${project.title}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = projectsHTML;
}

// Utility functions
function getStatusColor(status) {
    const colors = {
        'completed': 'success',
        'in-progress': 'warning',
        'planned': 'secondary'
    };
    return colors[status] || 'secondary';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function viewProject(slug) {
    const projectUrl = `https://itspranavbadgi.com/project/${slug}`;
    window.open(projectUrl, '_blank');
}

// Simple CRUD operations (will use GitHub API)
async function editProject(projectId) {
    const project = window.projectsData.find(p => p._id === projectId);
    if (!project) {
        alert('Project not found');
        return;
    }
    
    // Simple prompt-based editing
    const title = prompt('Project Title:', project.title);
    if (title === null) return; // User cancelled
    
    const description = prompt('Short Description:', project.description);
    if (description === null) return;
    
    const longDescription = prompt('Detailed Description (optional):', project.longDescription || '');
    if (longDescription === null) return;
    
    const technologies = prompt('Technologies (comma-separated):', project.technologies.join(', '));
    if (technologies === null) return;
    
    const category = prompt('Category (web/mobile/desktop/api/other):', project.category);
    if (category === null) return;
    
    const status = prompt('Status (completed/in-progress/planned):', project.status);
    if (status === null) return;
    
    const featured = confirm('Is this a featured project?');
    
    const liveUrl = prompt('Live URL (optional):', project.links?.live || '');
    if (liveUrl === null) return;
    
    const githubUrl = prompt('GitHub URL (optional):', project.links?.github || '');
    if (githubUrl === null) return;
    
    const demoUrl = prompt('Demo URL (optional):', project.links?.demo || '');
    if (demoUrl === null) return;
    
    // Prepare updated project data
    const updatedProject = {
        title: title.trim(),
        description: description.trim(),
        longDescription: longDescription.trim(),
        technologies: technologies.split(',').map(tech => tech.trim()).filter(tech => tech),
        category: category.trim(),
        status: status.trim(),
        featured: featured,
        links: {
            live: liveUrl.trim(),
            github: githubUrl.trim(),
            demo: demoUrl.trim()
        }
    };
    
    try {
        console.log('Updating project:', updatedProject);
        const response = await window.api.updateProject(projectId, updatedProject);
        if (response.success) {
            alert('Project updated successfully!');
            // Reload the data
            await loadProjectsData();
        }
    } catch (error) {
        console.error('Error updating project:', error);
        alert(`Error updating project: ${error.message}`);
    }
}

async function deleteProject(projectId, projectTitle) {
    if (!confirm(`Are you sure you want to delete "${projectTitle}"?`)) {
        return;
    }
    
    try {
        // Use GitHub API to delete project
        const response = await window.api.deleteProject(projectId);
        if (response.success) {
            alert('Project deleted successfully!');
            // Reload the data
            await loadProjectsData();
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        alert(`Error deleting project: ${error.message}`);
    }
}

async function showAddProjectForm() {
    // Simple prompt-based project creation
    const title = prompt('Project Title:');
    if (!title) return; // User cancelled or empty
    
    const description = prompt('Short Description:');
    if (!description) return;
    
    const longDescription = prompt('Detailed Description (optional):', '');
    if (longDescription === null) return;
    
    const technologies = prompt('Technologies (comma-separated):');
    if (!technologies) return;
    
    const category = prompt('Category (web/mobile/desktop/api/other):', 'web');
    if (!category) return;
    
    const status = prompt('Status (completed/in-progress/planned):', 'completed');
    if (!status) return;
    
    const featured = confirm('Is this a featured project?');
    
    const liveUrl = prompt('Live URL (optional):', '');
    if (liveUrl === null) return;
    
    const githubUrl = prompt('GitHub URL (optional):', '');
    if (githubUrl === null) return;
    
    const demoUrl = prompt('Demo URL (optional):', '');
    if (demoUrl === null) return;
    
    // Prepare new project data
    const newProject = {
        title: title.trim(),
        description: description.trim(),
        longDescription: longDescription.trim(),
        technologies: technologies.split(',').map(tech => tech.trim()).filter(tech => tech),
        category: category.trim(),
        status: status.trim(),
        featured: featured,
        links: {
            live: liveUrl.trim(),
            github: githubUrl.trim(),
            demo: demoUrl.trim()
        },
        seo: {
            slug: title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
        }
    };
    
    try {
        console.log('Creating new project:', newProject);
        const response = await window.api.createProject(newProject);
        if (response.success) {
            alert('Project created successfully!');
            // Reload the data
            await loadProjectsData();
        }
    } catch (error) {
        console.error('Error creating project:', error);
        alert(`Error creating project: ${error.message}`);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener to "Add New Project" button if it exists
    const addBtn = document.getElementById('addProjectBtn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddProjectForm);
    }
});

// Export for admin panel to use
window.loadProjects = loadProjectsData;
window.projectsManager = {
    loadProjects: loadProjectsData
};