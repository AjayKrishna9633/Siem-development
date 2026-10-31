import { Router, type RequestHandler } from 'express';
import type { UsersController } from '../controllers/users.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { authorize } from '../middlewares/auth.middleware.ts';
import { Permission } from '../../domain/enums/Permission.ts';
import { addUserSchema } from '../validators/user-mgmt.schema.ts';

// Everyone in the install — for users who manage users
export function usersRoutes(controller: UsersController, authMiddleware: RequestHandler): Router {
  const router = Router();
  router.use(authMiddleware, authorize(Permission.USERS_MANAGE));

  router.get('/', controller.list);
  router.post('/', validate(addUserSchema), controller.add);
  router.post('/:userId/activation', controller.resendActivationFor);

  return router;
}
