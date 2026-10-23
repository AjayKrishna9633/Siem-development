import React from 'react';
import { Link } from 'react-router';
import { HubLayout } from '../components/ui/Hub.tsx';
import { MonoLabel, Panel } from '../components/ui/Panel.tsx';

const topics = [
  {
    title: 'Triage an alert',
    body: 'Open Alerts, pick an event from the queue, review the entity overview, then hand it to the AI assistant for context.',
    to: '/alerts',
  },
  {
    title: 'Hunt across raw events',
    body: 'Use the DQL bar in Threat Hunting → Events or the Log Explorer. Field chips narrow results; click a row to see the full document.',
    to: '/threat-hunting/events',
  },
  {
    title: 'Map activity to ATT&CK',
    body: 'The Framework view colors each technique by its highest observed severity. Click a cell to jump to its events.',
    to: '/mitre/framework',
  },
  {
    title: 'Enroll an endpoint',
    body: 'Admins can generate an installer from Agents → Deploy. Pick the package, enter the manager address, and run the command.',
    to: '/agents/deploy',
  },
];

const shortcuts = [
  ['Global search', 'Type in the top bar and press Enter to search the Log Explorer'],
  ['Expand sidebar', 'Use the ‹ / › button in the top bar to show labels next to icons'],
  ['Demo personas', 'Switch roles from the avatar menu to preview what each role can see'],
];

export const Help: React.FC = () => (
  <HubLayout
    title="Help & Documentation"
    description="Quick orientation for the SIEMple console. Each guide links to the screen it describes."
  >
    <div className="grid gap-4 md:grid-cols-2">
      {topics.map((t) => (
        <Link
          key={t.title}
          to={t.to}
          className="rounded-md border border-line-strong/70 bg-raised/60 p-5 transition-colors hover:border-accent/50"
        >
          <h2 className="font-semibold text-ink">{t.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{t.body}</p>
        </Link>
      ))}
    </div>
    <Panel className="mt-8 p-5">
      <MonoLabel>Console tips</MonoLabel>
      <dl className="mt-3 divide-y divide-line">
        {shortcuts.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-2.5 text-sm sm:grid-cols-[180px_1fr]">
            <dt className="text-ink">{k}</dt>
            <dd className="text-muted">{v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  </HubLayout>
);
