import { CustomRequestHandler } from "../types/express";
declare const ROLE_HIERARCHY: {
    readonly segnalatori: 1;
    readonly sportello_lavoro: 2;
    readonly responsabile_territoriale: 3;
    readonly admin: 4;
    readonly super_admin: 5;
};
declare const hasMinimumRole: (userRole: string, requiredRole: string) => boolean;
export declare const segnalaториRoleMiddleware: CustomRequestHandler;
export declare const sportelloLavoroRoleMiddleware: CustomRequestHandler;
export declare const responsabileTerritorialeMiddleware: CustomRequestHandler;
export declare const adminRoleMiddleware: CustomRequestHandler;
export declare const superAdminRoleMiddleware: CustomRequestHandler;
export declare const userCreationMiddleware: CustomRequestHandler;
export declare const approvedUserMiddleware: CustomRequestHandler;
export declare const viewUtilitiesOnlyMiddleware: CustomRequestHandler;
export { ROLE_HIERARCHY, hasMinimumRole };
