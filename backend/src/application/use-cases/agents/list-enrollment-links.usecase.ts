import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IPendingAgentRepository } from '../../interfaces/repositories/pending-agent.repository.interface.ts';
import type { IListEnrollmentLinksUseCase } from '../../interfaces/use-cases/agents.interface.ts';
import type { IListEnrollmentLinksInput } from '../../dtos/agent/request/agent-request.dto.ts';
import type { IEnrollmentLinkSummary } from '../../../domain/types/pending-agent.types.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { assertPermission } from '../shared/access.ts';

@injectable()
export class ListEnrollmentLinksUseCase implements IListEnrollmentLinksUseCase {
  constructor(
    @inject(TYPES.PendingAgentRepository) private readonly _pending: IPendingAgentRepository,
  ) {}

  async execute(input: IListEnrollmentLinksInput): Promise<IEnrollmentLinkSummary[]> {
    assertPermission(input.actor, Permission.AGENTS_MANAGE);
    return this._pending.listPending();
  }
}
