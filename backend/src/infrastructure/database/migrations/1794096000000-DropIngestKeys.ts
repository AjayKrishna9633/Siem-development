import type { MigrationInterface, QueryRunner } from 'typeorm';

// POST /api/ingest and its keys were removed: security events will come from Wazuh agents
// through their own pipeline, and SIEMple's own logs are collected from its containers by Alloy.
// Dropping the table also drops its indexes and foreign keys. `down` recreates it exactly as
// CreateIngestKeys1794009600000 did, empty.
export class DropIngestKeys1794096000000 implements MigrationInterface {
  name = 'DropIngestKeys1794096000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ingest_keys"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ingest_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(64) NOT NULL,
        "key_prefix" character varying(16) NOT NULL,
        "key_hash" character varying(64) NOT NULL,
        "created_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "last_used_at" TIMESTAMP WITH TIME ZONE,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "revoked_by" uuid,
        CONSTRAINT "PK_ingest_keys" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ingest_keys_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_ingest_keys_revoked_by" FOREIGN KEY ("revoked_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ingest_keys_key_hash" ON "ingest_keys" ("key_hash")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ingest_keys_active_name" ON "ingest_keys" ("name") WHERE "revoked_at" IS NULL`,
    );
  }
}
