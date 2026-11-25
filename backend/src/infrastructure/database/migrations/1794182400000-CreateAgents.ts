import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAgents1794182400000 implements MigrationInterface {
  name = 'CreateAgents1794182400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "agents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "wazuh_id" character varying(16) NOT NULL,
        "name" character varying(128) NOT NULL,
        "ip" character varying(64),
        "status" character varying(32) NOT NULL,
        "os_name" character varying(128),
        "os_platform" character varying(64),
        "os_version" character varying(64),
        "version" character varying(64),
        "groups" text array NOT NULL DEFAULT '{}',
        "registered_at" TIMESTAMP WITH TIME ZONE,
        "last_keepalive_at" TIMESTAMP WITH TIME ZONE,
        "removed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_agents_wazuh_id" ON "agents" ("wazuh_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_agents_wazuh_id"`);
    await queryRunner.query(`DROP TABLE "agents"`);
  }
}
