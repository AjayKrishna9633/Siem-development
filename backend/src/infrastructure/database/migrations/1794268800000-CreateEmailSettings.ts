import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailSettings1794268800000 implements MigrationInterface {
  name = 'CreateEmailSettings1794268800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "email_settings" (
        "id" smallint NOT NULL DEFAULT '1',
        "host" character varying(253),
        "port" integer,
        "security" character varying(16) NOT NULL DEFAULT 'starttls',
        "username" character varying(320),
        "password_ciphertext" text,
        "password_iv" character varying(32),
        "password_auth_tag" character varying(32),
        "key_version" smallint,
        "from_address" character varying(320),
        "from_name" character varying(120),
        "enabled" boolean NOT NULL DEFAULT false,
        "last_test_at" TIMESTAMP WITH TIME ZONE,
        "last_test_ok" boolean,
        "last_test_error" character varying(200),
        "updated_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_email_settings_port" CHECK ("port" BETWEEN 1 AND 65535),
        CONSTRAINT "CHK_email_settings_security" CHECK ("security" IN ('none', 'starttls', 'tls')),
        CONSTRAINT "CHK_email_settings_single_row" CHECK ("id" = 1),
        CONSTRAINT "PK_d363efbb6aa1c747440c0ec24f4" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`
      ALTER TABLE "email_settings" ADD CONSTRAINT "FK_f7b0d24761a681bcd87b084a405"
        FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`INSERT INTO "email_settings" ("id") VALUES (1)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_settings" DROP CONSTRAINT "FK_f7b0d24761a681bcd87b084a405"`,
    );
    await queryRunner.query(`DROP TABLE "email_settings"`);
  }
}
