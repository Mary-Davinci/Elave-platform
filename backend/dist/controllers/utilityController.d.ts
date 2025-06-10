import { CustomRequestHandler } from "../types/express";
export declare const uploadMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const getUtilities: CustomRequestHandler;
export declare const uploadUtility: CustomRequestHandler;
export declare const addUtility: CustomRequestHandler;
export declare const deleteUtility: CustomRequestHandler;
export declare const initializeUtilities: CustomRequestHandler;
export declare const downloadUtility: CustomRequestHandler;
