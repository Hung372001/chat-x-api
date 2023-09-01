import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationTable1693556099984 implements MigrationInterface {
    name = 'AddNotificationTable1693556099984'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "upload_file" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "url" character varying NOT NULL, "key" character varying NOT NULL, "ownerId" uuid, CONSTRAINT "PK_17afec80fc97979415eae19aee0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."fcm_token_devicetype_enum" AS ENUM('WEBSITE', 'ANDROID', 'IOS')`);
        await queryRunner.query(`CREATE TABLE "fcm_token" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "deviceToken" character varying NOT NULL, "deviceType" "public"."fcm_token_devicetype_enum" NOT NULL DEFAULT 'WEBSITE', "userId" uuid, CONSTRAINT "PK_ec8f7ff07f44545126442edd9e7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notification_type_enum" AS ENUM('NORMAL')`);
        await queryRunner.query(`CREATE TABLE "notification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "title" character varying NOT NULL, "content" text NOT NULL, "imageUrl" character varying NOT NULL DEFAULT '', "type" "public"."notification_type_enum" NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "userId" uuid, CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."group_chat_type_enum" AS ENUM('Dou', 'Group')`);
        await queryRunner.query(`CREATE TABLE "group_chat" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "name" character varying, "pinned" boolean NOT NULL DEFAULT false, "unReads" integer NOT NULL DEFAULT '0', "type" "public"."group_chat_type_enum" NOT NULL, "latestMessageId" uuid, CONSTRAINT "REL_2d8bfa7d97c41f95e063dbfb4d" UNIQUE ("latestMessageId"), CONSTRAINT "PK_a8789ac3c3d35b199a2b9e9b9c1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "chat_message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "message" character varying, "imageUrls" jsonb, "documentUrls" jsonb, "isRead" boolean NOT NULL DEFAULT false, "pinned" boolean NOT NULL DEFAULT false, "unsend" boolean NOT NULL DEFAULT false, "senderId" uuid, "groupId" uuid, CONSTRAINT "PK_3cc0d85193aade457d3077dd06b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_friends_user" ("userId_1" uuid NOT NULL, "userId_2" uuid NOT NULL, CONSTRAINT "PK_f2b5631d91f6b7fda632135932f" PRIMARY KEY ("userId_1", "userId_2"))`);
        await queryRunner.query(`CREATE INDEX "IDX_04840fd160b733de706a336013" ON "user_friends_user" ("userId_1") `);
        await queryRunner.query(`CREATE INDEX "IDX_e81f236c989f3fd54836b50a12" ON "user_friends_user" ("userId_2") `);
        await queryRunner.query(`CREATE TABLE "group_chat_members_user" ("groupChatId" uuid NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_468b719a63af8a07fd64e46dcef" PRIMARY KEY ("groupChatId", "userId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_746f8dda4557d66bc1efa4708c" ON "group_chat_members_user" ("groupChatId") `);
        await queryRunner.query(`CREATE INDEX "IDX_dd108909d081b085f57b465ced" ON "group_chat_members_user" ("userId") `);
        await queryRunner.query(`CREATE TABLE "chat_message_read_by_user" ("chatMessageId" uuid NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_9002b818b855dfcbde8347b8a3f" PRIMARY KEY ("chatMessageId", "userId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4c5309e6dd181818fbc59141a3" ON "chat_message_read_by_user" ("chatMessageId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e0d53460cb9b11560048edd04d" ON "chat_message_read_by_user" ("userId") `);
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "displayName"`);
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "username"`);
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "avatarDetail"`);
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "coverPhotoDetail"`);
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "followerNumber"`);
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "followingNumber"`);
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "address"`);
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "telegramData"`);
        await queryRunner.query(`CREATE TYPE "public"."role_type_enum" AS ENUM('Admin', 'User')`);
        await queryRunner.query(`ALTER TABLE "role" ADD "type" "public"."role_type_enum" NOT NULL DEFAULT 'User'`);
        await queryRunner.query(`CREATE TYPE "public"."profile_gender_enum" AS ENUM('Male', 'Female', 'Others')`);
        await queryRunner.query(`ALTER TABLE "profile" ADD "gender" "public"."profile_gender_enum" NOT NULL DEFAULT 'Male'`);
        await queryRunner.query(`ALTER TABLE "profile" ADD "activityScore" numeric NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "profile" ADD "creditScore" numeric NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "upload_file" ADD CONSTRAINT "FK_11b2c3ab4becac81957d9763f36" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "fcm_token" ADD CONSTRAINT "FK_eda4e3fc14adda28b0c06e095cd" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification" ADD CONSTRAINT "FK_1ced25315eb974b73391fb1c81b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_chat" ADD CONSTRAINT "FK_2d8bfa7d97c41f95e063dbfb4dc" FOREIGN KEY ("latestMessageId") REFERENCES "chat_message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_message" ADD CONSTRAINT "FK_a2be22c99b34156574f4e02d0a0" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_message" ADD CONSTRAINT "FK_a6393f841e24c3268ced99c0148" FOREIGN KEY ("groupId") REFERENCES "group_chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_friends_user" ADD CONSTRAINT "FK_04840fd160b733de706a3360134" FOREIGN KEY ("userId_1") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_friends_user" ADD CONSTRAINT "FK_e81f236c989f3fd54836b50a12d" FOREIGN KEY ("userId_2") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "group_chat_members_user" ADD CONSTRAINT "FK_746f8dda4557d66bc1efa4708c9" FOREIGN KEY ("groupChatId") REFERENCES "group_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "group_chat_members_user" ADD CONSTRAINT "FK_dd108909d081b085f57b465ced0" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "chat_message_read_by_user" ADD CONSTRAINT "FK_4c5309e6dd181818fbc59141a38" FOREIGN KEY ("chatMessageId") REFERENCES "chat_message"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "chat_message_read_by_user" ADD CONSTRAINT "FK_e0d53460cb9b11560048edd04d1" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message_read_by_user" DROP CONSTRAINT "FK_e0d53460cb9b11560048edd04d1"`);
        await queryRunner.query(`ALTER TABLE "chat_message_read_by_user" DROP CONSTRAINT "FK_4c5309e6dd181818fbc59141a38"`);
        await queryRunner.query(`ALTER TABLE "group_chat_members_user" DROP CONSTRAINT "FK_dd108909d081b085f57b465ced0"`);
        await queryRunner.query(`ALTER TABLE "group_chat_members_user" DROP CONSTRAINT "FK_746f8dda4557d66bc1efa4708c9"`);
        await queryRunner.query(`ALTER TABLE "user_friends_user" DROP CONSTRAINT "FK_e81f236c989f3fd54836b50a12d"`);
        await queryRunner.query(`ALTER TABLE "user_friends_user" DROP CONSTRAINT "FK_04840fd160b733de706a3360134"`);
        await queryRunner.query(`ALTER TABLE "chat_message" DROP CONSTRAINT "FK_a6393f841e24c3268ced99c0148"`);
        await queryRunner.query(`ALTER TABLE "chat_message" DROP CONSTRAINT "FK_a2be22c99b34156574f4e02d0a0"`);
        await queryRunner.query(`ALTER TABLE "group_chat" DROP CONSTRAINT "FK_2d8bfa7d97c41f95e063dbfb4dc"`);
        await queryRunner.query(`ALTER TABLE "notification" DROP CONSTRAINT "FK_1ced25315eb974b73391fb1c81b"`);
        await queryRunner.query(`ALTER TABLE "fcm_token" DROP CONSTRAINT "FK_eda4e3fc14adda28b0c06e095cd"`);
        await queryRunner.query(`ALTER TABLE "upload_file" DROP CONSTRAINT "FK_11b2c3ab4becac81957d9763f36"`);
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "creditScore"`);
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "activityScore"`);
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "gender"`);
        await queryRunner.query(`DROP TYPE "public"."profile_gender_enum"`);
        await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "type"`);
        await queryRunner.query(`DROP TYPE "public"."role_type_enum"`);
        await queryRunner.query(`ALTER TABLE "profile" ADD "telegramData" jsonb`);
        await queryRunner.query(`ALTER TABLE "profile" ADD "address" character varying`);
        await queryRunner.query(`ALTER TABLE "profile" ADD "followingNumber" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "profile" ADD "followerNumber" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "profile" ADD "coverPhotoDetail" jsonb`);
        await queryRunner.query(`ALTER TABLE "profile" ADD "avatarDetail" jsonb`);
        await queryRunner.query(`ALTER TABLE "profile" ADD "username" character varying`);
        await queryRunner.query(`ALTER TABLE "profile" ADD "displayName" character varying`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e0d53460cb9b11560048edd04d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4c5309e6dd181818fbc59141a3"`);
        await queryRunner.query(`DROP TABLE "chat_message_read_by_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dd108909d081b085f57b465ced"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_746f8dda4557d66bc1efa4708c"`);
        await queryRunner.query(`DROP TABLE "group_chat_members_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e81f236c989f3fd54836b50a12"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_04840fd160b733de706a336013"`);
        await queryRunner.query(`DROP TABLE "user_friends_user"`);
        await queryRunner.query(`DROP TABLE "chat_message"`);
        await queryRunner.query(`DROP TABLE "group_chat"`);
        await queryRunner.query(`DROP TYPE "public"."group_chat_type_enum"`);
        await queryRunner.query(`DROP TABLE "notification"`);
        await queryRunner.query(`DROP TYPE "public"."notification_type_enum"`);
        await queryRunner.query(`DROP TABLE "fcm_token"`);
        await queryRunner.query(`DROP TYPE "public"."fcm_token_devicetype_enum"`);
        await queryRunner.query(`DROP TABLE "upload_file"`);
    }

}
