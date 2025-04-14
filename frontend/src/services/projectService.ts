// src/services/projectService.ts
import api from './api';

// Interface for project data
export interface Project {
  _id: string;
  title: string;
  description: string;
  company: string;
  status: 'requested' | 'inProgress' | 'completed';
  startDate: string | null;
  endDate: string | null;
  budget: number;
  hours: number;
  templateCode?: string;
  user: string;
  createdAt: string;
  updatedAt: string;
}

// Interface for project template
export interface ProjectTemplate {
  _id: string;
  code: string;
  title: string;
  description: string;
  minPrice: number;
  maxPrice: number;
  hours: number;
  category?: string;
  subcategory?: string;
  type?: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch all projects for the current user
 * @param status Optional status filter
 * @returns Promise with array of projects
 */
export const getProjects = async (status?: string) => {
  try {
    const url = status ? `/api/projects?status=${status}` : '/api/projects';
    const response = await api.get<Project[]>(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
};

/**
 * Fetch a single project by ID
 * @param id The project ID
 * @returns Promise with project data
 */
export const getProjectById = async (id: string) => {
  try {
    const response = await api.get<Project>(`/api/projects/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching project with id ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new project
 * @param projectData Project data to create
 * @returns Promise with the created project
 */
export const createProject = async (projectData: Partial<Project>) => {
  try {
    const response = await api.post<Project>('/api/projects', projectData);
    return response.data;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};

/**
 * Update an existing project
 * @param id Project ID to update
 * @param projectData Updated project data
 * @returns Promise with the updated project
 */
export const updateProject = async (id: string, projectData: Partial<Project>) => {
  try {
    const response = await api.put<Project>(`/api/projects/${id}`, projectData);
    return response.data;
  } catch (error) {
    console.error(`Error updating project with id ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a project
 * @param id Project ID to delete
 * @returns Promise indicating success
 */
export const deleteProject = async (id: string) => {
  try {
    await api.delete(`/api/projects/${id}`);
  } catch (error) {
    console.error(`Error deleting project with id ${id}:`, error);
    throw error;
  }
};

/**
 * Fetch all project templates
 * @returns Promise with array of project templates
 */
export const getProjectTemplates = async () => {
  try {
    const response = await api.get<ProjectTemplate[]>('/api/projects/templates');
    return response.data;
  } catch (error) {
    console.error('Error fetching project templates:', error);
    throw error;
  }
};

/**
 * Fetch a single project template by ID
 * @param id Template ID
 * @returns Promise with template data
 */
export const getProjectTemplateById = async (id: string) => {
  try {
    const response = await api.get<ProjectTemplate>(`/api/projects/templates/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching project template with id ${id}:`, error);
    throw error;
  }
};

/**
 * Create projects from templates
 * @param templates Array of template selections with quantities
 * @param companyId Company ID to associate with projects
 * @returns Promise with array of created projects
 */
export const createProjectsFromTemplates = async (
  templates: { projectId: string; quantity: number }[],
  companyId: string
) => {
  try {
    const response = await api.post<Project[]>('/api/projects/bulk', {
      templates,
      company: companyId
    });
    return response.data;
  } catch (error) {
    console.error('Error creating projects from templates:', error);
    throw error;
  }
};