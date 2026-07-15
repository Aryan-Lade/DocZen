import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const uploadFile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getFiles: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getFile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const renameFile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteFile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const downloadFile: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getStats: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=fileController.d.ts.map