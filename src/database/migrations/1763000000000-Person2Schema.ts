import { MigrationInterface, QueryRunner } from 'typeorm';

/** Only Person 2 tables. USERS must exist first (Person 1 owns that table). */
export class Person2Schema1763000000000 implements MigrationInterface {
  name = 'Person2Schema1763000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
    await queryRunner.query(`
      CREATE TABLE departments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL UNIQUE,
        description text
      )
    `);
    await queryRunner.query(`
      CREATE TABLE specializations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(120) NOT NULL UNIQUE,
        description text
      )
    `);
    await queryRunner.query(`
      CREATE TABLE doctors (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
        department_id uuid NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
        license_number varchar(80) NOT NULL UNIQUE,
        bio text,
        is_active boolean NOT NULL DEFAULT TRUE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE doctor_specializations (
        doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        specialization_id uuid NOT NULL REFERENCES specializations(id) ON DELETE RESTRICT,
        PRIMARY KEY (doctor_id, specialization_id)
      )
    `);
    await queryRunner.query(`
      CREATE TYPE slot_status AS ENUM ('OPEN','BLOCKED')
    `);
    await queryRunner.query(`
      CREATE TABLE doctor_slots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
        start_at timestamptz NOT NULL,
        end_at timestamptz NOT NULL,
        status slot_status NOT NULL DEFAULT 'OPEN',
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_slot_time_order CHECK (end_at > start_at)
      )
    `);
    await queryRunner.query(`
      ALTER TABLE doctor_slots
      ADD CONSTRAINT doctor_no_overlapping_slots
      EXCLUDE USING gist (doctor_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&)
    `);
    await queryRunner.query(`CREATE INDEX idx_doctor_slots_start ON doctor_slots (start_at)`);
    await queryRunner.query(`CREATE INDEX idx_doctor_slots_doctor ON doctor_slots (doctor_id, start_at)`);
    await queryRunner.query(`CREATE INDEX idx_doctors_department ON doctors (department_id)`);
    await queryRunner.query(`CREATE INDEX idx_doctor_specializations_specialization ON doctor_specializations (specialization_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE doctor_slots`);
    await queryRunner.query(`DROP TYPE slot_status`);
    await queryRunner.query(`DROP TABLE doctor_specializations`);
    await queryRunner.query(`DROP TABLE doctors`);
    await queryRunner.query(`DROP TABLE specializations`);
    await queryRunner.query(`DROP TABLE departments`);
    // No DROP EXTENSION; these may be shared by other modules.
  }
}
