import { useState } from 'react';

export interface IPaging {
  page: number;
  pages: number;
  from: number;
  to: number;
  total: number;
  setPage: (page: number) => void;
}

export const usePaged = <T>(items: T[], pageSize = 10) => {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;

  const paging: IPaging = {
    page: current,
    pages,
    from: items.length ? start + 1 : 0,
    to: Math.min(start + pageSize, items.length),
    total: items.length,
    setPage,
  };

  return { visible: items.slice(start, start + pageSize), paging };
};
