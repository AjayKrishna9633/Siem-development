import axios from 'axios';
import { api, INLINE_ERRORS } from '@/services/api.ts';
import type { IApiResponse } from '@/types/auth.ts';
import { isUuid } from '@/utils/validation.ts';
import type { IAuditListParams, IAuditLog, IAuditPage, IAuditQuery } from '../types/audit.types.ts';

// The server answers a failed export with JSON, but with responseType 'blob' axios hands that JSON
// over as a Blob. Read it back so the admin sees "narrow the date range", not a generic failure.
const exportErrorMessage = async (err: unknown): Promise<string> => {
  const fallback = 'The export failed. Try again.';
  if (!axios.isAxiosError(err) || !err.response) return 'Cannot reach the SIEMple server.';
  const body: unknown = err.response.data;
  if (!(body instanceof Blob)) return fallback;
  try {
    const parsed = JSON.parse(await body.text()) as { message?: string };
    return parsed.message || fallback;
  } catch {
    return fallback;
  }
};

const filenameFrom = (header: unknown): string => {
  const match = typeof header === 'string' ? /filename="([^"]+)"/.exec(header) : null;
  return match?.[1] ?? 'audit-logs.csv';
};

export const auditService = {
  async list(params: IAuditListParams): Promise<IAuditPage> {
    const res = await api.get<IApiResponse<IAuditPage>>('/audit-logs', {
      ...INLINE_ERRORS,
      params,
    });
    return res.data.data;
  },

  async get(id: string): Promise<IAuditLog> {
    if (!isUuid(id)) throw new Error('Invalid audit log ID.');
    const res = await api.get<IApiResponse<IAuditLog>>(`/audit-logs/${id}`, INLINE_ERRORS);
    return res.data.data;
  },

  // The access token lives in memory and goes out as a header, so a plain link to the export URL
  // would arrive unauthenticated. Fetch it with the authenticated client and hand the browser the
  // bytes as a file. The whole file is held in memory first, which the server's row cap bounds.
  async exportCsv(query: IAuditQuery): Promise<string> {
    let res;
    try {
      res = await api.get<Blob>('/audit-logs/export', {
        ...INLINE_ERRORS,
        params: { ...query, format: 'csv' },
        responseType: 'blob',
      });
    } catch (err: unknown) {
      throw new Error(await exportErrorMessage(err), { cause: err });
    }

    const filename = filenameFrom(res.headers['content-disposition']);
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return filename;
  },
};
