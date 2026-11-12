import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs1793577600000 implements MigrationInterface {
  name = 'CreateAuditLogs1793577600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actor_user_id" uuid,
        "action" character varying(64) NOT NULL,
        "target_type" character varying(32),
        "target_id" uuid,
        "ip" character varying(45),
        "user_agent" character varying(512),
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_f160d97a931844109de9d04228" ON "audit_logs" ("actor_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2cd10fda8276bb995288acfbfb" ON "audit_logs" ("created_at")`,
    );

    await queryRunner.query(`
      CREATE FUNCTION "audit_logs_reject_change"() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'audit_logs is append-only (% rejected)', TG_OP;
      END;
      $$ LANGUAGE plpgsql`);
    await queryRunner.query(`
      CREATE TRIGGER "audit_logs_append_only"
      BEFORE UPDATE OR DELETE ON "audit_logs"
      FOR EACH ROW EXECUTE FUNCTION "audit_logs_reject_change"()`);
    await queryRunner.query(`
      CREATE TRIGGER "audit_logs_no_truncate"
      BEFORE TRUNCATE ON "audit_logs"
      FOR EACH STATEMENT EXECUTE FUNCTION "audit_logs_reject_change"()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP FUNCTION "audit_logs_reject_change"()`);
  }
}
