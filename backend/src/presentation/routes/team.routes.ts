import { Router, type RequestHandler } from 'express';
import type { TeamController } from '../controllers/team.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { requireRoles } from '../middlewares/auth.middleware.ts';
import { UserRole } from '../../domain/enums/UserRole.ts';
import { addTeamMemberSchema } from '../validators/user-mgmt.schema.ts';

// Everyone in the install — admins only
export function teamRoutes(controller: TeamController, authMiddleware: RequestHandler): Router {
  const router = Router();
  router.use(authMiddleware, requireRoles(UserRole.ADMIN));

  router.get('/', controller.list);
  router.post('/', validate(addTeamMemberSchema), controller.add);
  router.post('/:userId/activation', controller.resendActivationFor);

  return router;
}
