import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGroupChatMemberTable1693802810614 implements MigrationInterface {
    name = 'AddGroupChatMemberTable1693802810614'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "group_chat_member" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "pinned" boolean NOT NULL DEFAULT false, "unReads" integer NOT NULL DEFAULT '0', "groupChatId" uuid, "userId" uuid, CONSTRAINT "REL_fef62a2a61da5fcdc2b1a23205" UNIQUE ("groupChatId"), CONSTRAINT "REL_1c5e599bc363fdd74ded4b1312" UNIQUE ("userId"), CONSTRAINT "PK_6039aa00fcb82a011d16656f2d8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "chat_message_reads_by_user" ("chatMessageId" uuid NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_53e51b5c68f1ad0fd703a5ed2e2" PRIMARY KEY ("chatMessageId", "userId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8b07ee160caa2266840f37d896" ON "chat_message_reads_by_user" ("chatMessageId") `);
        await queryRunner.query(`CREATE INDEX "IDX_984b5040edfc845ae8d24cbf26" ON "chat_message_reads_by_user" ("userId") `);
        await queryRunner.query(`CREATE TABLE "chat_message_deletes_by_user" ("chatMessageId" uuid NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_a30179dc459efa76d5834bff5b7" PRIMARY KEY ("chatMessageId", "userId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0709f86eed9ad7802a1c80c692" ON "chat_message_deletes_by_user" ("chatMessageId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5ee85d0046cd42340ea300d9ae" ON "chat_message_deletes_by_user" ("userId") `);
        await queryRunner.query(`ALTER TABLE "group_chat" DROP COLUMN "pinned"`);
        await queryRunner.query(`ALTER TABLE "group_chat" DROP COLUMN "unReads"`);
        await queryRunner.query(`ALTER TABLE "chat_message" DROP COLUMN "isRead"`);
        await queryRunner.query(`ALTER TABLE "group_chat_member" ADD CONSTRAINT "FK_fef62a2a61da5fcdc2b1a23205c" FOREIGN KEY ("groupChatId") REFERENCES "group_chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_chat_member" ADD CONSTRAINT "FK_1c5e599bc363fdd74ded4b13128" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads_by_user" ADD CONSTRAINT "FK_8b07ee160caa2266840f37d8965" FOREIGN KEY ("chatMessageId") REFERENCES "chat_message"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads_by_user" ADD CONSTRAINT "FK_984b5040edfc845ae8d24cbf265" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "chat_message_deletes_by_user" ADD CONSTRAINT "FK_0709f86eed9ad7802a1c80c692f" FOREIGN KEY ("chatMessageId") REFERENCES "chat_message"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "chat_message_deletes_by_user" ADD CONSTRAINT "FK_5ee85d0046cd42340ea300d9aec" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_message_deletes_by_user" DROP CONSTRAINT "FK_5ee85d0046cd42340ea300d9aec"`);
        await queryRunner.query(`ALTER TABLE "chat_message_deletes_by_user" DROP CONSTRAINT "FK_0709f86eed9ad7802a1c80c692f"`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads_by_user" DROP CONSTRAINT "FK_984b5040edfc845ae8d24cbf265"`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads_by_user" DROP CONSTRAINT "FK_8b07ee160caa2266840f37d8965"`);
        await queryRunner.query(`ALTER TABLE "group_chat_member" DROP CONSTRAINT "FK_1c5e599bc363fdd74ded4b13128"`);
        await queryRunner.query(`ALTER TABLE "group_chat_member" DROP CONSTRAINT "FK_fef62a2a61da5fcdc2b1a23205c"`);
        await queryRunner.query(`ALTER TABLE "chat_message" ADD "isRead" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "group_chat" ADD "unReads" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "group_chat" ADD "pinned" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5ee85d0046cd42340ea300d9ae"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0709f86eed9ad7802a1c80c692"`);
        await queryRunner.query(`DROP TABLE "chat_message_deletes_by_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_984b5040edfc845ae8d24cbf26"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8b07ee160caa2266840f37d896"`);
        await queryRunner.query(`DROP TABLE "chat_message_reads_by_user"`);
        await queryRunner.query(`DROP TABLE "group_chat_member"`);
    }

}
