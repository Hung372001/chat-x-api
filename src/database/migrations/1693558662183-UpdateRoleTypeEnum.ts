import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateRoleTypeEnum1693558662183 implements MigrationInterface {
    name = 'UpdateRoleTypeEnum1693558662183'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."role_type_enum" RENAME TO "role_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."role_type_enum" AS ENUM('ADMIN', 'USER')`);
        await queryRunner.query(`ALTER TABLE "role" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "role" ALTER COLUMN "type" TYPE "public"."role_type_enum" USING "type"::"text"::"public"."role_type_enum"`);
        await queryRunner.query(`ALTER TABLE "role" ALTER COLUMN "type" SET DEFAULT 'USER'`);
        await queryRunner.query(`DROP TYPE "public"."role_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."role_type_enum_old" AS ENUM('Admin', 'User')`);
        await queryRunner.query(`ALTER TABLE "role" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "role" ALTER COLUMN "type" TYPE "public"."role_type_enum_old" USING "type"::"text"::"public"."role_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "role" ALTER COLUMN "type" SET DEFAULT 'User'`);
        await queryRunner.query(`DROP TYPE "public"."role_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."role_type_enum_old" RENAME TO "role_type_enum"`);
    }

}
