import { AppError } from './errors';
import { AuthenticatedRequest } from '../middleware/auth';

export function getAuthUserId(req: AuthenticatedRequest): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or missing authenticated user');
  }

  return userId;
}
