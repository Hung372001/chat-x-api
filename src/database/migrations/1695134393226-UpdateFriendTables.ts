import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateFriendTables1695134393226 implements MigrationInterface {
    name = 'UpdateFriendTables1695134393226'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "friendship" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deleted_at" TIMESTAMP, "nickname" character varying, "toUserId" uuid, "fromUserId" uuid, CONSTRAINT "UQ_12f4b75a62a54bbe2dd387e12c3" UNIQUE ("nickname"), CONSTRAINT "PK_dbd6fb568cd912c5140307075cc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "friendship" ADD CONSTRAINT "FK_0a0c72660a5cb4e4990b16140c7" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friendship" ADD CONSTRAINT "FK_0e5fb51d583ac8e79704111d25b" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "friendship" DROP CONSTRAINT "FK_0e5fb51d583ac8e79704111d25b"`);
        await queryRunner.query(`ALTER TABLE "friendship" DROP CONSTRAINT "FK_0a0c72660a5cb4e4990b16140c7"`);
        await queryRunner.query(`DROP TABLE "friendship"`);
    }

}
