USE college_placement_tracker;

ALTER TABLE students
  ADD COLUMN skills VARCHAR(255) NOT NULL DEFAULT '';

ALTER TABLE placement_drives
  ADD COLUMN skills VARCHAR(255) NOT NULL DEFAULT '';
