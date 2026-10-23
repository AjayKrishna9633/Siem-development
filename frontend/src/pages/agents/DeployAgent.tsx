import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ChevronDown,
  Copy,
  Check,
  Download,
  Monitor,
  SquareTerminal,
  TriangleAlert,
} from 'lucide-react';
import { Page, PageHeader } from '../../components/ui/PageHeader.tsx';
import { MonoLabel, Panel } from '../../components/ui/Panel.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Checkbox, Input, Select } from '../../components/ui/Form.tsx';
import { cn } from '../../lib/cn.ts';

type PackageId = 'rpm-amd64' | 'rpm-aarch64' | 'deb-amd64' | 'deb-aarch64' | 'msi';

const linuxPackages: { id: PackageId; label: string }[] = [
  { id: 'rpm-amd64', label: 'RPM (amd64)' },
  { id: 'rpm-aarch64', label: 'RPM (aarch64)' },
  { id: 'deb-amd64', label: 'DEB (amd64)' },
  { id: 'deb-aarch64', label: 'DEB (aarch64)' },
];

const GROUPS = ['Default', 'database-nodes', 'web-servers', 'dmz'];

const readRememberedServer = () => {
  try {
    return localStorage.getItem('siem_deploy_server') ?? '';
  } catch {
    return '';
  }
};

const installCommand = (pkg: PackageId, server: string, name: string, group: string) => {
  const env = [
    `SIEMPLE_MANAGER='${server || '<server>'}'`,
    name && `SIEMPLE_AGENT_NAME='${name}'`,
    `SIEMPLE_AGENT_GROUP='${group.toLowerCase()}'`,
  ]
    .filter(Boolean)
    .join(' ');
  if (pkg === 'msi') {
    return `Invoke-WebRequest -Uri https://${server || '<server>'}/packages/siemple-agent-4.3.0.msi -OutFile $env:TEMP\\siemple-agent.msi; msiexec.exe /i $env:TEMP\\siemple-agent.msi /q SIEMPLE_MANAGER='${server || '<server>'}'${name ? ` SIEMPLE_AGENT_NAME='${name}'` : ''}; NET START SiempleSvc`;
  }
  const [format, arch] = pkg.split('-');
  const file = `siemple-agent-4.3.0.${arch === 'amd64' ? (format === 'rpm' ? 'x86_64' : 'amd64') : arch}.${format}`;
  const install =
    format === 'rpm'
      ? `sudo ${env} yum localinstall -y ./${file}`
      : `sudo ${env} dpkg -i ./${file}`;
  return `curl -so ${file} https://${server || '<server>'}/packages/${file} && ${install}\nsudo systemctl daemon-reload && sudo systemctl enable --now siemple-agent`;
};

const Step: React.FC<{ n: number; title: string; children: React.ReactNode; last?: boolean }> = ({
  n,
  title,
  children,
  last,
}) => (
  <section className="relative grid grid-cols-[24px_1fr] gap-4">
    <div className="flex flex-col items-center">
      <span className="font-mono text-xs text-ink">{n}</span>
      {!last && <span className="mt-2 w-px flex-1 bg-line-strong" />}
    </div>
    <div className="space-y-3 pb-8">
      <h2 className="font-semibold uppercase tracking-[0.5px] text-ink">{title}</h2>
      {children}
    </div>
  </section>
);

export const DeployAgent: React.FC = () => {
  const [pkg, setPkg] = useState<PackageId | null>('rpm-amd64');
  const [server, setServer] = useState(readRememberedServer);
  const [remember, setRemember] = useState(true);
  const [agentName, setAgentName] = useState('');
  const [group, setGroup] = useState('Default');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const ready = !!pkg && server.trim().length > 0;
  const command = useMemo(
    () => (pkg ? installCommand(pkg, server.trim(), agentName.trim(), group) : ''),
    [pkg, server, agentName, group],
  );

  const persistServer = () => {
    try {
      if (remember) localStorage.setItem('siem_deploy_server', server.trim());
      else localStorage.removeItem('siem_deploy_server');
    } catch {
      // Storage unavailable — nothing to persist
    }
  };

  const download = () => {
    if (!ready) return;
    persistServer();
    const blob = new Blob([`#!/bin/sh\n# SIEMple agent installer (${pkg})\n${command}\n`], {
      type: 'text/x-sh',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pkg === 'msi' ? 'install-siemple-agent.ps1' : 'install-siemple-agent.sh';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    persistServer();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Page className="max-w-[900px]">
      <PageHeader
        crumbs={[{ label: 'Environment' }, { label: 'Agents', to: '/agents' }, { label: 'Deploy' }]}
        title="Deploy New Agent"
        description="Configure and download the installation package for SIEMple. The agent will automatically enroll upon first execution."
      />

      <div className="pt-2">
        <Step n={1} title="Select package">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                family: 'Linux',
                icon: <SquareTerminal className="size-4" />,
                options: linuxPackages,
              },
              {
                family: 'Windows',
                icon: <Monitor className="size-4" />,
                options: [{ id: 'msi' as const, label: 'MSI (32/64 bit)' }],
              },
            ].map((group) => {
              const active = group.options.some((o) => o.id === pkg);
              return (
                <div
                  key={group.family}
                  className={cn(
                    'rounded border p-4 transition-colors',
                    active ? 'border-accent bg-low/10' : 'border-line-strong bg-raised/50',
                  )}
                >
                  <p
                    className={cn(
                      'mb-3 flex items-center gap-2 font-medium',
                      active ? 'text-ink' : 'text-muted',
                    )}
                  >
                    {group.icon} {group.family}
                  </p>
                  <div className="space-y-2">
                    {group.options.map((o) => (
                      <label
                        key={o.id}
                        className="flex cursor-pointer items-center gap-2.5 font-mono text-xs text-ink"
                      >
                        <input
                          type="radio"
                          name="package"
                          checked={pkg === o.id}
                          onChange={() => setPkg(o.id)}
                          className="size-3.5 accent-[#3b82f6]"
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <Link
            to="/help"
            className="inline-block font-mono text-[11px] text-muted underline hover:text-ink"
          >
            Documentation for other architectures
          </Link>
        </Step>

        <Step n={2} title="Server address">
          <Panel className="max-w-md space-y-3 bg-raised/50 p-4">
            <MonoLabel>IP or FQDN</MonoLabel>
            <Input
              value={server}
              onChange={(e) => setServer(e.target.value)}
              placeholder="e.g., 10.0.0.5 or command.local"
              className="font-mono"
            />
            <Checkbox
              checked={remember}
              onChange={setRemember}
              label={
                <span className="text-xs text-muted">
                  Remember server address for future deployments
                </span>
              }
            />
          </Panel>
        </Step>

        <Step n={3} title="Optional settings">
          <Panel className="max-w-md space-y-3 bg-raised/50 p-4">
            <MonoLabel>Agent name (optional)</MonoLabel>
            <Input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Will default to hostname"
              className="font-mono"
            />
            <p className="flex items-center gap-2 rounded border border-medium/30 bg-medium/10 px-3 py-2 text-xs text-medium">
              <TriangleAlert className="size-3.5 shrink-0" /> Agent name must be unique and cannot
              be changed after enrollment.
            </p>
            <MonoLabel className="block pt-2">Assignment group</MonoLabel>
            <Select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="[&_select]:font-mono"
            >
              {GROUPS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </Panel>
        </Step>

        <Step n={4} title="Install" last>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={ready ? 'primary' : 'secondary'}
              disabled={!ready}
              onClick={download}
              icon={<Download className="size-4" />}
              className="h-10"
            >
              Download configured installer
            </Button>
            {!ready && (
              <span className="text-xs text-muted">
                Please select a package and server address.
              </span>
            )}
          </div>
          <Panel className="max-w-xl bg-raised/40">
            <button
              type="button"
              onClick={() => setTerminalOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ink"
            >
              <span className="flex items-center gap-2">
                <SquareTerminal className="size-4" /> Install via terminal
              </span>
              <ChevronDown
                className={cn(
                  'size-4 text-muted transition-transform',
                  terminalOpen && 'rotate-180',
                )}
              />
            </button>
            {terminalOpen && (
              <div className="border-t border-line p-4">
                <div className="relative">
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded border border-line-strong bg-canvas p-3 pr-10 font-mono text-xs leading-5 text-ink">
                    {command}
                  </pre>
                  <button
                    type="button"
                    onClick={copy}
                    className="absolute right-2 top-2 text-muted hover:text-ink"
                    aria-label="Copy command"
                  >
                    {copied ? (
                      <Check className="size-4 text-success" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </Panel>
        </Step>
      </div>
    </Page>
  );
};
