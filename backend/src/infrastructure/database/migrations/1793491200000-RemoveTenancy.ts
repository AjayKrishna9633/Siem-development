import type { MigrationInterface, QueryRunner } from 'typeorm';

// Single-tenant: one install is one organization, so companies and users.organization_id
// go, and the roles become admin / t2_analyst / t1_analyst.
//
// Existing users are deleted rather than mapped: the multi-tenant accounts (several
// companies' admins, a platform super admin) have no meaningful place in one
// organization, and the first admin is now created through the setup flow.
export class RemoveTenancy1793491200000 implements MigrationInterface {
  name = 'RemoveTenancy1793491200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "users"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_21a659804ed7bf61eb91688dea"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "organization_id"`);

    await queryRunner.query(`DROP INDEX "public"."IDX_3dacbb3eb4f095e29372ff8e13"`);
    await queryRunner.query(`DROP TABLE "companies"`);
    await queryRunner.query(`DROP TYPE "public"."companies_status_enum"`);

    // Postgres can't remove values from an enum, so the type is replaced. The table is
    // empty at this point, so the cast never meets an old value.
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 't2_analyst', 't1_analyst')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::text::"public"."users_role_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
  }

  // Restores the multi-tenant schema. Lossy by nature: deleted users and companies
  // can't come back, and remaining users are mapped admin -> org_admin,
  // t1/t2 -> analyst with no company.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('super_admin', 'org_admin', 'analyst')`,
    );
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum"
      USING (CASE "role"::text WHEN 'admin' THEN 'org_admin' ELSE 'analyst' END)::"public"."users_role_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);

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

    await queryRunner.query(`ALTER TABLE "users" ADD "organization_id" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_21a659804ed7bf61eb91688dea" ON "users" ("organization_id")`,
    );
  }
}
