import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitDB1699218852882 implements MigrationInterface {
  name = 'InitDB1699218852882';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."role_type_enum" AS ENUM('ADMIN', 'USER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "role" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "name" character varying NOT NULL, "permissions" character varying NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, "description" character varying, "type" "public"."role_type_enum" NOT NULL DEFAULT 'USER', CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."profile_gender_enum" AS ENUM('Male', 'Female', 'Others')`,
    );
    await queryRunner.query(
      `CREATE TABLE "profile" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "avatar" character varying, "gender" "public"."profile_gender_enum" NOT NULL DEFAULT 'Male', "activityScore" numeric NOT NULL DEFAULT '0', "creditScore" numeric NOT NULL DEFAULT '0', CONSTRAINT "PK_3dd8bfc97e4a77c70971591bdcb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "upload_file" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "url" character varying NOT NULL, "key" character varying NOT NULL, "ownerId" uuid, CONSTRAINT "PK_17afec80fc97979415eae19aee0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."fcm_token_devicetype_enum" AS ENUM('WEBSITE', 'ANDROID', 'IOS')`,
    );
    await queryRunner.query(
      `CREATE TABLE "fcm_token" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "deviceToken" character varying NOT NULL, "deviceType" "public"."fcm_token_devicetype_enum" NOT NULL DEFAULT 'WEBSITE', "userId" uuid, CONSTRAINT "PK_ec8f7ff07f44545126442edd9e7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notification_type_enum" AS ENUM('NORMAL', 'UNREAD_MESSAGE', 'NEW_FRIEND_REQUEST', 'ACCEPT_FRIEND_REQUEST')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notification" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "title" character varying NOT NULL, "content" text NOT NULL, "imageUrl" character varying DEFAULT '', "type" "public"."notification_type_enum" NOT NULL DEFAULT 'NORMAL', "isRead" boolean NOT NULL DEFAULT false, "data" jsonb, "userId" uuid, CONSTRAINT "PK_705b6c7cdf9b2c2ff7ac7872cb7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "roll_call" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "userId" uuid, CONSTRAINT "PK_c4b3fde67277432dfceaa0f2c13" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."group_chat_type_enum" AS ENUM('Dou', 'Group')`,
    );
    await queryRunner.query(
      `CREATE TABLE "group_chat" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "name" character varying, "uniqueName" character varying, "type" "public"."group_chat_type_enum" NOT NULL, "canAddFriends" boolean DEFAULT true, "enabledChat" boolean DEFAULT true, "clearMessageDuration" numeric NOT NULL DEFAULT '0', "isPublic" boolean DEFAULT false, "latestMessageId" uuid, "ownerId" uuid, CONSTRAINT "REL_2d8bfa7d97c41f95e063dbfb4d" UNIQUE ("latestMessageId"), CONSTRAINT "PK_a8789ac3c3d35b199a2b9e9b9c1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "group_chat_setting" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "pinned" boolean NOT NULL DEFAULT false, "hiding" boolean NOT NULL DEFAULT false, "deleteMessageFrom" TIMESTAMP WITH TIME ZONE, "muteNotification" boolean NOT NULL DEFAULT false, "unReadMessages" integer NOT NULL DEFAULT '0', "groupChatId" uuid, "userId" uuid, CONSTRAINT "PK_eaeca9fdc0bd0eee3ce73ae7cd7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "friendship" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "nickname" character varying, "toUserId" uuid, "fromUserId" uuid, CONSTRAINT "PK_dbd6fb568cd912c5140307075cc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."friend_request_status_enum" AS ENUM('Waiting', 'Accepted', 'Rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "friend_request" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "status" "public"."friend_request_status_enum" NOT NULL DEFAULT 'Waiting', "fromUserId" uuid, "toUserId" uuid, CONSTRAINT "PK_4c9d23ff394888750cf66cac17c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "email" character varying, "phoneNumber" character varying, "username" character varying NOT NULL, "hashedPassword" character varying NOT NULL, "currentRefreshToken" character varying, "hiding" boolean NOT NULL DEFAULT false, "soundNotification" boolean NOT NULL DEFAULT true, "profileId" uuid, CONSTRAINT "REL_9466682df91534dd95e4dbaa61" UNIQUE ("profileId"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "message" character varying, "imageUrls" jsonb, "documentUrls" jsonb, "isRead" boolean NOT NULL DEFAULT false, "unsent" boolean NOT NULL DEFAULT false, "pinned" boolean NOT NULL DEFAULT false, "isFriendRequest" boolean NOT NULL DEFAULT false, "senderId" uuid, "groupId" uuid, "deletedById" uuid, "unsentById" uuid, "pinnedById" uuid, "nameCardId" uuid, CONSTRAINT "PK_3cc0d85193aade457d3077dd06b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "group_chat_members_user" ("groupChatId" uuid NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_468b719a63af8a07fd64e46dcef" PRIMARY KEY ("groupChatId", "userId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_746f8dda4557d66bc1efa4708c" ON "group_chat_members_user" ("groupChatId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd108909d081b085f57b465ced" ON "group_chat_members_user" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "group_chat_admins_user" ("groupChatId" uuid NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_2bd7f151e538acd244c913d8225" PRIMARY KEY ("groupChatId", "userId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fa5c31da4f40b246a2aa49ffcb" ON "group_chat_admins_user" ("groupChatId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cdef1a23f06b4c85e3f9011ca0" ON "group_chat_admins_user" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_roles_role" ("userId" uuid NOT NULL, "roleId" uuid NOT NULL, CONSTRAINT "PK_b47cd6c84ee205ac5a713718292" PRIMARY KEY ("userId", "roleId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5f9286e6c25594c6b88c108db7" ON "user_roles_role" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4be2f7adf862634f5f803d246b" ON "user_roles_role" ("roleId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_message_reads_by_user" ("chatMessageId" uuid NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_53e51b5c68f1ad0fd703a5ed2e2" PRIMARY KEY ("chatMessageId", "userId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b07ee160caa2266840f37d896" ON "chat_message_reads_by_user" ("chatMessageId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_984b5040edfc845ae8d24cbf26" ON "chat_message_reads_by_user" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "upload_file" ADD CONSTRAINT "FK_11b2c3ab4becac81957d9763f36" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_token" ADD CONSTRAINT "FK_eda4e3fc14adda28b0c06e095cd" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "FK_1ced25315eb974b73391fb1c81b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "roll_call" ADD CONSTRAINT "FK_6497e6274218c196406e8ea9815" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat" ADD CONSTRAINT "FK_2d8bfa7d97c41f95e063dbfb4dc" FOREIGN KEY ("latestMessageId") REFERENCES "chat_message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat" ADD CONSTRAINT "FK_ec570a35157b8602c697b138f6e" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_setting" ADD CONSTRAINT "FK_0ff005a4bcc052f3155a38f480e" FOREIGN KEY ("groupChatId") REFERENCES "group_chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_setting" ADD CONSTRAINT "FK_aceb8859f141419ef572615516f" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendship" ADD CONSTRAINT "FK_0a0c72660a5cb4e4990b16140c7" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendship" ADD CONSTRAINT "FK_0e5fb51d583ac8e79704111d25b" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_request" ADD CONSTRAINT "FK_f8af1ebd292163078e6a43ceaab" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_request" ADD CONSTRAINT "FK_6d3cfadc7211c43a3c1fadc2bcf" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_9466682df91534dd95e4dbaa616" FOREIGN KEY ("profileId") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" ADD CONSTRAINT "FK_a2be22c99b34156574f4e02d0a0" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" ADD CONSTRAINT "FK_a6393f841e24c3268ced99c0148" FOREIGN KEY ("groupId") REFERENCES "group_chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" ADD CONSTRAINT "FK_6276cdd7426a4ddbf6c24df2e6b" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" ADD CONSTRAINT "FK_94c1bc2581e730fa962c4999630" FOREIGN KEY ("unsentById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" ADD CONSTRAINT "FK_11582a335dee96d7bfdcb601f1a" FOREIGN KEY ("pinnedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" ADD CONSTRAINT "FK_fa2e774a231e4feac66088382f0" FOREIGN KEY ("nameCardId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_members_user" ADD CONSTRAINT "FK_746f8dda4557d66bc1efa4708c9" FOREIGN KEY ("groupChatId") REFERENCES "group_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_members_user" ADD CONSTRAINT "FK_dd108909d081b085f57b465ced0" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_admins_user" ADD CONSTRAINT "FK_fa5c31da4f40b246a2aa49ffcbd" FOREIGN KEY ("groupChatId") REFERENCES "group_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_admins_user" ADD CONSTRAINT "FK_cdef1a23f06b4c85e3f9011ca0d" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles_role" ADD CONSTRAINT "FK_5f9286e6c25594c6b88c108db77" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles_role" ADD CONSTRAINT "FK_4be2f7adf862634f5f803d246b8" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message_reads_by_user" ADD CONSTRAINT "FK_8b07ee160caa2266840f37d8965" FOREIGN KEY ("chatMessageId") REFERENCES "chat_message"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message_reads_by_user" ADD CONSTRAINT "FK_984b5040edfc845ae8d24cbf265" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_message_reads_by_user" DROP CONSTRAINT "FK_984b5040edfc845ae8d24cbf265"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message_reads_by_user" DROP CONSTRAINT "FK_8b07ee160caa2266840f37d8965"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles_role" DROP CONSTRAINT "FK_4be2f7adf862634f5f803d246b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles_role" DROP CONSTRAINT "FK_5f9286e6c25594c6b88c108db77"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_admins_user" DROP CONSTRAINT "FK_cdef1a23f06b4c85e3f9011ca0d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_admins_user" DROP CONSTRAINT "FK_fa5c31da4f40b246a2aa49ffcbd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_members_user" DROP CONSTRAINT "FK_dd108909d081b085f57b465ced0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_members_user" DROP CONSTRAINT "FK_746f8dda4557d66bc1efa4708c9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" DROP CONSTRAINT "FK_fa2e774a231e4feac66088382f0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" DROP CONSTRAINT "FK_11582a335dee96d7bfdcb601f1a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" DROP CONSTRAINT "FK_94c1bc2581e730fa962c4999630"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" DROP CONSTRAINT "FK_6276cdd7426a4ddbf6c24df2e6b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" DROP CONSTRAINT "FK_a6393f841e24c3268ced99c0148"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" DROP CONSTRAINT "FK_a2be22c99b34156574f4e02d0a0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_9466682df91534dd95e4dbaa616"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_request" DROP CONSTRAINT "FK_6d3cfadc7211c43a3c1fadc2bcf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_request" DROP CONSTRAINT "FK_f8af1ebd292163078e6a43ceaab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendship" DROP CONSTRAINT "FK_0e5fb51d583ac8e79704111d25b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendship" DROP CONSTRAINT "FK_0a0c72660a5cb4e4990b16140c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_setting" DROP CONSTRAINT "FK_aceb8859f141419ef572615516f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_setting" DROP CONSTRAINT "FK_0ff005a4bcc052f3155a38f480e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat" DROP CONSTRAINT "FK_ec570a35157b8602c697b138f6e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat" DROP CONSTRAINT "FK_2d8bfa7d97c41f95e063dbfb4dc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "roll_call" DROP CONSTRAINT "FK_6497e6274218c196406e8ea9815"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT "FK_1ced25315eb974b73391fb1c81b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fcm_token" DROP CONSTRAINT "FK_eda4e3fc14adda28b0c06e095cd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "upload_file" DROP CONSTRAINT "FK_11b2c3ab4becac81957d9763f36"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_984b5040edfc845ae8d24cbf26"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8b07ee160caa2266840f37d896"`,
    );
    await queryRunner.query(`DROP TABLE "chat_message_reads_by_user"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4be2f7adf862634f5f803d246b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5f9286e6c25594c6b88c108db7"`,
    );
    await queryRunner.query(`DROP TABLE "user_roles_role"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cdef1a23f06b4c85e3f9011ca0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fa5c31da4f40b246a2aa49ffcb"`,
    );
    await queryRunner.query(`DROP TABLE "group_chat_admins_user"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dd108909d081b085f57b465ced"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_746f8dda4557d66bc1efa4708c"`,
    );
    await queryRunner.query(`DROP TABLE "group_chat_members_user"`);
    await queryRunner.query(`DROP TABLE "chat_message"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "friend_request"`);
    await queryRunner.query(`DROP TYPE "public"."friend_request_status_enum"`);
    await queryRunner.query(`DROP TABLE "friendship"`);
    await queryRunner.query(`DROP TABLE "group_chat_setting"`);
    await queryRunner.query(`DROP TABLE "group_chat"`);
    await queryRunner.query(`DROP TYPE "public"."group_chat_type_enum"`);
    await queryRunner.query(`DROP TABLE "roll_call"`);
    await queryRunner.query(`DROP TABLE "notification"`);
    await queryRunner.query(`DROP TYPE "public"."notification_type_enum"`);
    await queryRunner.query(`DROP TABLE "fcm_token"`);
    await queryRunner.query(`DROP TYPE "public"."fcm_token_devicetype_enum"`);
    await queryRunner.query(`DROP TABLE "upload_file"`);
    await queryRunner.query(`DROP TABLE "profile"`);
    await queryRunner.query(`DROP TYPE "public"."profile_gender_enum"`);
    await queryRunner.query(`DROP TABLE "role"`);
    await queryRunner.query(`DROP TYPE "public"."role_type_enum"`);
  }
}
