# Person 2 integration contract (short version)

Full version with sign-off table: `docs/person-2/CareQueue_Person2_Dependency_Record.pdf`.

## What Person 2 added outside its own modules (please review)

| File | Why | Owner after merge |
|---|---|---|
| `src/common/decorators/current-user.decorator.ts` | `@CurrentUser()` + `AuthenticatedUser` type matching `JwtStrategy.validate()` (`userId`, `fullName`, `email`, `role`) | Person 1 |
| `src/common/dto/pagination.dto.ts` | `page`/`limit` query DTO and `{ items, page, limit, total }` type | Shared |
| `src/common/audit/audit-logger.ts`, `audit-hook.module.ts` | `AUDIT_LOGGER` contract; prints to console until Person 4 binds the real service | Person 4 |
| `src/database/data-source.ts`, `migration:*` scripts in `package.json` | No migration runner existed; every member's migrations go in `src/database/migrations/` | Coordinator |
| `.env.example` | Was empty | Coordinator |

`app.module.ts`, `main.ts` and `nest-cli.json` were **not** changed.

## Person 1 (Auth/Users)

- Person 2 uses: `UserRole` (`src/common/enums/user-role.enum.ts`), `Roles`, `JwtAuthGuard`, `RolesGuard`, the `User` entity (relation only) and `UsersService.getProfile()` (to validate the account when creating a doctor).
- If `JwtStrategy.validate()` changes its return shape, update `AuthenticatedUser`.
- **Needed from Person 1:** a migration that creates `users` (Person 2's migration has a foreign key to it and must run after), and the missing `src/modules/patients/entities/patient.entity.ts` file (the branch does not compile without it).
- Doctor onboarding: `POST /users/staff` (role DOCTOR) -> `POST /doctors`.
- Deactivating a user (`PATCH /users/:id/deactivate`) hides that doctor from all public searches automatically.

## Person 3 (Appointments)

Import `SlotsModule`, inject `SlotsService`, and inside ONE transaction:

```ts
// book
await this.dataSource.transaction(async (m) => {
  const slot = await this.slotsService.lockSlotForBooking(m, dto.slotId); // SELECT ... FOR UPDATE + checks
  await this.slotsService.markSlotBooked(m, slot.id);                    // OPEN -> BOOKED
  return m.getRepository(Appointment).save({ patientId, slotId: slot.id, bookedByUserId: actor.userId, status: 'BOOKED' });
});
// cancel
await this.dataSource.transaction(async (m) => {
  await m.getRepository(Appointment).update(appt.id, { status: 'CANCELLED', cancelledAt: new Date() });
  await this.slotsService.releaseSlot(m, appt.slotId);                   // BOOKED -> OPEN (or BLOCKED if past / doctor inactive)
});
```

- `appointments.slot_id` -> `doctor_slots(id) ON DELETE RESTRICT`; keep `CREATE UNIQUE INDEX uq_appointments_active_slot ON appointments(slot_id) WHERE status <> 'CANCELLED';`
- Never update `doctor_slots.status` directly.
- `DELETE /doctors/:id` returns `futureBookedSlots`; Appointments must cancel or reschedule those.

## Person 4 (Queue/Audit)

- Make `AuditLogsService` implement `AuditLogger` and bind it in `src/common/audit/audit-hook.module.ts` (instructions in the file). Person 2's code does not change.
- Use `DoctorsService.getDoctorByUserId(req.user.userId)` to find the logged-in doctor's queue (import `DoctorsModule`).
- `queue_date` = slot `start_at` in the hospital time zone, not the UTC date.

## Migration order

1. Person 1: users (+ patients)  2. `1763000000000-Person2Schema`  3. `1763100000000-SlotBookedStatus`  4. Person 3: appointments  5. Person 4: queue tickets, audit logs.

```bash
npm run build && npm run migration:run
```
