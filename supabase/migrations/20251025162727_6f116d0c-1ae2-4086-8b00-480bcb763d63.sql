-- Desactivar todos los eventos
UPDATE event_configs SET is_active = false WHERE is_active = true;

-- Activar el evento Club Militar
UPDATE event_configs 
SET is_active = true, updated_at = now() 
WHERE event_name = 'Club Militar';