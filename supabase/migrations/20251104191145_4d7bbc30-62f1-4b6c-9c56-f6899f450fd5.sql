-- Add visual editor fields to ticket_templates table
ALTER TABLE public.ticket_templates
ADD COLUMN IF NOT EXISTS canvas_width integer DEFAULT 800,
ADD COLUMN IF NOT EXISTS canvas_height integer DEFAULT 600,
ADD COLUMN IF NOT EXISTS elements jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS use_visual_editor boolean DEFAULT false;

COMMENT ON COLUMN public.ticket_templates.canvas_width IS 'Width of the canvas in pixels for visual editor';
COMMENT ON COLUMN public.ticket_templates.canvas_height IS 'Height of the canvas in pixels for visual editor';
COMMENT ON COLUMN public.ticket_templates.elements IS 'Array of positioned elements with {type, x, y, width, height, fontSize, fontFamily, textAlign, content} for visual editor';
COMMENT ON COLUMN public.ticket_templates.use_visual_editor IS 'Whether to use visual editor or form-based editor';