import { Router, type RequestHandler } from 'express';
import type { UsersController } from '../controllers/users.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { authorize } from '../middlewares/auth.middleware.ts';
import { Permission } from '../../domain/enums/Permission.ts';
import { changeRoleSchema, inviteUserSchema } from '../validators/user-mgmt.schema.ts';

// Everyone in the install — for users who manage users
export function usersRoutes(controller: UsersController, authMiddleware: RequestHandler): Router {
  const router = Router();
  router.use(authMiddleware, authorize(Permission.USERS_MANAGE));

  router.get('/', controller.list);
  router.get('/invites', controller.listInvites);
  router.post('/invites', validate(inviteUserSchema), controller.invite);
  router.post('/:userId/invite/resend', controller.resendInvite);
  router.delete('/:userId/invite', controller.revokeInvite);
  router.post('/:userId/password-reset', controller.issueResetLink);
  router.patch('/:userId/role', validate(changeRoleSchema), controller.changeRole);
  router.post('/:userId/disable', controller.disable);
  router.post('/:userId/enable', controller.enable);

  return router;
}
