import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Cell, Pie, PieChart } from 'recharts';
import {
  Download,
  EllipsisVertical,
  Info,
  Laptop,
  Monitor,
  Plus,
  RefreshCw,
  Share2,
  SquareTerminal,
} from 'lucide-react';
import { Page, PageHeader } from '../../components/ui/PageHeader.tsx';
import { MonoLabel, Panel } from '../../components/ui/Panel.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Checkbox, SearchInput } from '../../components/ui/Form.tsx';
import { Tag } from '../../components/ui/Badge.tsx';
import { Table, THead, Th, Tr, Td, Pagination } from '../../components/ui/Table.tsx';
import { useAuthStore } from '../../store/auth.store.ts';
import { ADMIN_ROLES } from '../../lib/roles.ts';
import { cn } from '../../lib/cn.ts';
import { agents, type AgentStatus, type OsFamily } from '../../data/agents.ts';

const statusMeta: Record<AgentStatus, { label: string; color: string; text: string }> = {
  active: { label: 'Active', color: '#22c55e', text: 'text-[#22c55e]' },
  disconnected: { label: 'Disconnected', color: '#ef4444', text: 'text-critical' },
  pending: { label: 'Pending', color: '#f59e0b', text: 'text-[#f59e0b]' },
  never_connected: { label: 'Never connected', color: '#64748b', text: 'text-subtle' },
};

const osIcon: Record<OsFamily, React.ReactNode> = {
  windows: <Monitor className="size-3.5 text-low" />,
  linux: <SquareTerminal className="size-3.5 text-high" />,
  macos: <Laptop className="size-3.5 text-ink" />,
};

interface IDonutCardProps {
  title: string;
  center: React.ReactNode;
  data: { label: string; value: number; color: string }[];
}

const DonutCard: React.FC<IDonutCardProps> = ({ title, center, data }) => (
  <Panel className="flex items-center gap-6 p-5">
    <div className="relative size-[76px] shrink-0">
      <PieChart width={76} height={76}>
        <Pie
          data={data.filter((d) => d.value > 0)}
          dataKey="value"
          innerRadius={28}
          outerRadius={38}
          stroke="none"
          startAngle={90}
          endAngle={-270}
        >
          {data
            .filter((d) => d.value > 0)
            .map((d) => (
              <Cell key={d.label} fill={d.color} />
            ))}
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex items-center justify-center text-sm text-ink">
        {center}
      </div>
    </div>
    <div className="min-w-0 flex-1">
      <MonoLabel>{title}</MonoLabel>
      <ul className="mt-2 space-y-1.5 text-sm">
        {data.map((d) => (
          <li
            key={d.label}
            className={cn('flex items-center justify-between', d.value === 0 && 'text-subtle')}
          >
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: d.color }} /> {d.label}
            </span>
            <span className="font-mono">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  </Panel>
);

export const Agents: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canDeploy = !!user && ADMIN_ROLES.includes(user.role);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const rows = useMemo(
    () =>
      agents.filter((a) =>
        `${a.id} ${a.name} ${a.ip} ${a.os} ${a.groups.join(' ')}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [search],
  );

  const count = (s: AgentStatus) => agents.filter((a) => a.status === s).length;

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Environment' }, { label: 'Agents' }]}
        title={`Agents (${agents.length})`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <DonutCard
          title="Agents by status"
          center={agents.length}
          data={(['active', 'disconnected', 'pending', 'never_connected'] as const).map((s) => ({
            label: statusMeta[s].label,
            value: count(s),
            color: statusMeta[s].color,
          }))}
        />
        <DonutCard
          title="Top 5 OS"
          center={<Monitor className="size-4 text-muted" />}
          data={[
            { label: 'Windows 11', value: 2, color: '#3b82f6' },
            { label: 'Windows 10', value: 1, color: '#60a5fa' },
            { label: 'Ubuntu 22.04', value: 2, color: '#c084fc' },
            { label: 'macOS Sonoma', value: 2, color: '#94a3b8' },
          ]}
        />
        <DonutCard
          title="Top 5 groups"
          center={<Share2 className="size-4 text-muted" />}
          data={[
            { label: 'default', value: 5, color: '#0ea5e9' },
            { label: 'web-servers', value: 2, color: '#06b6d4' },
            { label: 'database-nodes', value: 1, color: '#14b8a6' },
          ]}
        />
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3">
          {canDeploy ? (
            <Button
              variant="primary"
              icon={<Plus className="size-4" />}
              onClick={() => navigate('/agents/deploy')}
            >
              Deploy new agent
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <SearchInput
              mono
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents or use DQL..."
              className="w-72"
              suffix={
                <span className="rounded-sm border border-line-strong px-1 font-mono text-[9px] text-muted">
                  DQL
                </span>
              }
            />
            <span className="h-6 w-px bg-line-strong" />
            <button type="button" className="text-muted hover:text-ink" aria-label="Refresh">
              <RefreshCw className="size-4" />
            </button>
            <button type="button" className="text-muted hover:text-ink" aria-label="Export">
              <Download className="size-4" />
            </button>
            <button type="button" className="text-muted hover:text-ink" aria-label="More">
              <EllipsisVertical className="size-4" />
            </button>
          </div>
        </div>
        <Table>
          <THead>
            <tr>
              <Th className="w-10">
                <Checkbox
                  checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                  onChange={(c) => setSelected(c ? new Set(rows.map((r) => r.id)) : new Set())}
                />
              </Th>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>IP address</Th>
              <Th>Group(s)</Th>
              <Th>Operating system</Th>
              <Th>Cluster node</Th>
              <Th>Version</Th>
              <Th>Status</Th>
            </tr>
          </THead>
          <tbody>
            {rows.map((a) => (
              <Tr key={a.id} selected={selected.has(a.id)}>
                <Td>
                  <Checkbox
                    checked={selected.has(a.id)}
                    onChange={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(a.id)) next.delete(a.id);
                        else next.add(a.id);
                        return next;
                      })
                    }
                  />
                </Td>
                <Td className="font-mono text-xs text-muted">{a.id}</Td>
                <Td>
                  <Link
                    to={`/agents/${a.id}`}
                    className="font-mono text-xs text-accent hover:underline"
                  >
                    {a.name}
                  </Link>
                </Td>
                <Td className="font-mono text-xs">{a.ip}</Td>
                <Td>
                  <div className="flex gap-1">
                    {a.groups.map((g) => (
                      <Tag key={g} className="normal-case">
                        {g}
                      </Tag>
                    ))}
                  </div>
                </Td>
                <Td>
                  <span className="flex items-center gap-2 text-xs">
                    {osIcon[a.osFamily]} {a.os}
                  </span>
                </Td>
                <Td className="text-xs text-muted">{a.node}</Td>
                <Td className="font-mono text-xs">{a.version}</Td>
                <Td>
                  <span
                    className={cn(
                      'flex items-center gap-1.5 font-mono text-[11px] uppercase',
                      statusMeta[a.status].text,
                    )}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: statusMeta[a.status].color }}
                    />
                    {statusMeta[a.status].label}
                    {a.status === 'active' && <Info className="size-3 text-subtle" />}
                  </span>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <Pagination
          page={page}
          pages={1}
          onChange={setPage}
          summary={`Showing 1 to ${rows.length} of ${agents.length} entries${selected.size ? ` (${selected.size} selected)` : ''}`}
        />
      </Panel>
    </Page>
  );
};
