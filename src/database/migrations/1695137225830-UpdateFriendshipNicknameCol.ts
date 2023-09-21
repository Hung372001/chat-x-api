import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateFriendshipNicknameCol1695137225830 implements MigrationInterface {
    name = 'UpdateFriendshipNicknameCol1695137225830'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "friendship" DROP CONSTRAINT "UQ_12f4b75a62a54bbe2dd387e12c3"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "friendship" ADD CONSTRAINT "UQ_12f4b75a62a54bbe2dd387e12c3" UNIQUE ("nickname")`);
    }

}
