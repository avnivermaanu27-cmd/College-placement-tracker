# Technical Documentation

## Technology stack

- Node.js (the Dockerfile uses Node 20) and Express 4
- MySQL with `mysql2`
- Plain HTML, CSS, and browser JavaScript in `public/`
- JWT authentication (`jsonwebtoken`) and password hashing (`bcryptjs`)
- Automated tests use Node's built-in test runner

The declared runtime dependencies are `express`, `cors`, `dotenv`, `jsonwebtoken`, `mysql2`, and `bcryptjs`. `nodemon` is a development dependency.

## Project structure

- `server.js` — loads environment variables, configures Express, mounts API routes, and starts the server after checking JWT configuration and connecting to MySQL.
- `config/` — database-pool and JWT configuration.
- `controllers/` — authentication, student, company, drive, application, reporting, and recommendation handlers.
- `routes/` — API route definitions and role checks.
- `middleware/` — authentication/authorization, async error forwarding, login-attempt limiting, and response headers.
- `database/` — schema, optimization indexes, seed data, and the Milestone 3 migration.
- `public/` — login and registration pages, student/admin/company portals, styles, and browser-side API helpers.
- `tests/` — unit, validation, security, and integration tests.
- `utils/` — shared matching and input-validation helpers.
- `Dockerfile` and `docker-compose.yml` — container build and local app/database services.
- `docs/uat/` — existing user-acceptance-testing documents.

## Database

The schema in `database/schema.sql` creates these tables and columns:

| Table | Columns |
| --- | --- |
| `users` | `user_id`, `email`, `password_hash`, `role`, `created_at` |
| `students` | `student_id`, `user_id`, `name`, `email`, `branch`, `cgpa`, `skills`, `is_placed` |
| `companies` | `company_id`, `user_id`, `name`, `location`, `package` |
| `admins` | `admin_id`, `user_id`, `name`, `email` |
| `placement_drives` | `drive_id`, `company_id`, `drive_date`, `min_cgpa`, `eligible_branches`, `skills` |
| `applications` | `application_id`, `student_id`, `drive_id`, `status`, `applied_at` |

The schema defines the user roles as `student`, `admin`, and `company`; application statuses are `Applied`, `Shortlisted`, `Selected`, and `Rejected`. It includes foreign keys, unique constraints, and CGPA/package checks. `optimization.sql` adds indexes for application and drive queries. The `skills` columns are already in `schema.sql`; `migration_milestone3.sql` attempts to add those columns again and is not part of the Compose initialization mounts.

## API

All endpoints below are prefixed with `/api`. Protected endpoints require an `Authorization: Bearer <JWT>` header.

| Method | Path | Who can use it |
| --- | --- | --- |
| `POST` | `/students/register` | Public |
| `POST` | `/login` | Public |
| `GET` | `/auth/me` | Authenticated admin, student, or company |
| `GET` | `/auth/admin-check` | Admin |
| `GET` | `/health` | Authenticated admin, student, or company |
| `GET` | `/students/me` | Student |
| `PUT` | `/students/me` | Student |
| `GET` | `/students` | Admin |
| `POST` | `/students` | Admin |
| `GET` | `/students/:id` | Admin |
| `PUT` | `/students/:id` | Admin |
| `DELETE` | `/students/:id` | Admin |
| `GET` | `/companies` | Authenticated admin, student, or company |
| `GET` | `/companies/:id` | Authenticated admin, student, or company |
| `POST` | `/companies` | Admin |
| `PUT` | `/companies/:id` | Admin or company |
| `DELETE` | `/companies/:id` | Admin |
| `GET` | `/drives` | Authenticated admin, student, or company |
| `GET` | `/drives/:id` | Authenticated admin, student, or company |
| `POST` | `/drives` | Admin or company |
| `PUT` | `/drives/:id` | Admin or company |
| `DELETE` | `/drives/:id` | Admin or company |
| `GET` | `/applications` | Authenticated admin, student, or company |
| `POST` | `/applications` | Student |
| `PUT` | `/applications/:id` | Admin or company |
| `GET` | `/reports` | Admin |
| `GET` | `/recommendations/:studentId` | Admin or student; students can view only their own recommendations |

Company drive and application operations are restricted in controller logic to the company linked to the signed-in account.

## Authentication and roles

Login verifies the supplied password against a bcrypt hash and returns a JWT. The browser stores the token and role in `localStorage`; API calls use the token as a Bearer token. Tokens are signed with HS256, include the user ID as `sub` and the role as a claim, and expire according to `JWT_EXPIRES_IN` (default `1d`). Startup validates that `JWT_SECRET` is set and at least 32 characters long.

`authenticateToken` verifies the token, its algorithm, positive numeric subject, and role. `authorizeRoles` enforces endpoint role requirements. Missing/invalid authentication returns HTTP 401; an authenticated user with the wrong role receives HTTP 403.

## Recommendation match score

`utils/matching.js` first checks eligibility: the student's CGPA must be at least the drive minimum, and the student's branch must appear in the eligible branches. The branch value `ALL` is treated case-insensitively as allowing any branch for recommendations.

For eligible drives, the score is the sum of:

- CGPA: `40 * CGPA / 10`
- Branch: 30 points for an explicitly listed branch, or 20 points when eligibility is via `ALL`
- Skills: 30 multiplied by the fraction of required skills also present in the student's skills; if the drive has no required skills, this component is 15 points

Skills are trimmed and compared case-insensitively. The total is rounded to one decimal place. Eligible drives are ranked by descending score, with drive ID ascending as the tie-breaker. The API also returns a short explanation of CGPA, branch, and skill matches.

Application submission performs a separate server-side check of minimum CGPA and exact branch membership. Unlike recommendation eligibility, that application check does not treat `ALL` as a wildcard.

## Security measures visible in the code

- Passwords are bcrypt-hashed with a cost factor of 10; the database stores `password_hash`.
- SQL calls use prepared execution with bound values for request data.
- Input validation constrains fields such as IDs, email, CGPA, skills, branch names, and dates.
- Login attempts are tracked in memory per client IP: five failed attempts within the configured 15-minute window trigger a 15-minute lock. This limiter is process-local.
- JSON request bodies are limited to 100 KB.
- Responses set `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and a `Permissions-Policy` disabling camera, microphone, and geolocation.
- Ownership checks restrict companies to their own drives/applications, and students to their own profile, applications, and recommendations.
- The error handler logs server-side errors and returns a generic message for HTTP 5xx responses.

## Automated tests

The test files cover application rules, JWT/role middleware, integration flows, login throttling, matching and validation, report access, resource validation, and security behavior:

- `tests/applicationRules.test.js`
- `tests/authMiddleware.test.js`
- `tests/integration.test.js`
- `tests/loginAttemptLimiter.test.js`
- `tests/matching.test.js`
- `tests/matchingValidation.test.js`
- `tests/reportRoutes.test.js`
- `tests/resourceValidation.test.js`
- `tests/security.test.js`

Run the complete suite with `npm test` (`node --test`). `npm run selftest` runs only `tests/matchingValidation.test.js`.
