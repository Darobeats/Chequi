
-- Update existing functions to include search_path parameter for security

-- Update generate_qr_code function
CREATE OR REPLACE FUNCTION public.generate_qr_code(p_category_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT := 'EVT';
  v_category_code TEXT;
  v_random_id TEXT;
  v_year TEXT;
  v_qr_code TEXT;
  v_exists BOOLEAN := true;
BEGIN
  -- Get category name for code
  SELECT UPPER(LEFT(name, 3)) INTO v_category_code 
  FROM public.ticket_categories 
  WHERE id = p_category_id;
  
  -- Get current year
  v_year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  -- Generate unique QR code
  WHILE v_exists LOOP
    -- Generate random 4-character ID
    v_random_id := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 4));
    
    -- Construct QR code
    v_qr_code := v_prefix || '-' || v_category_code || '-' || v_random_id || '-' || v_year;
    
    -- Check if exists
    SELECT EXISTS(SELECT 1 FROM public.attendees WHERE qr_code = v_qr_code) INTO v_exists;
  END LOOP;
  
  RETURN v_qr_code;
END;
$$;

-- Update auto_generate_qr_code function
CREATE OR REPLACE FUNCTION public.auto_generate_qr_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.qr_code IS NULL THEN
    NEW.qr_code := public.generate_qr_code(NEW.category_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Update get_active_event_config function
CREATE OR REPLACE FUNCTION public.get_active_event_config()
RETURNS TABLE(id uuid, event_name text, primary_color text, secondary_color text, accent_color text, logo_url text, event_image_url text, font_family text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ec.id,
    ec.event_name,
    ec.primary_color,
    ec.secondary_color,
    ec.accent_color,
    ec.logo_url,
    ec.event_image_url,
    ec.font_family
  FROM public.event_configs ec
  WHERE ec.is_active = true
  LIMIT 1;
$$;
