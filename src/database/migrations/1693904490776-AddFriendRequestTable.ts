import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFriendRequestTable1693904490776 implements MigrationInterface {
    name = 'AddFriendRequestTable1693904490776'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "friend_request" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "status" "public"."friend_request_status_enum" NOT NULL DEFAULT 'Waiting', "fromUserId" uuid, "toUserId" uuid, CONSTRAINT "REL_f8af1ebd292163078e6a43ceaa" UNIQUE ("fromUserId"), CONSTRAINT "REL_6d3cfadc7211c43a3c1fadc2bc" UNIQUE ("toUserId"), CONSTRAINT "PK_4c9d23ff394888750cf66cac17c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "friend_request" ADD CONSTRAINT "FK_f8af1ebd292163078e6a43ceaab" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friend_request" ADD CONSTRAINT "FK_6d3cfadc7211c43a3c1fadc2bcf" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "friend_request" DROP CONSTRAINT "FK_6d3cfadc7211c43a3c1fadc2bcf"`);
        await queryRunner.query(`ALTER TABLE "friend_request" DROP CONSTRAINT "FK_f8af1ebd292163078e6a43ceaab"`);
        await queryRunner.query(`DROP TABLE "friend_request"`);
    }

}
