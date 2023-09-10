import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHidingGroupChatSetting1694326016337 implements MigrationInterface {
    name = 'AddHidingGroupChatSetting1694326016337'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_chat_setting" ADD "hiding" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_chat_setting" DROP COLUMN "hiding"`);
    }

}
