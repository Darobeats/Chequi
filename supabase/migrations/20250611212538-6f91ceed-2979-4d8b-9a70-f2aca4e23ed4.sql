
-- Add QR code field to attendees table
ALTER TABLE public.attendees ADD COLUMN qr_code TEXT UNIQUE;

-- Create QR templates table for category-based QR generation
CREATE TABLE public.qr_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.ticket_categories(id) NOT NULL,
  prefix TEXT NOT NULL DEFAULT 'EVT',
  pattern TEXT NOT NULL DEFAULT '{PREFIX}-{CATEGORY}-{ID}-{YEAR}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create function to generate unique QR code
CREATE OR REPLACE FUNCTION public.generate_qr_code(p_category_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
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

-- Create trigger to auto-generate QR codes for new attendees
CREATE OR REPLACE FUNCTION public.auto_generate_qr_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.qr_code IS NULL THEN
    NEW.qr_code := public.generate_qr_code(NEW.category_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_auto_generate_qr_code
  BEFORE INSERT ON public.attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_qr_code();

-- Insert default QR templates for existing categories
INSERT INTO public.qr_templates (category_id, prefix, pattern)
SELECT id, 'EVT', '{PREFIX}-{CATEGORY}-{ID}-{YEAR}'
FROM public.ticket_categories
ON CONFLICT DO NOTHING;

-- Update existing attendees with QR codes if they don't have them
UPDATE public.attendees 
SET qr_code = public.generate_qr_code(category_id)
WHERE qr_code IS NULL;
