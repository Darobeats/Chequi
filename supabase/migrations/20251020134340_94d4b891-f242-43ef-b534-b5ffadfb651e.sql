-- Change email column to cedula (ID number) in attendees table
-- This column will store numeric ID numbers instead of email addresses

ALTER TABLE attendees 
RENAME COLUMN email TO cedula;

-- Update the column to allow storing numeric strings
-- Keep it as text to preserve leading zeros and handle different ID formats
ALTER TABLE attendees 
ALTER COLUMN cedula TYPE text;

-- Add a comment to document the change
COMMENT ON COLUMN attendees.cedula IS 'Número de cédula del asistente (ID number)';