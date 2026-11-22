import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import TYPES from '../../domain/constants/types.ts';
import { HttpStatusCode } from '../../domain/enums/HttpStatusCode.ts';
import type { IHealthCheckService } from '../../application/interfaces/services/health-check.service.interface.ts';

@injectable()
export class HealthController {
  constructor(@inject(TYPES.HealthCheckService) private readonly _health: IHealthCheckService) {}

  // Public: says only ok or not; details go to the server log.
  check = async (_req: Request, res: Response): Promise<void> => {
    const { healthy } = await this._health.check();
    res.setHeader('Cache-Control', 'no-store');
    if (healthy) {
      res.status(HttpStatusCode.OK).json({ status: 'ok' });
    } else {
      res.status(HttpStatusCode.SERVICE_UNAVAILABLE).json({ status: 'unavailable' });
    }
  };
}
