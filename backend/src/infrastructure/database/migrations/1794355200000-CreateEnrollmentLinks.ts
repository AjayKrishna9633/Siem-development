import type { MigrationInterface, QueryRunner } from 'typeorm';

// Tables for pre-registered agents and their one-time enrollment links, plus siemple_enroll: the
// role the enrollment service connects as. The role is created without LOGIN; the migrate step
// sets its password from ENROLL_DB_PASSWORD, so no password is ever part of a migration.
export class CreateEnrollmentLinks1794355200000 implements MigrationInterface {
  name = 'CreateEnrollmentLinks1794355200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."pending_agents_os_enum" AS ENUM('windows', 'linux-deb', 'linux-rpm')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."pending_agents_arch_enum" AS ENUM('x86_64', 'arm64')`,
    );
    await queryRunner.query(`
      CREATE TABLE "pending_agents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(64) NOT NULL,
        "group_name" character varying(64) NOT NULL,
        "os" "public"."pending_agents_os_enum" NOT NULL,
        "arch" "public"."pending_agents_arch_enum",
        "wazuh_agent_id" character varying(16) NOT NULL,
        "agent_key_ciphertext" text NOT NULL,
        "agent_key_iv" character varying(32) NOT NULL,
        "agent_key_auth_tag" character varying(32) NOT NULL,
        "key_version" smallint NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'pending',
        "connected_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_pending_agents_status" CHECK ("status" IN ('pending', 'connected', 'expired')),
        CONSTRAINT "PK_8cc082181c105bdb1529ba665d8" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_pending_agents_wazuh_agent_id" ON "pending_agents" ("wazuh_agent_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pending_agents_status_created_at" ON "pending_agents" ("status", "created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "enrollment_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pending_agent_id" uuid NOT NULL,
        "token_hash" character(64) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "used_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "REL_d78c6e70e028d521a76a47fa60" UNIQUE ("pending_agent_id"),
        CONSTRAINT "PK_d9b043a74d8643fde7e6b948591" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_enrollment_tokens_token_hash" ON "enrollment_tokens" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_enrollment_tokens_expires_at" ON "enrollment_tokens" ("expires_at")`,
    );
    await queryRunner.query(`
      ALTER TABLE "enrollment_tokens" ADD CONSTRAINT "FK_d78c6e70e028d521a76a47fa604"
        FOREIGN KEY ("pending_agent_id") REFERENCES "pending_agents"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION`);

    // Roles belong to the whole Postgres cluster, not one database, so another database on the
    // same server may have created it already. The attributes are reset either way.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'siemple_enroll') THEN
          CREATE ROLE siemple_enroll NOLOGIN;
        END IF;
      END
      $$`);
    await queryRunner.query(
      `ALTER ROLE siemple_enroll NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT CONNECTION LIMIT 20`,
    );
    await queryRunner.query(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM siemple_enroll`);
    await queryRunner.query(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM siemple_enroll`);
    await queryRunner.query(`GRANT USAGE ON SCHEMA public TO siemple_enroll`);
    await queryRunner.query(`GRANT SELECT ON "pending_agents" TO siemple_enroll`);
    await queryRunner.query(`GRANT SELECT ON "enrollment_tokens" TO siemple_enroll`);
    await queryRunner.query(`GRANT UPDATE ("used_at") ON "enrollment_tokens" TO siemple_enroll`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The role stays: another database in the cluster may still use it. Dropping the tables
    // removes its table grants; only the schema grant is left to take back.
    await queryRunner.query(`REVOKE USAGE ON SCHEMA public FROM siemple_enroll`);
    await queryRunner.query(
      `ALTER TABLE "enrollment_tokens" DROP CONSTRAINT "FK_d78c6e70e028d521a76a47fa604"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_enrollment_tokens_expires_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_enrollment_tokens_token_hash"`);
    await queryRunner.query(`DROP TABLE "enrollment_tokens"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_pending_agents_status_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_pending_agents_wazuh_agent_id"`);
    await queryRunner.query(`DROP TABLE "pending_agents"`);
    await queryRunner.query(`DROP TYPE "public"."pending_agents_arch_enum"`);
    await queryRunner.query(`DROP TYPE "public"."pending_agents_os_enum"`);
  }
}
