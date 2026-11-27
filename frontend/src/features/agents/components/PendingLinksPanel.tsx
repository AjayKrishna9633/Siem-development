import React, { useCallback, useEffect, useState } from 'react';
import { Link2, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Panel } from '@/components/ui/Panel.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { StatusBadge } from '@/components/ui/Badge.tsx';
import { Table, THead, Th, Tr, Td } from '@/components/ui/Table.tsx';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog.tsx';
import { Modal } from '@/components/ui/Modal.tsx';
import { useRemote } from '@/hooks/useRemote.ts';
import { apiErrorMessage } from '@/lib/errors.ts';
import { agentsService } from '../api/agentsApi.ts';
import { OS_OPTIONS, PENDING_LINKS_REFRESH_MS } from '../constants/enrollment.ts';
import { formatLocal, formatRelative } from '../utils/linkMessage.ts';
import { CreatedLinkPanel } from './CreatedLinkPanel.tsx';
import type { ICreatedEnrollmentLink, IEnrollmentLink } from '../types/agent.types.ts';

const osLabel = (os: IEnrollmentLink['os']) => OS_OPTIONS.find((o) => o.value === os)?.label ?? os;

// Refreshes on a timer, but only while the tab is visible, and at once when it becomes visible.
const useVisibleInterval = (callback: () => void, ms: number) => {
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') callback();
    };
    const timer = setInterval(tick, ms);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [callback, ms]);
};

const LinkStatus: React.FC<{ link: IEnrollmentLink; now: Date }> = ({ link, now }) => {
  if (new Date(link.expiresAt) <= now) return <StatusBadge tone="neutral">Expired</StatusBadge>;
  if (link.scriptDownloadedAt) return <StatusBadge tone="info">Waiting for agent</StatusBadge>;
  return <StatusBadge tone="warning">Not opened yet</StatusBadge>;
};

// Pending links for admins: who still has to install, and the means to revoke or reissue.
export const PendingLinksPanel: React.FC = () => {
  const fetchLinks = useCallback(() => agentsService.listLinks(), []);
  const { data, loading, error, reload } = useRemote(fetchLinks, 'Failed to load pending links.');
  useVisibleInterval(reload, PENDING_LINKS_REFRESH_MS);
  const [revoking, setRevoking] = useState<IEnrollmentLink | null>(null);
  const [reissued, setReissued] = useState<ICreatedEnrollmentLink | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const links = data ?? [];
  const now = new Date();

  const revoke = async (link: IEnrollmentLink) => {
    try {
      await agentsService.revokeLink(link.id);
      toast.success(`Revoked the link for ${link.name}.`);
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'Could not revoke the link.'));
    } finally {
      setRevoking(null);
      reload();
    }
  };

  const reissue = async (link: IEnrollmentLink) => {
    setBusyId(link.id);
    try {
      setReissued(await agentsService.reissueLink(link.id));
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'Could not reissue the link.'));
    } finally {
      setBusyId(null);
      reload();
    }
  };

  return (
    <section aria-labelledby="pending-links-heading" className="space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="size-4 text-muted" />
        <h2 id="pending-links-heading" className="text-sm font-medium text-ink">
          Pending links
        </h2>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded border border-high/40 bg-high/10 px-3 py-2 text-sm text-high"
        >
          {error}
        </p>
      )}

      {!loading && !error && links.length === 0 ? (
        <p className="text-sm text-muted">No links are waiting for an install.</p>
      ) : (
        <Panel className="overflow-x-auto">
          <Table aria-label="Pending links">
            <THead>
              <Tr>
                <Th>Name</Th>
                <Th>Group</Th>
                <Th>OS</Th>
                <Th>Expires</Th>
                <Th>Script</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </THead>
            <tbody>
              {links.map((link) => (
                <Tr key={link.id}>
                  <Td className="font-medium text-ink">{link.name}</Td>
                  <Td>{link.group}</Td>
                  <Td>{osLabel(link.os)}</Td>
                  <Td>
                    <time dateTime={link.expiresAt} title={formatLocal(link.expiresAt)}>
                      {formatRelative(link.expiresAt, now)}
                    </time>
                  </Td>
                  <Td>{link.scriptDownloadedAt ? 'Downloaded' : 'Not downloaded'}</Td>
                  <Td>
                    <LinkStatus link={link} now={now} />
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        size="sm"
                        icon={<RotateCcw className="size-3.5" />}
                        onClick={() => void reissue(link)}
                        disabled={busyId === link.id}
                        aria-label={`Reissue the link for ${link.name}`}
                      >
                        Reissue
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={<Trash2 className="size-3.5" />}
                        onClick={() => setRevoking(link)}
                        aria-label={`Revoke the link for ${link.name}`}
                      >
                        Revoke
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      )}

      {revoking && (
        <ConfirmDialog
          title={`Revoke the link for ${revoking.name}?`}
          confirmLabel="Revoke link"
          onConfirm={() => revoke(revoking)}
          onCancel={() => setRevoking(null)}
        >
          <p>
            The link stops working and the agent{' '}
            <strong className="text-ink">{revoking.name}</strong> is removed from Wazuh, so a script
            that was already downloaded can't connect either.
          </p>
        </ConfirmDialog>
      )}

      {reissued && (
        <Modal title={`New link for ${reissued.name}`} onClose={() => setReissued(null)}>
          <CreatedLinkPanel link={reissued} />
          <div className="mt-6 flex justify-end border-t border-line pt-4">
            <Button variant="primary" onClick={() => setReissued(null)}>
              Done
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
};
