import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';

interface ICursorPagerProps {
  // 1 for the newest page. There is no total: the server pages by position, not by count.
  pageNumber: number;
  count: number;
  hasNewer: boolean;
  hasOlder: boolean;
  busy: boolean;
  onNewer: () => void;
  onOlder: () => void;
}

// Paging for a log read by keyset: you can step to the next older page or back, but not jump to
// "page 7", because page 7 has no stable start until you've walked through pages 1-6.
export const CursorPager: React.FC<ICursorPagerProps> = ({
  pageNumber,
  count,
  hasNewer,
  hasOlder,
  busy,
  onNewer,
  onOlder,
}) => (
  <nav
    aria-label="Audit log pages"
    className="flex items-center justify-between gap-3 border-t border-line p-3 font-mono text-[11px] text-muted"
  >
    <span aria-live="polite">
      Page {pageNumber} · {count} {count === 1 ? 'entry' : 'entries'}
    </span>
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        icon={<ChevronLeft className="size-3.5" />}
        disabled={!hasNewer || busy}
        onClick={onNewer}
      >
        Newer
      </Button>
      <Button size="sm" variant="outline" disabled={!hasOlder || busy} onClick={onOlder}>
        Older
        <ChevronRight className="size-3.5" />
      </Button>
    </div>
  </nav>
);
