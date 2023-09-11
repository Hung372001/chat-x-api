import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSoundNotificationDefault1694451471693 implements MigrationInterface {
    name = 'UpdateSoundNotificationDefault1694451471693'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."notification_type_enum" RENAME TO "notification_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notification_type_enum" AS ENUM('NORMAL', 'UNREAD_MESSAGE', 'NEW_FRIEND_REQUEST', 'ACCEPT_FRIEND_REQUEST')`);
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "type" TYPE "public"."notification_type_enum" USING "type"::"text"::"public"."notification_type_enum"`);
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "type" SET DEFAULT 'NORMAL'`);
        await queryRunner.query(`DROP TYPE "public"."notification_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "soundNotification" SET DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "soundNotification" SET DEFAULT false`);
        await queryRunner.query(`CREATE TYPE "public"."notification_type_enum_old" AS ENUM('NORMAL', 'UNREAD_MESSAGE')`);
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "type" TYPE "public"."notification_type_enum_old" USING "type"::"text"::"public"."notification_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "type" SET DEFAULT 'NORMAL'`);
        await queryRunner.query(`DROP TYPE "public"."notification_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notification_type_enum_old" RENAME TO "notification_type_enum"`);
    }

}
