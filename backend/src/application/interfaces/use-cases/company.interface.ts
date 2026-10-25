import type {
  ICompanySummary,
  ICompanyWithActivation,
  ICreateCompanyInput,
  IActor,
  IReplaceCompanyAdminInput,
  IResendAdminActivationInput,
  ISetCompanyStatusInput,
  IUpdateCompanyInput,
} from '../../types/use-case/company.types.ts';
import type { IActivationGrant } from '../services/activation.service.interface.ts';

export interface ICreateCompanyUseCase {
  execute(input: ICreateCompanyInput): Promise<ICompanyWithActivation>;
}

export interface IListCompaniesUseCase {
  execute(input: { actor: IActor }): Promise<ICompanySummary[]>;
}

export interface IUpdateCompanyUseCase {
  execute(input: IUpdateCompanyInput): Promise<ICompanySummary>;
}

export interface ISetCompanyStatusUseCase {
  execute(input: ISetCompanyStatusInput): Promise<ICompanySummary>;
}

export interface IReplaceCompanyAdminUseCase {
  execute(input: IReplaceCompanyAdminInput): Promise<ICompanyWithActivation>;
}

export interface IResendAdminActivationUseCase {
  execute(input: IResendAdminActivationInput): Promise<IActivationGrant>;
}
