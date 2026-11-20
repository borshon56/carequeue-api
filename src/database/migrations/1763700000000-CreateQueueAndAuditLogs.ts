import { MigrationInterface, QueryRunner } from 'typeorm';

/** Person 4: queue tickets and persistent audit history. */
export class CreateQueueAndAuditLogs1763700000000 implements MigrationInterface {
  name = 'CreateQueueAndAuditLogs1763700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE queue_ticket_status AS ENUM ('WAITING', 'SERVING', 'COMPLETED')
    `);

    await queryRunner.query(`
      CREATE TABLE queue_tickets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id uuid NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE RESTRICT,
        doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
        queue_date date NOT NULL,
        token_number integer NOT NULL CHECK (token_number > 0),
        status queue_ticket_status NOT NULL DEFAULT 'WAITING',
        checked_in_at timestamptz NOT NULL DEFAULT now(),
        called_at timestamptz,
        completed_at timestamptz,
        CONSTRAINT uq_queue_doctor_date_token UNIQUE (doctor_id, queue_date, token_number)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_queue_doctor_date_status
      ON queue_tickets (doctor_id, queue_date, status, token_number)
    `);

    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        action varchar(100) NOT NULL,
        entity varchar(100) NOT NULL,
        entity_id uuid,
        old_values jsonb,
        new_values jsonb,
        ip_address varchar(64),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_entity ON audit_logs (entity, entity_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_user ON audit_logs (user_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS queue_tickets`);
    await queryRunner.query(`DROP TYPE IF EXISTS queue_ticket_status`);
  }
}
