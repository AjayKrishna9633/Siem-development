import React, { useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, CircleGauge, Clock, Filter } from 'lucide-react';
import { ModuleTabs } from '../../components/ui/PageHeader.tsx';
import { Panel } from '../../components/ui/Panel.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { SearchInput } from '../../components/ui/Form.tsx';
import { Table, THead, Th, Tr, Td, Pagination } from '../../components/ui/Table.tsx';
import { configTabs } from './configTabs.ts';

// Sample policy inventory until the ingest API lands
const policies = [
  {
    name: 'CIS Microsoft Windows 11 Enterprise Benchmark v3.0.0',
    description:
      'This document provides prescriptive guidance for establishing a secure configuration posture for Windows 11 Enterprise.',
    endScan: 'Aug 28, 2026 @ 12:16:04',
    passed: 124,
    failed: 349,
  },
  {
    name: 'Win Default Security',
    description: 'Baseline security policy shipped with the SIEMple agent for Windows endpoints.',
    endScan: 'Aug 28, 2026 @ 12:15:41',
    passed: 45,
    failed: 12,
  },
];

export const ConfigInventory: React.FC = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const rows = policies.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between border-b border-line px-6 py-3">
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/configuration" className="text-ink hover:text-accent">
            Configuration Assessment
          </Link>
          <ChevronRight className="size-4 text-muted" />
          <span className="rounded-sm bg-low/15 px-2 py-0.5 text-low">Ajaykrishna (005)</span>
        </nav>
        <CircleGauge className="size-4 text-muted" />
      </div>
      <div className="flex items-end justify-between border-b border-line px-6 pt-3">
        <ModuleTabs tabs={configTabs} className="border-b-0" />
        <span className="mb-2 inline-flex items-center gap-1.5 rounded border border-line-strong bg-raised px-2 py-1 text-xs text-muted">
          <Clock className="size-3" /> Agent: Ajaykrishna (005)
        </span>
      </div>

      <div className="space-y-4 p-6">
        <div className="flex gap-3">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search policies..."
            className="w-full max-w-sm"
          />
          <Button variant="secondary" icon={<Filter className="size-4" />}>
            Filters
          </Button>
        </div>
        <Panel className="bg-raised/40">
          <Table>
            <THead>
              <tr>
                <Th className="normal-case">Policy</Th>
                <Th className="normal-case">Description</Th>
                <Th className="normal-case">Passed / Failed</Th>
                <Th className="normal-case">End scan</Th>
              </tr>
            </THead>
            <tbody>
              {rows.map((p) => (
                <Tr key={p.name}>
                  <Td>
                    <Link to="/configuration/dashboard" className="font-medium hover:text-accent">
                      {p.name}
                    </Link>
                  </Td>
                  <Td className="max-w-md truncate text-muted">{p.description}</Td>
                  <Td className="font-mono text-xs">
                    <span className="text-success">{p.passed}</span> /{' '}
                    <span className="text-critical">{p.failed}</span>
                  </Td>
                  <Td className="whitespace-nowrap font-mono text-xs text-muted">{p.endScan}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="min-h-64" />
          <Pagination
            page={page}
            pages={1}
            onChange={setPage}
            summary={`Showing ${rows.length} of ${policies.length}`}
          />
        </Panel>
      </div>
    </div>
  );
};
