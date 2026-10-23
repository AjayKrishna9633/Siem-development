import { Router, type RequestHandler } from 'express';
import type { CompanyController } from '../controllers/company.controller.ts';
import { validate } from '../middlewares/validate.middleware.ts';
import { requireRoles } from '../middlewares/auth.middleware.ts';
import { UserRole } from '../../domain/enums/UserRole.ts';
import {
  createCompanySchema,
  replaceCompanyAdminSchema,
  updateCompanySchema,
} from '../validators/user-mgmt.schema.ts';

// Platform-level company management — super admin only
export function companyRoutes(
  controller: CompanyController,
  authMiddleware: RequestHandler,
): Router {
  const router = Router();
  router.use(authMiddleware, requireRoles(UserRole.SUPER_ADMIN));

  router.get('/', controller.list);
  router.post('/', validate(createCompanySchema), controller.create);
  router.patch('/:companyId', validate(updateCompanySchema), controller.update);
  router.post('/:companyId/deactivate', controller.deactivate);
  router.post('/:companyId/reactivate', controller.reactivate);
  router.put('/:companyId/admin', validate(replaceCompanyAdminSchema), controller.replaceAdmin);
  router.post('/:companyId/admin/activation', controller.resendAdminActivation);

  return router;
}
