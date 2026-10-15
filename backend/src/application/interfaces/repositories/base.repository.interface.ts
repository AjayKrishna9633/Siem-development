export interface IBaseRepository<TDomain> {
  findById(id: string): Promise<TDomain | null>;
  save(entity: TDomain): Promise<void>;
  delete(id: string): Promise<boolean>;
}
