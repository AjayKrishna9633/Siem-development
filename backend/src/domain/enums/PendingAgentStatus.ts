// Set only by the API's sync job, from what the Wazuh manager reports.
export enum PendingAgentStatus {
  PENDING = 'pending',
  CONNECTED = 'connected',
  EXPIRED = 'expired',
}
