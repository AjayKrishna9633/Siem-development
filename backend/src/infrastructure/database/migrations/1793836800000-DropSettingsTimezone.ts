import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSettingsTimezone1793836800000 implements MigrationInterface {
  name = 'DropSettingsTimezone1793836800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "system_settings" DROP COLUMN "timezone"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "system_settings" ADD "timezone" character varying(64)`);
  }
}
