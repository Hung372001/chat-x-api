import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateGroupChatTable1694946428108 implements MigrationInterface {
    name = 'UpdateGroupChatTable1694946428108'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_chat" ADD "uniqueName" character varying`);
        await queryRunner.query(`ALTER TABLE "group_chat" ADD CONSTRAINT "UQ_2d7de95ef50e4a0a3c5a25b077d" UNIQUE ("uniqueName")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_chat" DROP CONSTRAINT "UQ_2d7de95ef50e4a0a3c5a25b077d"`);
        await queryRunner.query(`ALTER TABLE "group_chat" DROP COLUMN "uniqueName"`);
    }

}
