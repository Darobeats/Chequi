-- Agregar columnas a ticket_templates para soporte de imagen de fondo
ALTER TABLE public.ticket_templates
ADD COLUMN background_image_url TEXT,
ADD COLUMN background_opacity DECIMAL DEFAULT 0.15 CHECK (background_opacity >= 0 AND background_opacity <= 1),
ADD COLUMN background_mode TEXT DEFAULT 'tile' CHECK (background_mode IN ('tile', 'cover', 'contain'));

-- Crear bucket para imágenes de fondo de tickets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-backgrounds', 
  'ticket-backgrounds', 
  true,
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
);

-- Política RLS: Admins pueden subir imágenes de fondo
CREATE POLICY "Admins can upload ticket backgrounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-backgrounds' AND
  (get_current_user_role() = 'admin'::user_role)
);

-- Política RLS: Admins pueden actualizar imágenes de fondo
CREATE POLICY "Admins can update ticket backgrounds"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ticket-backgrounds' AND
  (get_current_user_role() = 'admin'::user_role)
);

-- Política RLS: Admins pueden eliminar imágenes de fondo
CREATE POLICY "Admins can delete ticket backgrounds"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-backgrounds' AND
  (get_current_user_role() = 'admin'::user_role)
);

-- Política RLS: Todos pueden ver las imágenes de fondo (público)
CREATE POLICY "Everyone can view ticket backgrounds"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ticket-backgrounds');