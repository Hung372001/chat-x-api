import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminsIntoGroupChat1693668837521 implements MigrationInterface {
    name = 'AddAdminsIntoGroupChat1693668837521'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "group_chat_admins_user" ("groupChatId" uuid NOT NULL, "userId" uuid NOT NULL, CONSTRAINT "PK_2bd7f151e538acd244c913d8225" PRIMARY KEY ("groupChatId", "userId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fa5c31da4f40b246a2aa49ffcb" ON "group_chat_admins_user" ("groupChatId") `);
        await queryRunner.query(`CREATE INDEX "IDX_cdef1a23f06b4c85e3f9011ca0" ON "group_chat_admins_user" ("userId") `);
        await queryRunner.query(`ALTER TABLE "group_chat_admins_user" ADD CONSTRAINT "FK_fa5c31da4f40b246a2aa49ffcbd" FOREIGN KEY ("groupChatId") REFERENCES "group_chat"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "group_chat_admins_user" ADD CONSTRAINT "FK_cdef1a23f06b4c85e3f9011ca0d" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_chat_admins_user" DROP CONSTRAINT "FK_cdef1a23f06b4c85e3f9011ca0d"`);
        await queryRunner.query(`ALTER TABLE "group_chat_admins_user" DROP CONSTRAINT "FK_fa5c31da4f40b246a2aa49ffcbd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cdef1a23f06b4c85e3f9011ca0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fa5c31da4f40b246a2aa49ffcb"`);
        await queryRunner.query(`DROP TABLE "group_chat_admins_user"`);
    }

}
