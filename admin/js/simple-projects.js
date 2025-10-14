/**
 * Simplified Projects Management
 * Load JSON data directly and provide simple CRUD operations
 */

// Simple projects management without complex classes
window.projectsData = [];

// Load projects data from JSON
async function loadProjectsData() {
    try {
        console.log('Loading projects from JSON...');
        const response = await fetch('/data/projects.json');
        if (response.ok) {
            const data = await response.json();
            window.projectsData = data.projects || [];
            console.log('Loaded projects:', window.projectsData.length);
            displayProjects();
            return true;
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
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
    
    // For now, just show an alert - we can implement proper editing later
    alert(`Edit project: ${project.title}\n\nThis will be implemented with a simple form that saves via GitHub API.`);
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

function showAddProjectForm() {
    alert('Add Project form will be implemented with a simple form that saves via GitHub API.');
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