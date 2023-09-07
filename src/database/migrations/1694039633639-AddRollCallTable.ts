import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRollCallTable1694039633639 implements MigrationInterface {
    name = 'AddRollCallTable1694039633639'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "roll_call" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "userId" uuid, CONSTRAINT "PK_c4b3fde67277432dfceaa0f2c13" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "roll_call" ADD CONSTRAINT "FK_6497e6274218c196406e8ea9815" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "roll_call" DROP CONSTRAINT "FK_6497e6274218c196406e8ea9815"`);
        await queryRunner.query(`DROP TABLE "roll_call"`);
    }

}
