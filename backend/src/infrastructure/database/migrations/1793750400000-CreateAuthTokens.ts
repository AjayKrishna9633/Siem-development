import type { MigrationInterface, QueryRunner } from 'typeorm';

// Single-use links for invitations and password resets, replacing the activation
// records that lived in Redis (and vanished whenever Redis was down or restarted).
// Invited people now choose their own name on acceptance, so username may be null.
export class CreateAuthTokens1793750400000 implements MigrationInterface {
  name = 'CreateAuthTokens1793750400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."auth_tokens_type_enum" AS ENUM('invite', 'reset')`,
    );
    await queryRunner.query(`
      CREATE TABLE "auth_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" "public"."auth_tokens_type_enum" NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "used_at" TIMESTAMP WITH TIME ZONE,
        "created_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_41e9ddfbb32da18c4e85e45c2fd" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3a94cfa1eada85ac2bf6f3016b" ON "auth_tokens" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0cd716c9b774a8567df871feb4" ON "auth_tokens" ("user_id", "type")`,
    );
    await queryRunner.query(`
      ALTER TABLE "auth_tokens" ADD CONSTRAINT "FK_9691367d446cd8b18f462c191b3"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Invited people who never chose a name get their email, so NOT NULL can return
    await queryRunner.query(`UPDATE "users" SET "username" = "email" WHERE "username" IS NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL`);

    await queryRunner.query(`DROP TABLE "auth_tokens"`);
    await queryRunner.query(`DROP TYPE "public"."auth_tokens_type_enum"`);
  }
}
