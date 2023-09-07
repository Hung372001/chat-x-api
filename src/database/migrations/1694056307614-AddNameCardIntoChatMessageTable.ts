import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNameCardIntoChatMessageTable1694056307614 implements MigrationInterface {
    name = 'AddNameCardIntoChatMessageTable1694056307614'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" ADD "nameCardId" uuid`);
        await queryRunner.query(`ALTER TABLE "chat_message" ADD CONSTRAINT "UQ_fa2e774a231e4feac66088382f0" UNIQUE ("nameCardId")`);
        await queryRunner.query(`ALTER TABLE "chat_message" ADD CONSTRAINT "FK_fa2e774a231e4feac66088382f0" FOREIGN KEY ("nameCardId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" DROP CONSTRAINT "FK_fa2e774a231e4feac66088382f0"`);
        await queryRunner.query(`ALTER TABLE "chat_message" DROP CONSTRAINT "UQ_fa2e774a231e4feac66088382f0"`);
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "nameCardId"`);
    }

}
