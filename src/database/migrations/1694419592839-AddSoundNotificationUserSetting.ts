import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSoundNotificationUserSetting1694419592839 implements MigrationInterface {
    name = 'AddSoundNotificationUserSetting1694419592839'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "soundNotification" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "soundNotification"`);
    }

}
