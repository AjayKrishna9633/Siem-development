import type { MigrationInterface, QueryRunner } from 'typeorm';

// The agent version is resolved by the API when a link is made, so the enrollment service can build
// the install script without ever calling Wazuh.
//
// siemple_enroll's SELECT on pending_agents also becomes column by column: it gets only what the
// page, the script and the status need, and nothing else (no group, Wazuh id or timestamps). A
// column added later isn't readable by it unless a migration grants it.
const ENROLL_READABLE_COLUMNS = [
  'id',
  'name',
  'os',
  'arch',
  'agent_version',
  'agent_key_ciphertext',
  'agent_key_iv',
  'agent_key_auth_tag',
  'key_version',
  'status',
];

export class AddPendingAgentVersion1794441600000 implements MigrationInterface {
  name = 'AddPendingAgentVersion1794441600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rows from before this column (development databases only) get the default Wazuh version.
    await queryRunner.query(
      `ALTER TABLE "pending_agents" ADD "agent_version" character varying(32) NOT NULL DEFAULT '4.14.10'`,
    );
    await queryRunner.query(
      `ALTER TABLE "pending_agents" ALTER COLUMN "agent_version" DROP DEFAULT`,
    );

    await queryRunner.query(`REVOKE SELECT ON "pending_agents" FROM siemple_enroll`);
    const columns = ENROLL_READABLE_COLUMNS.map((c) => `"${c}"`).join(', ');
    await queryRunner.query(`GRANT SELECT (${columns}) ON "pending_agents" TO siemple_enroll`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns = ENROLL_READABLE_COLUMNS.map((c) => `"${c}"`).join(', ');
    await queryRunner.query(`REVOKE SELECT (${columns}) ON "pending_agents" FROM siemple_enroll`);
    await queryRunner.query(`GRANT SELECT ON "pending_agents" TO siemple_enroll`);
    await queryRunner.query(`ALTER TABLE "pending_agents" DROP COLUMN "agent_version"`);
  }
}
