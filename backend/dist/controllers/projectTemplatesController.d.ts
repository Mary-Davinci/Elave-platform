import { CustomRequestHandler } from "../types/express";
/**
 * Get all project templates
 * Admin sees all templates, regular users see only public templates
 */
export declare const getProjectTemplates: CustomRequestHandler;
/**
 * Get a single project template by ID
 */
export declare const getProjectTemplateById: CustomRequestHandler;
/**
 * Create a new project template (admin only)
 */
export declare const createProjectTemplate: CustomRequestHandler;
/**
 * Update a project template (admin only)
 */
export declare const updateProjectTemplate: CustomRequestHandler;
/**
 * Delete a project template (admin only)
 */
export declare const deleteProjectTemplate: CustomRequestHandler;
/**
 * Create projects from selected templates
 * This allows users to create multiple projects at once based on templates
 */
export declare const createProjectsFromTemplates: CustomRequestHandler;
