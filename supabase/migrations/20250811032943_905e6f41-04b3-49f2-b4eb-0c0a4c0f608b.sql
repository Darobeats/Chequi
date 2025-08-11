-- Fix foreign key constraints to allow proper deletion

-- Drop and recreate the attendees category foreign key with CASCADE
ALTER TABLE public.attendees 
DROP CONSTRAINT attendees_category_id_fkey;

ALTER TABLE public.attendees 
ADD CONSTRAINT attendees_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES public.ticket_categories(id) 
ON DELETE RESTRICT;

-- Drop and recreate the control_usage control_type foreign key with CASCADE  
ALTER TABLE public.control_usage 
DROP CONSTRAINT control_usage_control_type_id_fkey;

ALTER TABLE public.control_usage 
ADD CONSTRAINT control_usage_control_type_id_fkey 
FOREIGN KEY (control_type_id) REFERENCES public.control_types(id) 
ON DELETE CASCADE;