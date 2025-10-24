import express from 'express';
import { BrowserBehavior } from '../util/server';
import type { Request, Response } from 'express';
/**
 * Middleware to set proper MIME types for JavaScript files.
 * This is necessary because some browsers (especially Arc) enforce strict MIME type checking
 * and will refuse to execute scripts with incorrect MIME types for security reasons.
 */
export declare function setJavaScriptMimeType(req: Request, res: Response, next: express.NextFunction): void;
/**
 * Handles server startup errors with proper logging and graceful shutdown.
 */
export declare function handleServerError(error: NodeJS.ErrnoException, port: number): void;
export declare function createApp(): import("express-serve-static-core").Express;
export declare function startServer(port?: number, browserBehavior?: BrowserBehavior): Promise<void>;
//# sourceMappingURL=server.d.ts.map