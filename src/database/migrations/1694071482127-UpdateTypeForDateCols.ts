import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTypeForDateCols1694071482127 implements MigrationInterface {
  name = 'UpdateTypeForDateCols1694071482127';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roll_call" ALTER "created_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" ALTER "created_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" ALTER "updated_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_token" ALTER "created_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_token" ALTER "updated_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_request" ALTER "created_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_request" ALTER "updated_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat" ALTER "created_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat" ALTER "updated_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_member" ALTER "created_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_member" ALTER "updated_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ALTER "created_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ALTER "updated_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile" ALTER "created_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile" ALTER "updated_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ALTER "created_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ALTER "updated_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "upload_file" ALTER "created_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "upload_file" ALTER "updated_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER "created_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER "updated_at" TYPE timestamptz USING created_at AT TIME ZONE 'UTC'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roll_call" ALTER "created_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" ALTER "created_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" ALTER "updated_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_token" ALTER "created_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_token" ALTER "updated_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_request" ALTER "created_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_request" ALTER "updated_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat" ALTER "created_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat" ALTER "updated_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_member" ALTER "created_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_member" ALTER "updated_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ALTER "created_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ALTER "updated_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile" ALTER "created_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile" ALTER "updated_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ALTER "created_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ALTER "updated_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "upload_file" ALTER "created_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "upload_file" ALTER "updated_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER "created_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER "updated_at" TYPE TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone`,
    );
  }
}
