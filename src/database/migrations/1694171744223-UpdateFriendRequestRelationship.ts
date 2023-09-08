import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateFriendRequestRelationship1694171744223 implements MigrationInterface {
    name = 'UpdateFriendRequestRelationship1694171744223'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "friend_request" DROP CONSTRAINT "FK_f8af1ebd292163078e6a43ceaab"`);
        await queryRunner.query(`ALTER TABLE "friend_request" DROP CONSTRAINT "FK_6d3cfadc7211c43a3c1fadc2bcf"`);
        await queryRunner.query(`ALTER TABLE "friend_request" DROP CONSTRAINT "REL_f8af1ebd292163078e6a43ceaa"`);
        await queryRunner.query(`ALTER TABLE "friend_request" DROP CONSTRAINT "REL_6d3cfadc7211c43a3c1fadc2bc"`);
        await queryRunner.query(`ALTER TABLE "friend_request" ADD CONSTRAINT "FK_f8af1ebd292163078e6a43ceaab" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friend_request" ADD CONSTRAINT "FK_6d3cfadc7211c43a3c1fadc2bcf" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "friend_request" DROP CONSTRAINT "FK_6d3cfadc7211c43a3c1fadc2bcf"`);
        await queryRunner.query(`ALTER TABLE "friend_request" DROP CONSTRAINT "FK_f8af1ebd292163078e6a43ceaab"`);
        await queryRunner.query(`ALTER TABLE "friend_request" ADD CONSTRAINT "REL_6d3cfadc7211c43a3c1fadc2bc" UNIQUE ("toUserId")`);
        await queryRunner.query(`ALTER TABLE "friend_request" ADD CONSTRAINT "REL_f8af1ebd292163078e6a43ceaa" UNIQUE ("fromUserId")`);
        await queryRunner.query(`ALTER TABLE "friend_request" ADD CONSTRAINT "FK_6d3cfadc7211c43a3c1fadc2bcf" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friend_request" ADD CONSTRAINT "FK_f8af1ebd292163078e6a43ceaab" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
