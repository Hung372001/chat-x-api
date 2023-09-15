import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateNotificationTable1694760239485 implements MigrationInterface {
    name = 'UpdateNotificationTable1694760239485'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" ADD "data" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification" DROP COLUMN "data"`);
    }

}
