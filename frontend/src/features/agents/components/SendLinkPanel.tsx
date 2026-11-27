import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { Panel } from '@/components/ui/Panel.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Field, Input, Select } from '@/components/ui/Form.tsx';
import { useRemote } from '@/hooks/useRemote.ts';
import { apiErrorMessage } from '@/lib/errors.ts';
import { agentsService } from '../api/agentsApi.ts';
import {
  AGENT_IDENTIFIER_PATTERN,
  AGENT_NAME_RULE,
  DEFAULT_GROUP,
} from '../constants/enrollment.ts';
import { OsPicker } from './OsPicker.tsx';
import { CreatedLinkPanel } from './CreatedLinkPanel.tsx';
import type { AgentArch, AgentOs, ICreatedEnrollmentLink } from '../types/agent.types.ts';

// "Send a link": SIEMple registers the agent now and makes a one-time link for the person who
// installs it. The name is required: Wazuh issues the agent's key for that name.
export const SendLinkPanel: React.FC = () => {
  const navigate = useNavigate();
  const [os, setOs] = useState<AgentOs>('windows');
  const [arch, setArch] = useState<AgentArch>('x86_64');
  const [chosenGroup, setChosenGroup] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<ICreatedEnrollmentLink | null>(null);

  const fetchGroups = useCallback(() => agentsService.groups(), []);
  const groups = useRemote(fetchGroups, 'Failed to load the agent groups from Wazuh.');
  const groupList = groups.data ?? [];
  const group =
    chosenGroup ?? (groupList.includes(DEFAULT_GROUP) ? DEFAULT_GROUP : (groupList[0] ?? ''));

  const name = agentName.trim();
  const nameError = name === '' || AGENT_IDENTIFIER_PATTERN.test(name) ? null : AGENT_NAME_RULE;

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      setLink(
        await agentsService.createLink({
          os,
          group,
          agentName: name,
          ...(os !== 'windows' && { arch }),
        }),
      );
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Could not create the link.'));
    } finally {
      setCreating(false);
    }
  };

  const startOver = () => {
    setLink(null);
    setAgentName('');
  };

  if (link) {
    return (
      <Panel className="space-y-5 p-5">
        <CreatedLinkPanel link={link} />
        <div className="flex justify-between gap-3">
          <Button onClick={startOver}>Send another link</Button>
          <Button variant="primary" onClick={() => navigate('/agents')}>
            Done
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel className="space-y-5 p-5">
      <OsPicker os={os} arch={arch} onOsChange={setOs} onArchChange={setArch} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Group"
          hint="The agent gets this group's configuration in Wazuh."
          error={groups.error}
        >
          <Select
            value={group}
            onChange={(e) => setChosenGroup(e.target.value)}
            disabled={groups.loading || groupList.length === 0}
          >
            {groups.loading && <option value="">Loading groups...</option>}
            {groupList.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Agent name" hint={AGENT_NAME_RULE} error={nameError}>
          <Input
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder={os === 'windows' ? 'e.g. finance-pc-07' : 'e.g. web-01'}
            invalid={nameError !== null}
            maxLength={64}
            spellCheck={false}
            autoComplete="off"
          />
        </Field>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded border border-high/40 bg-high/10 px-3 py-2 text-sm text-high"
        >
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={() => void create()}
          disabled={creating || !group || name === '' || nameError !== null}
        >
          {creating ? 'Creating...' : 'Create link'}
        </Button>
      </div>
    </Panel>
  );
};
