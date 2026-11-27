import { z } from 'zod';
import { AgentArch, AgentOs } from '../../domain/enums/AgentOs.ts';
import { ErrorMessage } from '../../domain/enums/ErrorMessage.ts';
import { AGENT_IDENTIFIER_PATTERN } from '../../domain/policies/agent-identifier.policy.ts';

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const agentName = z.string().regex(AGENT_IDENTIFIER_PATTERN, ErrorMessage.AGENT_NAME_INVALID);

export const enrollCommandBodySchema = z.object({
  os: z.enum(AgentOs, 'Choose windows, linux-deb or linux-rpm'),
  arch: optional(z.enum(AgentArch, 'Choose x86_64 or arm64')),
  group: z.string().regex(AGENT_IDENTIFIER_PATTERN, ErrorMessage.AGENT_GROUP_INVALID),
  agentName: optional(agentName),
});

export const enrollmentCheckQuerySchema = z.object({
  agentName: optional(agentName),
  since: z.iso
    .datetime({ offset: true, error: 'since must be an ISO 8601 date and time' })
    .transform((value) => new Date(value)),
});

// A pre-registered agent needs its name up front: Wazuh assigns the key to that name.
export const enrollmentLinkBodySchema = z.object({
  os: z.enum(AgentOs, 'Choose windows, linux-deb or linux-rpm'),
  arch: optional(z.enum(AgentArch, 'Choose x86_64 or arm64')),
  group: z.string().regex(AGENT_IDENTIFIER_PATTERN, ErrorMessage.AGENT_GROUP_INVALID),
  agentName,
});

export const enrollmentLinkParamsSchema = z.object({
  id: z.uuid({ error: 'Not a valid enrollment link id' }),
});
