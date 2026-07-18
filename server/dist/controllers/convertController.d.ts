import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const textToPdf: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const officeToPdf: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const pdfToOffice: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const htmlToPdf: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=convertController.d.ts.map