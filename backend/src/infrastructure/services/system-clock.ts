import { injectable } from 'inversify';
import type { IClock } from '../../application/interfaces/services/clock.interface.ts';

@injectable()
export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}
