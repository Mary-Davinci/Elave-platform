// src/pages/Projects.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects } from '../services/projectService';
import { getCompanies } from '../services/companyService';
import { Project, Company } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Projects.css';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch projects
        const projectsData = await getProjects();
        setProjects(projectsData);
        
        // Fetch companies for reference
        const companiesData = await getCompanies();
        setCompanies(companiesData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects');
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, navigate]);

  const handleAddProject = () => {
    navigate('/projects/new');
  };

  const handleEditProject = (id: string) => {
    navigate(`/projects/edit/${id}`);
  };

  const handleFilterChange = async (filter: string) => {
    setActiveFilter(filter);
    try {
      setLoading(true);
      // If filter is 'all', don't apply status filter
      const projectsData = filter === 'all' 
        ? await getProjects() 
        : await getProjects(filter);
      setProjects(projectsData);
      setLoading(false);
    } catch (err) {
      console.error('Error filtering projects:', err);
      setError('Failed to filter projects');
      setLoading(false);
    }
  };

  // Find company name by ID
  const getCompanyName = (companyId?: string) => {
    if (!companyId) return 'N/A';
    const company = companies.find(c => c._id === companyId);
    return company ? company.name : 'Unknown Company';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="projects-container">
      <div className="projects-header">
        <h1>Projects</h1>
        <button className="add-button" onClick={handleAddProject}>
          Add New Project
        </button>
      </div>

      <div className="filter-buttons">
        <button 
          className={`filter-button ${activeFilter === 'all' ? 'active' : ''}`} 
          onClick={() => handleFilterChange('all')}
        >
          All Projects
        </button>
        <button 
          className={`filter-button ${activeFilter === 'requested' ? 'active' : ''}`} 
          onClick={() => handleFilterChange('requested')}
        >
          Requested
        </button>
        <button 
          className={`filter-button ${activeFilter === 'inProgress' ? 'active' : ''}`} 
          onClick={() => handleFilterChange('inProgress')}
        >
          In Progress
        </button>
        <button 
          className={`filter-button ${activeFilter === 'completed' ? 'active' : ''}`} 
          onClick={() => handleFilterChange('completed')}
        >
          Completed
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="no-data">
          <p>No projects found. Click "Add New Project" to create one.</p>
        </div>
      ) : (
        <div className="projects-table-container">
          <table className="projects-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Company</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project._id}>
                  <td>{project.title}</td>
                  <td>
                    <span className={`status-badge ${project.status}`}>
                      {project.status === 'inProgress' ? 'In Progress' : 
                        project.status.charAt(0).toUpperCase() + project.status.slice(1)
                      }
                    </span>
                  </td>
                  <td>{getCompanyName(project.company)}</td>
                  <td>{new Date(project.createdAt).toLocaleDateString()}</td>
                  <td className="actions">
                    <button 
                      className="edit-button"
                      onClick={() => handleEditProject(project._id)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Projects;