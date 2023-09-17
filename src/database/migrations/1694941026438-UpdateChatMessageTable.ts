import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateChatMessageTable1694941026438 implements MigrationInterface {
    name = 'UpdateChatMessageTable1694941026438'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" ADD "isFriendRequest" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "isFriendRequest"`);
    }

}
