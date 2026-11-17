import type { MigrationInterface, QueryRunner } from 'typeorm';

// Old action value -> new dot-notation value.
const RENAMED_ACTIONS: readonly (readonly [string, string])[] = [
  ['auth.login_succeeded', 'auth.login.success'],
  ['auth.login_failed', 'auth.login.failure'],
  ['auth.logged_out', 'auth.logout'],
  ['password.changed', 'auth.password.change'],
  ['password.reset_requested', 'auth.password.reset_request'],
  ['password.reset_completed', 'auth.password.reset'],
  ['setup.token_rejected', 'auth.setup_token.used'],
  ['setup.completed', 'system.setup.completed'],
  ['user.role_changed', 'user.role.change'],
  ['user.disabled', 'user.disable'],
  ['user.enabled', 'user.enable'],
  ['invite.created', 'user.invite.create'],
  ['invite.resent', 'user.invite.resend'],
  ['invite.revoked', 'user.invite.revoke'],
  ['invite.accepted', 'user.invite.accept'],
];

// CASE expression that maps old -> new ('forward') or new -> old ('reverse'). The values are
// the constants above, never user input.
const actionCase = (direction: 'forward' | 'reverse'): string => {
  const whens = RENAMED_ACTIONS.map(([oldName, newName]) =>
    direction === 'forward'
      ? `WHEN '${oldName}' THEN '${newName}'`
      : `WHEN '${newName}' THEN '${oldName}'`,
  );
  return `CASE "action" ${whens.join(' ')} ELSE "action" END`;
};

export class ExtendAuditLogs1793923200000 implements MigrationInterface {
  name = 'ExtendAuditLogs1793923200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The rows below are rewritten in place, which the append-only trigger forbids. This is the
    // one place the guarantee is lifted on purpose. DISABLE/ENABLE TRIGGER are transactional, so if
    // anything below fails the whole migration rolls back and the trigger is still armed.
    await queryRunner.query(`ALTER TABLE "audit_logs" DISABLE TRIGGER "audit_logs_append_only"`);

    await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "created_at" TO "occurred_at"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "actor_user_id" TO "actor_id"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "ip" TO "ip_address"`);
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
        ADD "actor_username" character varying(255),
        ADD "actor_role" character varying(32),
        ADD "category" character varying(16),
        ADD "outcome" character varying(16),
        ADD "target_label" character varying(255),
        ADD "request_id" character varying(128)`);
    // Targets will include agents and alerts whose ids are not UUIDs.
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "target_id" TYPE character varying(64) USING "target_id"::text`,
    );
    // Microsecond precision is kept on purpose; keyset cursors carry the exact value as text.
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "occurred_at" SET DEFAULT clock_timestamp()`,
    );

    // Backfill. Outcome is read from the OLD action names, so it must run before the rewrite.
    await queryRunner.query(`
      UPDATE "audit_logs"
         SET "outcome" = CASE WHEN "action" IN ('auth.login_failed', 'setup.token_rejected')
                              THEN 'failure' ELSE 'success' END`);
    await queryRunner.query(`UPDATE "audit_logs" SET "action" = ${actionCase('forward')}`);
    await queryRunner.query(`
      UPDATE "audit_logs"
         SET "category" = CASE split_part("action", '.', 1)
                            WHEN 'auth' THEN 'auth'
                            WHEN 'user' THEN 'user'
                            ELSE 'system' END`);
    await queryRunner.query(`
      UPDATE "audit_logs" a
         SET "actor_username" = COALESCE(u."username", u."email"),
             "actor_role" = u."role"::text
        FROM "users" u
       WHERE u."id" = a."actor_id"`);
    await queryRunner.query(`
      UPDATE "audit_logs" a
         SET "target_label" = COALESCE(a."metadata"->>'email', u."email")
        FROM "users" u
       WHERE a."target_type" = 'user' AND u."id"::text = a."target_id"`);
    await queryRunner.query(`
      UPDATE "audit_logs"
         SET "target_label" = "metadata"->>'email'
       WHERE "target_label" IS NULL AND "metadata" ? 'email'`);

    await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "category" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "outcome" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
        ADD CONSTRAINT "CHK_audit_logs_category"
          CHECK ("category" IN ('auth', 'user', 'system', 'agent', 'rule', 'alert')),
        ADD CONSTRAINT "CHK_audit_logs_outcome"
          CHECK ("outcome" IN ('success', 'failure', 'denied'))`);

    await queryRunner.query(`DROP INDEX "IDX_f160d97a931844109de9d04228"`);
    await queryRunner.query(`DROP INDEX "IDX_2cd10fda8276bb995288acfbfb"`);
    // `id` in the first index is the keyset tiebreaker for rows sharing one timestamp.
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_occurred_at" ON "audit_logs" ("occurred_at" DESC, "id" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_actor_occurred_at" ON "audit_logs" ("actor_id", "occurred_at" DESC)`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_category" ON "audit_logs" ("category")`);

    await queryRunner.query(`ALTER TABLE "audit_logs" ENABLE TRIGGER "audit_logs_append_only"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_logs" DISABLE TRIGGER "audit_logs_append_only"`);

    await queryRunner.query(`DROP INDEX "IDX_audit_logs_category"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_actor_occurred_at"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_occurred_at"`);

    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "CHK_audit_logs_outcome"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "CHK_audit_logs_category"`);

    // Actions introduced after this migration have no old name and are left as they are.
    await queryRunner.query(`UPDATE "audit_logs" SET "action" = ${actionCase('reverse')}`);

    await queryRunner.query(`
      ALTER TABLE "audit_logs"
        DROP COLUMN "request_id",
        DROP COLUMN "target_label",
        DROP COLUMN "outcome",
        DROP COLUMN "category",
        DROP COLUMN "actor_role",
        DROP COLUMN "actor_username"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "occurred_at" SET DEFAULT now()`,
    );
    // Fails if a non-UUID target id was written after the upgrade, which is the safe outcome.
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "target_id" TYPE uuid USING "target_id"::uuid`,
    );
    await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "ip_address" TO "ip"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "actor_id" TO "actor_user_id"`);
    await queryRunner.query(`ALTER TABLE "audit_logs" RENAME COLUMN "occurred_at" TO "created_at"`);

    await queryRunner.query(
      `CREATE INDEX "IDX_f160d97a931844109de9d04228" ON "audit_logs" ("actor_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2cd10fda8276bb995288acfbfb" ON "audit_logs" ("created_at")`,
    );

    await queryRunner.query(`ALTER TABLE "audit_logs" ENABLE TRIGGER "audit_logs_append_only"`);
  }
}
