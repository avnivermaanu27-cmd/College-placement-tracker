CREATE DATABASE IF NOT EXISTS college_placement_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE college_placement_tracker;

CREATE TABLE IF NOT EXISTS users (
  user_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'admin', 'company') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email)
);

CREATE TABLE IF NOT EXISTS students (
  student_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  branch VARCHAR(100) NOT NULL,
  cgpa DECIMAL(4, 2) NOT NULL,
  is_placed BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (student_id),
  UNIQUE KEY uq_students_email (email),
  UNIQUE KEY uq_students_user_id (user_id),
  CONSTRAINT chk_students_cgpa CHECK (cgpa >= 0 AND cgpa <= 10),
  CONSTRAINT fk_students_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS companies (
  company_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  location VARCHAR(150) NOT NULL,
  package DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (company_id),
  UNIQUE KEY uq_companies_user_id (user_id),
  CONSTRAINT chk_companies_package CHECK (package >= 0),
  CONSTRAINT fk_companies_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admins (
  admin_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  PRIMARY KEY (admin_id),
  UNIQUE KEY uq_admins_email (email),
  UNIQUE KEY uq_admins_user_id (user_id),
  CONSTRAINT fk_admins_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS placement_drives (
  drive_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT UNSIGNED NOT NULL,
  drive_date DATE NOT NULL,
  min_cgpa DECIMAL(4, 2) NOT NULL,
  eligible_branches JSON NOT NULL,
  PRIMARY KEY (drive_id),
  CONSTRAINT chk_drives_min_cgpa CHECK (min_cgpa >= 0 AND min_cgpa <= 10),
  CONSTRAINT fk_drives_company
    FOREIGN KEY (company_id) REFERENCES companies (company_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
  application_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  drive_id INT UNSIGNED NOT NULL,
  status ENUM('Applied', 'Shortlisted', 'Selected', 'Rejected')
    NOT NULL DEFAULT 'Applied',
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (application_id),
  UNIQUE KEY uq_applications_student_drive (student_id, drive_id),
  CONSTRAINT fk_applications_student
    FOREIGN KEY (student_id) REFERENCES students (student_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_applications_drive
    FOREIGN KEY (drive_id) REFERENCES placement_drives (drive_id)
    ON DELETE CASCADE
);
