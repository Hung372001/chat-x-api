import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHashPasswordCol1692801595443 implements MigrationInterface {
  name = 'AddHashPasswordCol1692801595443';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "hashedPassword" character varying NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "hashedPassword"`);
  }
}
