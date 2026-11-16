-- Ordered per-student application listing; the existing unique key starts with student_id.
SET @optimization_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'applications'
      AND index_name = 'idx_applications_student_applied'
  ),
  'SELECT ''Skipping existing idx_applications_student_applied''',
  'CREATE INDEX idx_applications_student_applied ON applications (student_id, applied_at, application_id)'
);
PREPARE optimization_stmt FROM @optimization_sql;
EXECUTE optimization_stmt;
DEALLOCATE PREPARE optimization_stmt;

-- Helps the grouped status-count report.
SET @optimization_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'applications'
      AND index_name = 'idx_applications_status'
  ),
  'SELECT ''Skipping existing idx_applications_status''',
  'CREATE INDEX idx_applications_status ON applications (status)'
);
PREPARE optimization_stmt FROM @optimization_sql;
EXECUTE optimization_stmt;
DEALLOCATE PREPARE optimization_stmt;

-- Supports the global application list ordering.
SET @optimization_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'applications'
      AND index_name = 'idx_applications_applied'
  ),
  'SELECT ''Skipping existing idx_applications_applied''',
  'CREATE INDEX idx_applications_applied ON applications (applied_at, application_id)'
);
PREPARE optimization_stmt FROM @optimization_sql;
EXECUTE optimization_stmt;
DEALLOCATE PREPARE optimization_stmt;

-- Supports company drive filtering and the per-company date ordering.
SET @optimization_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'placement_drives'
      AND index_name = 'idx_drives_company_date'
  ),
  'SELECT ''Skipping existing idx_drives_company_date''',
  'CREATE INDEX idx_drives_company_date ON placement_drives (company_id, drive_date, drive_id)'
);
PREPARE optimization_stmt FROM @optimization_sql;
EXECUTE optimization_stmt;
DEALLOCATE PREPARE optimization_stmt;

-- Supports the global drive list ordering.
SET @optimization_sql = IF(
  EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'placement_drives'
      AND index_name = 'idx_drives_date'
  ),
  'SELECT ''Skipping existing idx_drives_date''',
  'CREATE INDEX idx_drives_date ON placement_drives (drive_date, drive_id)'
);
PREPARE optimization_stmt FROM @optimization_sql;
EXECUTE optimization_stmt;
DEALLOCATE PREPARE optimization_stmt;
