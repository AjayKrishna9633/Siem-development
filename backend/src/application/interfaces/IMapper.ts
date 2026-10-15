export interface IMapper<TDomain, TPersistence> {
  toDomain(raw: TPersistence): TDomain;
  toPersistence(domain: TDomain): TPersistence;
}
