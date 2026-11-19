import type { MigrationInterface, QueryRunner } from 'typeorm';

// API keys for POST /api/ingest. Only a SHA-256 hash of each key is stored (the key itself is
// shown once, when it's created); the prefix is kept in clear so admins can tell keys apart.
// A key is never deleted, only revoked, so the audit trail can always name it.
export class CreateIngestKeys1794009600000 implements MigrationInterface {
  name = 'CreateIngestKeys1794009600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
    // Every ingest request looks its key up by hash.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ingest_keys_key_hash" ON "ingest_keys" ("key_hash")`,
    );
    // The name becomes the Loki `source` label, so two live keys can't share one. A revoked
    // key's name can be used again.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ingest_keys_active_name" ON "ingest_keys" ("name") WHERE "revoked_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ingest_keys"`);
  }
}
