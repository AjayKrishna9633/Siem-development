import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Baseline1793404800000 implements MigrationInterface {
  name = 'Baseline1793404800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('super_admin', 'org_admin', 'analyst')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('invited', 'active', 'disabled')`,
    );
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid,
        "email" character varying NOT NULL,
        "username" character varying NOT NULL,
        "password_hash" character varying,
        "role" "public"."users_role_enum" NOT NULL,
        "status" "public"."users_status_enum" NOT NULL DEFAULT 'invited',
        "is_email_verified" boolean NOT NULL DEFAULT false,
        "token_version" integer NOT NULL DEFAULT 0,
        "failed_login_attempts" integer NOT NULL DEFAULT 0,
        "locked_until" TIMESTAMP WITH TIME ZONE,
        "password_changed_at" TIMESTAMP WITH TIME ZONE,
        "last_login_at" TIMESTAMP WITH TIME ZONE,
        "last_login_ip" character varying(45),
        "invited_by_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_21a659804ed7bf61eb91688dea" ON "users" ("organization_id")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."companies_status_enum" AS ENUM('active', 'deactivated')`,
    );
    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "status" "public"."companies_status_enum" NOT NULL DEFAULT 'active',
        "admin_user_id" uuid,
        "created_by_id" uuid,
        "deactivated_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3dacbb3eb4f095e29372ff8e13" ON "companies" ("name")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_3dacbb3eb4f095e29372ff8e13"`);
    await queryRunner.query(`DROP TABLE "companies"`);
    await queryRunner.query(`DROP TYPE "public"."companies_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_21a659804ed7bf61eb91688dea"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
