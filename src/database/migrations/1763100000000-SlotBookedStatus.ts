import { MigrationInterface, QueryRunner } from 'typeorm';

export class SlotBookedStatus1763100000000 implements MigrationInterface {
  name = 'SlotBookedStatus1763100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE slot_status ADD VALUE IF NOT EXISTS 'BOOKED'`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_doctor_slots_open_start ON doctor_slots (start_at) WHERE status = 'OPEN'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_doctor_slots_open_start`);
    await queryRunner.query(`UPDATE doctor_slots SET status = 'BLOCKED' WHERE status::text = 'BOOKED'`);
    await queryRunner.query(`ALTER TABLE doctor_slots ALTER COLUMN status DROP DEFAULT`);
    await queryRunner.query(`ALTER TYPE slot_status RENAME TO slot_status_old`);
    await queryRunner.query(`CREATE TYPE slot_status AS ENUM ('OPEN','BLOCKED')`);
    await queryRunner.query(
      `ALTER TABLE doctor_slots ALTER COLUMN status TYPE slot_status USING status::text::slot_status`,
    );
    await queryRunner.query(`ALTER TABLE doctor_slots ALTER COLUMN status SET DEFAULT 'OPEN'`);
    await queryRunner.query(`DROP TYPE slot_status_old`);
  }
}
