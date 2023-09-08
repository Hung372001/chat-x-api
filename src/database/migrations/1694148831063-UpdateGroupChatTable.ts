import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateGroupChatTable1694148831063 implements MigrationInterface {
    name = 'UpdateGroupChatTable1694148831063'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_chat" DROP COLUMN "canAddFriend"`);
        await queryRunner.query(`ALTER TABLE "group_chat" DROP COLUMN "canChat"`);
        await queryRunner.query(`ALTER TABLE "group_chat" ADD "canAddFriends" boolean DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "group_chat" ADD "enabledChat" boolean DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_chat" DROP COLUMN "enabledChat"`);
        await queryRunner.query(`ALTER TABLE "group_chat" DROP COLUMN "canAddFriends"`);
        await queryRunner.query(`ALTER TABLE "group_chat" ADD "canChat" boolean DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "group_chat" ADD "canAddFriend" boolean DEFAULT true`);
    }

}
