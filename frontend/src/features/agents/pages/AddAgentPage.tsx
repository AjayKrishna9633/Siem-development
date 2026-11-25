import React, { useCallback, useState } from 'react';
import { ShieldAlert, Server } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/PageHeader.tsx';
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
  OS_OPTIONS,
  SHELL_LABEL,
} from '../constants/enrollment.ts';
import { StepIndicator } from '../components/StepIndicator.tsx';
import { OsPicker } from '../components/OsPicker.tsx';
import { CommandBlock } from '../components/CommandBlock.tsx';
import { EnrollmentWaiter } from '../components/EnrollmentWaiter.tsx';
import type { AgentArch, AgentOs, IEnrollCommand } from '../types/agent.types.ts';

const STEPS = ['Operating system', 'Group and name', 'Run the command', 'Connect'] as const;

const nameError = (name: string): string | null =>
  name === '' || AGENT_IDENTIFIER_PATTERN.test(name) ? null : AGENT_NAME_RULE;

// The generated command holds the enrollment secret: it lives only in this page's state, is masked
// until revealed, and is gone when the page is left.
export const AddAgentPage: React.FC = () => {
  const [step, setStep] = useState(0);
  const [os, setOs] = useState<AgentOs>('windows');
  const [arch, setArch] = useState<AgentArch>('x86_64');
  const [chosenGroup, setChosenGroup] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('');
  const [result, setResult] = useState<IEnrollCommand | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const fetchGroups = useCallback(() => agentsService.groups(), []);
  const groups = useRemote(fetchGroups, 'Failed to load the agent groups from Wazuh.');
  const groupList = groups.data ?? [];
  const group =
    chosenGroup ?? (groupList.includes(DEFAULT_GROUP) ? DEFAULT_GROUP : (groupList[0] ?? ''));

  const trimmedName = agentName.trim();
  const invalidName = nameError(trimmedName);
  const osLabel = OS_OPTIONS.find((o) => o.value === os)?.label ?? os;

  const generate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const command = await agentsService.enrollCommand({
        os,
        group,
        ...(os !== 'windows' && { arch }),
        ...(trimmedName && { agentName: trimmedName }),
      });
      setResult(command);
      setStep(2);
    } catch (err: unknown) {
      setGenerateError(apiErrorMessage(err, 'Could not generate the command.'));
    } finally {
      setGenerating(false);
    }
  };

  const backToOptions = () => {
    setResult(null);
    setStep(1);
  };

  return (
    <Page className="max-w-5xl">
      <PageHeader
        title="Add agent"
        description="Generate a command, run it on the machine, and SIEMple shows the agent once it connects."
        crumbs={[{ label: 'Agents', to: '/agents' }, { label: 'Add agent' }]}
        icon={<Server className="size-5" />}
      />
      <StepIndicator steps={STEPS} current={step} />

      {step === 0 && (
        <Panel className="space-y-5 p-5">
          <OsPicker os={os} arch={arch} onOsChange={setOs} onArchChange={setArch} />
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setStep(1)}>
              Next
            </Button>
          </div>
        </Panel>
      )}

      {step === 1 && (
        <Panel className="space-y-5 p-5">
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
            <Field
              label="Agent name (optional)"
              hint={`Leave empty to use the machine's name. ${AGENT_NAME_RULE}`}
              error={invalidName}
            >
              <Input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder={os === 'windows' ? 'e.g. finance-pc-07' : 'e.g. web-01'}
                invalid={invalidName !== null}
                maxLength={64}
                spellCheck={false}
                autoComplete="off"
              />
            </Field>
          </div>
          {groups.error && (
            <Button size="sm" onClick={groups.reload}>
              Retry loading groups
            </Button>
          )}
          {generateError && (
            <p
              role="alert"
              className="rounded border border-high/40 bg-high/10 px-3 py-2 text-sm text-high"
            >
              {generateError}
            </p>
          )}
          <div className="flex justify-between">
            <Button onClick={() => setStep(0)}>Back</Button>
            <Button
              variant="primary"
              onClick={() => void generate()}
              disabled={generating || !group || invalidName !== null}
            >
              {generating ? 'Generating...' : 'Generate command'}
            </Button>
          </div>
        </Panel>
      )}

      {step === 2 && result && (
        <div className="space-y-5">
          <Panel className="space-y-4 p-5">
            <p className="text-sm text-muted">
              {osLabel}
              {result.arch && ` (${result.arch})`}, group{' '}
              <strong className="text-ink">{result.group}</strong>, agent {result.agentVersion},
              connecting to{' '}
              <span className="font-mono text-xs text-ink">{result.managerAddress}</span>.
            </p>
            <CommandBlock
              label={SHELL_LABEL[result.os]}
              command={result.command}
              maskedCommand={result.maskedCommand}
            />
            <p className="flex items-start gap-2 rounded border border-high/40 bg-high/10 px-3 py-2 text-sm text-high">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              This command contains the enrollment secret: anyone who has it can add agents to
              SIEMple. Don't paste it into chats, tickets or public places.
            </p>
          </Panel>

          <div className="grid gap-5 md:grid-cols-2">
            <Panel className="space-y-2 p-5">
              <h2 className="text-sm font-medium text-ink">Before you run it</h2>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
                {result.requirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            </Panel>
            <Panel className="space-y-2 p-5">
              <h2 className="text-sm font-medium text-ink">Check the connection first</h2>
              <p className="text-sm text-muted">
                Run this on the machine. Both ports ({result.ports.join(' and ')}) must succeed.
              </p>
              <CommandBlock label="Connectivity check" command={result.connectivityCheck} />
            </Panel>
          </div>

          <div className="flex justify-between">
            <Button onClick={backToOptions}>Back</Button>
            <Button variant="primary" onClick={() => setStep(3)}>
              I ran it, wait for the agent
            </Button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="space-y-5">
          <EnrollmentWaiter
            key={result.generatedAt}
            since={result.generatedAt}
            agentName={result.agentName}
          />
          <Button onClick={() => setStep(2)}>Show the command again</Button>
        </div>
      )}
    </Page>
  );
};
