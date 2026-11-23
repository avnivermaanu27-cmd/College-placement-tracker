# User Manual

## Sign in

1. Open the application login page.
2. Enter your email address and password, then choose **Sign in**.
3. After successful login, the application opens the dashboard for the account's role.
4. For a new student account, use **Register** on the login page and complete the form.

Development demo accounts are defined in [`database/seed.sql`](../database/seed.sql). Use that file as the source of truth; this manual does not reproduce account credentials.

## Student portal

### Recommended drives and match scores

1. From the student navigation, open **Recommended**.
2. The table ranks eligible drives and displays the company, match score, and an explanation.
3. Choose **Refresh** to reload recommendations. If there are no eligible drives, the page displays a message.

Recommendations are based on CGPA, branch, and skills; see [Technical Documentation](TECHNICAL_DOCUMENTATION.md#recommendation-match-score) for the score calculation. A recommendation is not a guarantee of application eligibility: the server checks eligibility again when an application is submitted.

### Apply

1. Choose **Apply** in a recommended drive row. You can also open **Placement drives** and choose **Apply** from its drive list.
2. The page displays a success message when the application is submitted.
3. If the application is not accepted, read the displayed error. The server checks minimum CGPA and eligible branch, and prevents duplicate applications.

### My applications and statuses

1. Open **My applications** to see the company, drive date, application date, and latest status.
2. Choose **Refresh** to reload the list.
3. New applications start as **Applied**. Administrators or the company associated with the drive can update them:
   - **Applied** can become **Shortlisted** or **Rejected**.
   - **Shortlisted** can become **Selected** or **Rejected**.
   - **Selected** and **Rejected** are final states in the application update logic.
4. When an application becomes **Selected**, the student's placed flag is set.

Students can also use **Dashboard** to see profile/placement information and **My profile** to update their name, branch, CGPA, and skills.

## Admin portal

Sign in with an admin account. The admin navigation provides **Students**, **Companies**, **Drives**, and **Applications**; the dashboard shows placement summary totals.

### Students and companies

- **Students** lists student records and provides the page's available student update/delete actions.
- **Companies** lists companies and provides the company form and delete action.
- Create a company before creating a drive if the company list is empty.

### Create a drive

1. Open **Drives**.
2. Select a company.
3. Enter the drive date and minimum CGPA (0 through 10).
4. Enter one or more eligible branch names separated by commas.
5. Optionally enter comma-separated skills.
6. Choose **Create drive**. The drive list below the form refreshes after a successful creation.

### Review applications

1. Open **Applications** to view all applications.
2. Use the status selector for an application to set **Shortlisted**, **Selected**, or **Rejected**, subject to the allowed transitions above.
3. Choose **Refresh** to reload the list. A failed update displays an error and restores the previous selection.

## Common messages

- **Invalid email or password.** Check the email and password.
- **Too many failed login attempts. Try again later.** Login attempts from that client are temporarily locked.
- **A valid Bearer token is required.** Sign in again if the session has expired or the token is missing.
- **You do not have permission to access this resource.** Sign in with an account whose role is allowed to use that page or action.
- **Your CGPA is below the minimum required for this drive.** The server rejected the application because the drive minimum is higher than the student's CGPA.
- **Your branch is not eligible for this drive.** Check the drive's listed eligible branch names.
- **You have already applied to this drive.** A student can submit only one application for a given drive.
- **This company account is not linked to a company profile.** The company login needs a linked company record.
- **Application status cannot change from ...** The requested status transition is not allowed.
- **Could not load... / Unable to connect.** Check the connection and service status, then retry. If the problem persists, contact the project administrator.
