import type {
  IAddTeamMemberInput,
  IAddTeamMemberResponse,
  IListTeamMembersInput,
  ITeamMember,
} from '../../types/use-case/user-mgmt.types.ts';

export interface IAddTeamMemberUseCase {
  execute(input: IAddTeamMemberInput): Promise<IAddTeamMemberResponse>;
}

export interface IListTeamMembersUseCase {
  execute(input: IListTeamMembersInput): Promise<ITeamMember[]>;
}
