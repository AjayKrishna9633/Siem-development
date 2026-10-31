import { Router, type RequestHandler } from 'express';
import type { TeamController } from '../controllers/team.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { authorize } from '../middlewares/auth.middleware.ts';
import { Permission } from '../../domain/enums/Permission.ts';
import { addTeamMemberSchema } from '../validators/user-mgmt.schema.ts';

// Everyone in the install — for users who manage users
export function teamRoutes(controller: TeamController, authMiddleware: RequestHandler): Router {
  const router = Router();
  router.use(authMiddleware, authorize(Permission.USERS_MANAGE));

  router.get('/', controller.list);
  router.post('/', validate(addTeamMemberSchema), controller.add);
  router.post('/:userId/activation', controller.resendActivationFor);

  return router;
}
