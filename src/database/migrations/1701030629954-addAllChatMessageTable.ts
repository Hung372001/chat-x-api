import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAllChatMessageTable1701030629954 implements MigrationInterface {
    name = 'AddAllChatMessageTable1701030629954'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "all_chat_message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "message" character varying, "imageUrls" jsonb, "documentUrls" jsonb, "isRead" boolean NOT NULL DEFAULT false, "unsent" boolean NOT NULL DEFAULT false, "pinned" boolean NOT NULL DEFAULT false, "isFriendRequest" boolean NOT NULL DEFAULT false, "senderId" uuid, "groupId" uuid, "deletedById" uuid, "unsentById" uuid, "pinnedById" uuid, "nameCardId" uuid, CONSTRAINT "PK_245bd5bfc7d7f72f8f86078af68" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "all_chat_message" ADD CONSTRAINT "FK_6646a135792ec57b14f15eb0450" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "all_chat_message" ADD CONSTRAINT "FK_7ff87267e8649e1f3615d9a6dd1" FOREIGN KEY ("groupId") REFERENCES "group_chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "all_chat_message" ADD CONSTRAINT "FK_d8e1dcd8ddfceaf698f3d8f763c" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "all_chat_message" ADD CONSTRAINT "FK_f94ecd73a55adebef81955af47e" FOREIGN KEY ("unsentById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "all_chat_message" ADD CONSTRAINT "FK_2134c640c059b456e7bf5231c2a" FOREIGN KEY ("pinnedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "all_chat_message" ADD CONSTRAINT "FK_eb4d099c4a287b4796c2e89ad3a" FOREIGN KEY ("nameCardId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "all_chat_message" DROP CONSTRAINT "FK_eb4d099c4a287b4796c2e89ad3a"`);
        await queryRunner.query(`ALTER TABLE "all_chat_message" DROP CONSTRAINT "FK_2134c640c059b456e7bf5231c2a"`);
        await queryRunner.query(`ALTER TABLE "all_chat_message" DROP CONSTRAINT "FK_f94ecd73a55adebef81955af47e"`);
        await queryRunner.query(`ALTER TABLE "all_chat_message" DROP CONSTRAINT "FK_d8e1dcd8ddfceaf698f3d8f763c"`);
        await queryRunner.query(`ALTER TABLE "all_chat_message" DROP CONSTRAINT "FK_7ff87267e8649e1f3615d9a6dd1"`);
        await queryRunner.query(`ALTER TABLE "all_chat_message" DROP CONSTRAINT "FK_6646a135792ec57b14f15eb0450"`);
        await queryRunner.query(`DROP TABLE "all_chat_message"`);
    }

}
