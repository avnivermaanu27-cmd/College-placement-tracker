USE college_placement_tracker;

-- Development-only seed accounts use the password "password". Change it locally.
INSERT INTO users (user_id, email, password_hash, role) VALUES
  (1, 'admin@college.test', '$2a$10$hD4XNSTid4tV6jPrnj1VUOjXiODE/cAubwfMZkytPzFIBr4F6I7Xm', 'admin'),
  (2, 'aarav@college.test', '$2a$10$hD4XNSTid4tV6jPrnj1VUOjXiODE/cAubwfMZkytPzFIBr4F6I7Xm', 'student'),
  (3, 'diya@college.test', '$2a$10$hD4XNSTid4tV6jPrnj1VUOjXiODE/cAubwfMZkytPzFIBr4F6I7Xm', 'student'),
  (4, 'kabir@college.test', '$2a$10$hD4XNSTid4tV6jPrnj1VUOjXiODE/cAubwfMZkytPzFIBr4F6I7Xm', 'student'),
  (5, 'recruiter@techcorp.test', '$2a$10$hD4XNSTid4tV6jPrnj1VUOjXiODE/cAubwfMZkytPzFIBr4F6I7Xm', 'company')
ON DUPLICATE KEY UPDATE
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  role = VALUES(role);

INSERT INTO admins (admin_id, user_id, name, email) VALUES
  (1, 1, 'Placement Administrator', 'admin@college.test')
ON DUPLICATE KEY UPDATE email = VALUES(email);

INSERT INTO students (student_id, user_id, name, email, branch, cgpa, skills, is_placed) VALUES
  (1, 2, 'Aarav Sharma', 'aarav@college.test', 'Information Technology', 8.40, 'javascript,sql,html', FALSE),
  (2, 3, 'Diya Patel', 'diya@college.test', 'Computer Science', 9.10, 'python,machine learning,sql', FALSE),
  (3, 4, 'Kabir Singh', 'kabir@college.test', 'Electronics', 7.60, 'c,embedded systems,python', FALSE)
ON DUPLICATE KEY UPDATE email = VALUES(email), skills = VALUES(skills);

INSERT INTO companies (company_id, user_id, name, location, package) VALUES
  (1, 5, 'TechCorp', 'Pune', 8.50),
  (2, NULL, 'DataWorks', 'Mumbai', 6.00)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO placement_drives (drive_id, company_id, drive_date, min_cgpa, eligible_branches, skills) VALUES
  (1, 1, '2027-01-15', 7.50, JSON_ARRAY('Information Technology', 'Computer Science'), 'javascript,sql,html'),
  (2, 2, '2027-02-10', 7.00, JSON_ARRAY('Information Technology', 'Computer Science', 'Electronics'), 'python,sql,data analysis')
ON DUPLICATE KEY UPDATE company_id = VALUES(company_id), skills = VALUES(skills);
