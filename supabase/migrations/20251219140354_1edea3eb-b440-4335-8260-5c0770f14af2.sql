-- Add column to track if cedula was on whitelist when scanned
ALTER TABLE cedula_registros 
ADD COLUMN was_on_whitelist boolean DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN cedula_registros.was_on_whitelist IS 'Indicates if the cedula was on the authorized whitelist at scan time. NULL = whitelist not required, true = was authorized, false = was not on list';