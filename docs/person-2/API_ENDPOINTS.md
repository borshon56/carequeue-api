# CareQueue Person 2 REST endpoints

Base URL: `http://localhost:3000` (or your `PORT`). Body: `Content-Type: application/json`.
Interactive docs: **Swagger UI at `/docs`** (click *Authorize* and paste the `access_token` from `POST /auth/login`).

Getting tokens (Person 1's module): `POST /auth/login` with `{ "email", "password" }` returns `access_token`. An admin creates a doctor's login with `POST /users/staff` (`role: "DOCTOR"`), then creates the doctor profile with `POST /doctors`.

`ADMIN` and `DOCTOR` routes require `Authorization: Bearer <JWT>`. The role is read from the current active database user, never from the request body. List endpoints return `{ items, page, limit, total }` and accept `page` (default 1) and `limit` (default 20, max 100).

| Method | Route | Authorized | Description |
|---|---|---|---|
| GET | `/` | Public | Health |
| GET | `/departments` | Public | List |
| GET | `/departments/:id` | Public | Read |
| POST | `/departments` | ADMIN | Create |
| PATCH | `/departments/:id` | ADMIN | Update |
| DELETE | `/departments/:id` | ADMIN | Delete (409 if doctors assigned) |
| GET | `/specializations` | Public | List |
| GET | `/specializations/:id` | Public | Read |
| POST | `/specializations` | ADMIN | Create |
| PATCH | `/specializations/:id` | ADMIN | Update |
| DELETE | `/specializations/:id` | ADMIN | Delete (409 if assigned) |
| GET | `/doctors` | Public | Paginated search of active doctors: `departmentId`, `specializationId`, `search` (name or license) |
| GET | `/doctors/me` | DOCTOR | Own doctor profile (404 if admin has not created it yet) |
| GET | `/doctors/admin/:id` | ADMIN | Any doctor, including inactive |
| GET | `/doctors/:id` | Public | Active doctor profile with department and specializations |
| POST | `/doctors` | ADMIN | Create doctor profile for an existing active `DOCTOR` user |
| PATCH | `/doctors/:id` | ADMIN | Edit department, license, bio |
| DELETE | `/doctors/:id` | ADMIN | Deactivate: blocks future OPEN slots, returns future BOOKED slots |
| POST | `/doctors/:id/reactivate` | ADMIN | Reactivate (blocked slots stay blocked) |
| POST | `/doctors/:id/specializations/:specializationId` | ADMIN | Assign specialization |
| DELETE | `/doctors/:id/specializations/:specializationId` | ADMIN | Unassign |
| GET | `/slots/available` | Public | Paginated future OPEN slots of active doctors: `doctorId`, `departmentId`, `from`, `to` (max 31 days) |
| GET | `/slots/me` | DOCTOR | Own slots, all statuses |
| GET | `/slots/doctor/:doctorId` | ADMIN / owning DOCTOR | All slots of a doctor, all statuses |
| GET | `/slots/:id` | ADMIN / owning DOCTOR | One slot |
| POST | `/slots` | ADMIN / DOCTOR | Create one OPEN or BLOCKED future slot (10-240 min). `doctorId` required for ADMIN, optional for DOCTOR |
| POST | `/slots/generate` | ADMIN / DOCTOR | Create back-to-back slots for a block of up to 24 h / 48 slots, all or nothing |
| PATCH | `/slots/:id` | ADMIN / owning DOCTOR | Change times or block/unblock a future, unbooked slot |
| DELETE | `/slots/:id` | ADMIN / owning DOCTOR | Delete a future, unbooked slot without appointment history |

## Example bodies

Create doctor (the user must already exist with role `DOCTOR`, created by Person 1's `POST /users/staff`):

```json
{ "userId": "<id returned by POST /users/staff>", "departmentId": "<uuid>", "licenseNumber": "BMDC-12345", "bio": "Consultant cardiologist" }
```

Create one slot (doctor token; `doctorId` comes from the token):

```json
{ "startAt": "2027-01-20T09:00:00+06:00", "endAt": "2027-01-20T09:30:00+06:00" }
```

Generate a morning of 30-minute slots (8 slots):

```json
{ "from": "2027-01-21T09:00:00+06:00", "to": "2027-01-21T13:00:00+06:00", "durationMinutes": 30 }
```

Block / reopen a slot: `{ "status": "BLOCKED" }` / `{ "status": "OPEN" }`. Clients can never set `BOOKED`.

Deactivate response:

```json
{ "message": "Doctor deactivated; historical records preserved", "blockedOpenSlots": 7,
  "futureBookedSlots": [ { "slotId": "<uuid>", "startAt": "2026-11-20T03:00:00.000Z" } ] }
```

## Error handling to demonstrate

- **400** invalid UUID or DTO, missing time-zone offset, slot in the past, end before start, slot shorter than 10 / longer than 240 minutes, generate block not a multiple of the slot length, empty name, `status: "BOOKED"` from a client, admin creating a slot without `doctorId`.
- **401** missing/expired/invalid token.
- **403** a doctor managing another doctor's slots, or a doctor calling an ADMIN route.
- **404** missing doctor/department/specialization/slot; inactive doctor on public routes; `/doctors/me` with no profile.
- **409** duplicate license / department / specialization / doctor profile, duplicate assignment, overlapping slots, editing or deleting a BOOKED slot, deleting a slot with appointment history, deleting a department in use, deactivating an inactive doctor.

Overlaps are prevented three ways: a per-doctor row lock in the transaction, a pre-check that gives a clear 409, and the PostgreSQL `EXCLUDE USING gist` constraint that guarantees it even under concurrent requests. Touching slots (`09:00-09:30` and `09:30-10:00`) are allowed because ranges are `[start, end)`.
