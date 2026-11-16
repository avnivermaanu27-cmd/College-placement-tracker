# User Acceptance Testing Plan

## Purpose

Confirm that students, placement officers, and company representatives can use the College Placement Tracker’s real pages for common placement tasks. Record whether each task succeeds, how easy it is, and what should be improved.

## Pilot group

- 3 to 5 students
- 1 to 2 placement officers (admin users)
- Optional: 1 company representative

## Demo accounts

The development seed file lists these demo accounts. They use the development-only password `password`:

| Role | Demo email |
|---|---|
| Student | `aarav@college.test` |
| Student | `diya@college.test` |
| Student | `kabir@college.test` |
| Placement officer (admin) | `admin@college.test` |
| Company | `recruiter@techcorp.test` |

Use these only on a dedicated test/UAT environment with seeded demo data. Do not run these scenarios against production or personal records. If the demo accounts are not present, ask the environment owner to prepare the UAT data; do not alter real accounts or data to make the test work.

## How to run the test

1. Start the application and open `http://localhost:3000/login.html` (or the approved UAT URL).
2. Give each tester the account for their role and the scenarios in [UAT_scenarios.md](./UAT_scenarios.md). Ask them to work without coaching.
3. Use a single incorrect-password attempt per role, then sign in with the correct demo account. This avoids triggering the login-attempt lock.
4. Use new, clearly marked test details when creating records. Do not delete or overwrite existing demo or real data.
5. Record each result, ease rating, feedback, and suggestion in [UAT_feedback_form.md](./UAT_feedback_form.md). Record accepted refinements in [UAT_refinements.md](./UAT_refinements.md).
6. If a task cannot be completed because the page does not support it, record it as Fail/Blocked and explain why. Do not use database edits or undocumented workarounds.

## Pass criteria

A scenario passes when the tester completes it without help and gives it an ease rating of 3 or more out of 5. A task blocked by a missing page feature does not pass. Record the exact message shown for validation and login tests.
