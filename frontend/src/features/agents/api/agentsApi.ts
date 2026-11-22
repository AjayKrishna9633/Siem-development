import { api, INLINE_ERRORS } from '@/services/api.ts';
import type { IApiResponse } from '@/types/auth.ts';
import type {
  IAgent,
  IEnrollCommand,
  IEnrollCommandRequest,
  IEnrollmentCheck,
} from '../types/agent.types.ts';

export const agentsService = {
  async list(): Promise<IAgent[]> {
    const res = await api.get<IApiResponse<IAgent[]>>('/agents', INLINE_ERRORS);
    return res.data.data;
  },

  async groups(): Promise<string[]> {
    const res = await api.get<IApiResponse<string[]>>('/agents/groups', INLINE_ERRORS);
    return res.data.data;
  },

  async enrollCommand(body: IEnrollCommandRequest): Promise<IEnrollCommand> {
    const res = await api.post<IApiResponse<IEnrollCommand>>(
      '/agents/enroll-command',
      body,
      INLINE_ERRORS,
    );
    return res.data.data;
  },

  async checkEnrollment(params: { since: string; agentName?: string }): Promise<IEnrollmentCheck> {
    const res = await api.get<IApiResponse<IEnrollmentCheck>>('/agents/enrollment-check', {
      ...INLINE_ERRORS,
      params,
    });
    return res.data.data;
  },
};
