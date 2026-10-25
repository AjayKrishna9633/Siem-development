import { api } from './api.ts';
import type { IApiResponse } from '../types/auth.ts';
import type { IActivationGrant, ICompany, ICompanyWithActivation } from '../types/company.ts';
import { isUuid } from '../lib/validation.ts';

// A bad ID never reaches the API: the request fails here with a clear message
const companyPath = (companyId: string, suffix = '') => {
  if (!isUuid(companyId)) throw new Error('Invalid company ID.');
  return `/companies/${companyId}${suffix}`;
};

// Platform-level company management — super admin only
export const companyService = {
  async list(): Promise<ICompany[]> {
    const res = await api.get<IApiResponse<ICompany[]>>('/companies');
    return res.data.data;
  },

  async create(data: {
    name: string;
    adminName: string;
    adminEmail: string;
  }): Promise<ICompanyWithActivation> {
    const res = await api.post<IApiResponse<ICompanyWithActivation>>('/companies', data);
    return res.data.data;
  },

  async rename(companyId: string, name: string): Promise<ICompany> {
    const res = await api.patch<IApiResponse<ICompany>>(companyPath(companyId), { name });
    return res.data.data;
  },

  // The current admin is disabled and signed out; the new one gets a fresh activation
  async replaceAdmin(
    companyId: string,
    data: { adminName: string; adminEmail: string },
  ): Promise<ICompanyWithActivation> {
    const res = await api.put<IApiResponse<ICompanyWithActivation>>(
      companyPath(companyId, '/admin'),
      data,
    );
    return res.data.data;
  },

  async deactivate(companyId: string): Promise<ICompany> {
    const res = await api.post<IApiResponse<ICompany>>(companyPath(companyId, '/deactivate'));
    return res.data.data;
  },

  async reactivate(companyId: string): Promise<ICompany> {
    const res = await api.post<IApiResponse<ICompany>>(companyPath(companyId, '/reactivate'));
    return res.data.data;
  },

  async resendAdminActivation(companyId: string): Promise<IActivationGrant> {
    const res = await api.post<IApiResponse<IActivationGrant>>(
      companyPath(companyId, '/admin/activation'),
    );
    return res.data.data;
  },
};
