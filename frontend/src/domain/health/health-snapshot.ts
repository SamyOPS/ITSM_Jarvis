export type HealthStatus = 'ok';

export interface HealthSnapshot {
  service: 'backend';
  status: HealthStatus;
}
