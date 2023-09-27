import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveUniqueUserCols1695662022937 implements MigrationInterface {
    name = 'RemoveUniqueUserCols1695662022937'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_f2578043e491921209f5dadd080"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_f2578043e491921209f5dadd080" UNIQUE ("phoneNumber")`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email")`);
    }

}
