import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Person 3: appointments.
 * Runs after users/patients (Person 1) and doctor_slots (Person 2).
 */
export class CreateAppointments1763600000000 implements MigrationInterface {
  name = 'CreateAppointments1763600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE appointment_status AS ENUM
        ('BOOKED', 'CANCELLED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW')
    `);

    await queryRunner.query(`
      CREATE TABLE appointments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
        slot_id uuid NOT NULL REFERENCES doctor_slots(id) ON DELETE RESTRICT,
        booked_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        reason_for_visit text,
        status appointment_status NOT NULL DEFAULT 'BOOKED',
        cancelled_at timestamptz,
        cancellation_reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_appointments_cancelled_at
          CHECK ((status = 'CANCELLED') = (cancelled_at IS NOT NULL))
      )
    `);

    // Database-level guarantee: a slot can have only ONE active appointment.
    // Cancelled rows are kept as history, so they are excluded from the rule.
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_appointments_active_slot
      ON appointments (slot_id)
      WHERE status <> 'CANCELLED'
    `);

    await queryRunner.query(`CREATE INDEX idx_appointments_patient ON appointments (patient_id)`);
    await queryRunner.query(`CREATE INDEX idx_appointments_status ON appointments (status)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS appointments`);
    await queryRunner.query(`DROP TYPE IF EXISTS appointment_status`);
  }
}
