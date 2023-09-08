import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateOwnGroupChatRelationship1694149890442 implements MigrationInterface {
    name = 'UpdateOwnGroupChatRelationship1694149890442'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_chat" DROP CONSTRAINT "FK_ec570a35157b8602c697b138f6e"`);
        await queryRunner.query(`ALTER TABLE "group_chat" DROP CONSTRAINT "UQ_ec570a35157b8602c697b138f6e"`);
        await queryRunner.query(`ALTER TABLE "group_chat" ADD CONSTRAINT "FK_ec570a35157b8602c697b138f6e" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_chat" DROP CONSTRAINT "FK_ec570a35157b8602c697b138f6e"`);
        await queryRunner.query(`ALTER TABLE "group_chat" ADD CONSTRAINT "UQ_ec570a35157b8602c697b138f6e" UNIQUE ("ownerId")`);
        await queryRunner.query(`ALTER TABLE "group_chat" ADD CONSTRAINT "FK_ec570a35157b8602c697b138f6e" FOREIGN KEY ("ownerId") REFERENCES "chat_message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
