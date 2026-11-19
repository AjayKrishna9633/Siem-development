export interface IHealthStatus {
  healthy: boolean;
  database: boolean;
  redis: boolean;
}

export interface IHealthCheckService {
  check(): Promise<IHealthStatus>;
}
