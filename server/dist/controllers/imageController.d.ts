import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const compressImage: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const convertImage: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const pdfToImage: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=imageController.d.ts.map