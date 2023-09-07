import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateGroupChatSettingTable1694080978706
  implements MigrationInterface
{
  name = 'UpdateGroupChatSettingTable1694080978706';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "group_chat_setting" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "nickname" character varying, "pinned" boolean NOT NULL DEFAULT false, "deleteMessageFrom" TIMESTAMP WITH TIME ZONE NOT NULL, "muteNotification" boolean NOT NULL DEFAULT false, "groupChatId" uuid, "userId" uuid, CONSTRAINT "REL_0ff005a4bcc052f3155a38f480" UNIQUE ("groupChatId"), CONSTRAINT "REL_aceb8859f141419ef572615516" UNIQUE ("userId"), CONSTRAINT "PK_eaeca9fdc0bd0eee3ce73ae7cd7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" ADD "isRead" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_setting" ADD CONSTRAINT "FK_0ff005a4bcc052f3155a38f480e" FOREIGN KEY ("groupChatId") REFERENCES "group_chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_setting" ADD CONSTRAINT "FK_aceb8859f141419ef572615516f" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_member" DROP CONSTRAINT "FK_1c5e599bc363fdd74ded4b13128"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_member" DROP CONSTRAINT "FK_fef62a2a61da5fcdc2b1a23205c"`,
    );
    await queryRunner.query(`DROP TABLE "group_chat_member"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "group_chat_setting" DROP CONSTRAINT "FK_aceb8859f141419ef572615516f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_setting" DROP CONSTRAINT "FK_0ff005a4bcc052f3155a38f480e"`,
    );
    await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "isRead"`);
    await queryRunner.query(`DROP TABLE "group_chat_setting"`);
    await queryRunner.query(
      `CREATE TABLE "group_chat_member" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "pinned" boolean NOT NULL DEFAULT false, "unReads" integer NOT NULL DEFAULT '0', "groupChatId" uuid, "userId" uuid, CONSTRAINT "REL_fef62a2a61da5fcdc2b1a23205" UNIQUE ("groupChatId"), CONSTRAINT "REL_1c5e599bc363fdd74ded4b1312" UNIQUE ("userId"), CONSTRAINT "PK_6039aa00fcb82a011d16656f2d8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_member" ADD CONSTRAINT "FK_fef62a2a61da5fcdc2b1a23205c" FOREIGN KEY ("groupChatId") REFERENCES "group_chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_chat_member" ADD CONSTRAINT "FK_1c5e599bc363fdd74ded4b13128" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
