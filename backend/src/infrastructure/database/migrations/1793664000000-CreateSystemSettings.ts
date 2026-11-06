import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSystemSettings1793664000000 implements MigrationInterface {
  name = 'CreateSystemSettings1793664000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "system_settings" (
        "id" smallint NOT NULL DEFAULT '1',
        "setup_completed" boolean NOT NULL DEFAULT false,
        "setup_token_hash" character varying(64),
        "setup_token_expires_at" TIMESTAMP WITH TIME ZONE,
        "org_name" character varying(150),
        "base_url" character varying(2048),
        "timezone" character varying(64),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_system_settings_single_row" CHECK ("id" = 1),
        CONSTRAINT "PK_82521f08790d248b2a80cc85d40" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`INSERT INTO "system_settings" ("id") VALUES (1)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "system_settings"`);
  }
}
