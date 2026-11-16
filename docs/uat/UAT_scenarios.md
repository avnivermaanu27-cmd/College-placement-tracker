# UAT Scenarios

Use the approved UAT environment and demo accounts listed in [UAT_plan.md](./UAT_plan.md). Do not use production or modify existing personal records. For each task, record Pass or Fail, ease from 1 to 5, and any message or feedback.

## Student

Sign in at `/login.html` as `aarav@college.test`.

1. Open **Recommended** (`/student/recommendations.html`). Find a recommended drive and review its match score and explanation.
2. Apply to a suitable drive using its **Apply** action.
3. Open **My applications** (`/student/applications.html`) and confirm the application and status appear.
4. Return to the same drive and try to apply again. Read and record the message.
5. On the login page, enter the student email and one incorrect password. Read and record the error, then sign in correctly.
6. Open **My profile** (`/student/profile.html`) and try an out-of-range CGPA, such as `11`. Read the validation message. Do not save an invalid profile.

## Admin (placement officer)

Sign in at `/login.html` as `admin@college.test`.

1. Open **Students** (`/admin/students.html`) and attempt to add a clearly identified UAT student.
   - **Known limitation:** the current page shows and edits student records but has no add-student form. Record this task as Fail/Blocked; do not create the student through an API, database, or another user’s account.
2. Open **Drives** (`/admin/drives.html`) and create a clearly identified UAT drive for a demo company, using a future date and valid branch and CGPA details.
3. Open the **Dashboard** (`/admin/dashboard.html`) and view the placement report.
4. After a student has applied to a drive, open **Applications** (`/admin/applications.html`) and update its status using the status selector.
5. On `/login.html`, enter the admin email and one incorrect password. Read and record the error, then sign in correctly.
6. Open `/admin/drives.html`, enter an invalid minimum CGPA such as `11`, and read the browser validation message. Do not submit the invalid drive.

## Company

Sign in at `/login.html` as `recruiter@techcorp.test`.

1. Open **Applications** (`/company/applications.html`) and confirm only applicants to the company’s drives are shown. A student must have applied during this UAT for this task to have an applicant.
2. Change an applicant’s status to **Shortlisted**, then to **Selected**. Confirm the updated status is displayed.
3. On `/login.html`, enter the company email and one incorrect password. Read and record the error, then sign in correctly.
4. The company pages do not contain a CGPA entry field. To test the CGPA validation message without accessing another role’s pages, open `/register.html`, enter an invalid CGPA such as `11`, and read the browser validation message. Do not submit the form or create an account.

## Shared login and CGPA checks

- Each role tester performs the incorrect-password check on `/login.html` using their own demo email.
- Student and admin testers check the invalid-CGPA validation on the role pages listed above. The company tester uses the public registration form because company pages have no CGPA field.
- Do not submit any invalid values.
