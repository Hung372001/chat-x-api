import { MigrationInterface, QueryRunner } from "typeorm";

export class SetNullableForDeleteMessageFromCol1694089437568 implements MigrationInterface {
    name = 'SetNullableForDeleteMessageFromCol1694089437568'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_chat_setting" ALTER COLUMN "deleteMessageFrom" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_chat_setting" ALTER COLUMN "deleteMessageFrom" SET NOT NULL`);
    }

}
