-- Feature 9: Room setup reference images
-- Add nullable column to store setup image URL for each room

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS setup_image_url text;

COMMENT ON COLUMN public.rooms.setup_image_url IS 'URL to room setup reference image stored in Supabase Storage or external URL';
