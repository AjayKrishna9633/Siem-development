import { injectable, inject } from 'inversify';
import TYPES from '../../../domain/constants/types.ts';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.ts';
import type { IAuthTokenRepository } from '../../interfaces/repositories/auth-token.repository.interface.ts';
import type { IListPendingInvitesUseCase } from '../../interfaces/use-cases/invites.interface.ts';
import type { IPendingInvite } from '../../types/use-case/invite.types.ts';
import type { IActor } from '../../types/use-case/actor.types.ts';
import { Permission } from '../../../domain/enums/Permission.ts';
import { UserStatus } from '../../../domain/enums/UserStatus.ts';
import { AuthTokenType } from '../../../domain/enums/AuthTokenType.ts';
import { assertPermission } from '../shared/access.ts';

// Everyone invited but not yet accepted, with when their link expires
@injectable()
export class ListPendingInvitesUseCase implements IListPendingInvitesUseCase {
  constructor(
    @inject(TYPES.UserRepository) private readonly users: IUserRepository,
    @inject(TYPES.AuthTokenRepository) private readonly tokens: IAuthTokenRepository,
  ) {}

  async execute(input: { actor: IActor }): Promise<IPendingInvite[]> {
    assertPermission(input.actor, Permission.USERS_MANAGE);

    const [users, links] = await Promise.all([
      this.users.findAll(),
      this.tokens.findUnusedByType(AuthTokenType.INVITE),
    ]);
    // Newest first, and issuing a link deletes the older ones, so the first is the live one
    const linkByUser = new Map(links.map((link) => [link.userId, link] as const).reverse());
    const now = new Date();

    return users
      .filter((user) => user.status === UserStatus.INVITED)
      .map((user) => {
        const snapshot = user.toSnapshot();
        const expiresAt = linkByUser.get(user.id)?.expiresAt ?? null;
        return {
          userId: user.id,
          email: user.email,
          role: user.role,
          invitedById: snapshot.invitedById,
          invitedAt: snapshot.createdAt,
          expiresAt,
          expired: expiresAt === null || expiresAt <= now,
        };
      });
  }
}
