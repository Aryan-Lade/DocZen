import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const mergePDFs: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const splitPDF: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const compressPDF: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const protectPDF: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const unlockPDF: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const reorderPDF: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const rotatePDF: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const addWatermark: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const addPageNumbers: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=pdfController.d.ts.map