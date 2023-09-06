import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateChatMessageTable1694010470312 implements MigrationInterface {
    name = 'UpdateChatMessageTable1694010470312'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "coverPhoto"`);
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "introduce"`);
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "unsend"`);
        await queryRunner.query(`ALTER TABLE "group_chat" ADD "ownerId" uuid`);
        await queryRunner.query(`ALTER TABLE "group_chat" ADD CONSTRAINT "UQ_ec570a35157b8602c697b138f6e" UNIQUE ("ownerId")`);
        await queryRunner.query(`ALTER TABLE "chat_message" ADD "unsent" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "chat_message" ADD "unsentById" uuid`);
        await queryRunner.query(`ALTER TABLE "chat_message" ADD CONSTRAINT "UQ_94c1bc2581e730fa962c4999630" UNIQUE ("unsentById")`);
        await queryRunner.query(`ALTER TABLE "chat_message" ADD "pinnedById" uuid`);
        await queryRunner.query(`ALTER TABLE "chat_message" ADD CONSTRAINT "UQ_11582a335dee96d7bfdcb601f1a" UNIQUE ("pinnedById")`);
        await queryRunner.query(`ALTER TABLE "group_chat" ADD CONSTRAINT "FK_ec570a35157b8602c697b138f6e" FOREIGN KEY ("ownerId") REFERENCES "chat_message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_message" ADD CONSTRAINT "FK_94c1bc2581e730fa962c4999630" FOREIGN KEY ("unsentById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_message" ADD CONSTRAINT "FK_11582a335dee96d7bfdcb601f1a" FOREIGN KEY ("pinnedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message" DROP CONSTRAINT "FK_11582a335dee96d7bfdcb601f1a"`);
        await queryRunner.query(`ALTER TABLE "chat_message" DROP CONSTRAINT "FK_94c1bc2581e730fa962c4999630"`);
        await queryRunner.query(`ALTER TABLE "group_chat" DROP CONSTRAINT "FK_ec570a35157b8602c697b138f6e"`);
        await queryRunner.query(`ALTER TABLE "chat_message" DROP CONSTRAINT "UQ_11582a335dee96d7bfdcb601f1a"`);
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "pinnedById"`);
        await queryRunner.query(`ALTER TABLE "chat_message" DROP CONSTRAINT "UQ_94c1bc2581e730fa962c4999630"`);
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "unsentById"`);
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "unsent"`);
        await queryRunner.query(`ALTER TABLE "group_chat" DROP CONSTRAINT "UQ_ec570a35157b8602c697b138f6e"`);
        await queryRunner.query(`ALTER TABLE "group_chat" DROP COLUMN "ownerId"`);
        await queryRunner.query(`ALTER TABLE "chat_message" ADD "unsend" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "profile" ADD "introduce" text`);
        await queryRunner.query(`ALTER TABLE "profile" ADD "coverPhoto" character varying`);
    }

}
