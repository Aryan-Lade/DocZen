import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const getActivity: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const clearActivity: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=activityController.d.ts.map