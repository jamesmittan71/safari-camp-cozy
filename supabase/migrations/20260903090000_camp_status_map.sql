-- Feature: Camp status map
-- Existing camp and room records remain valid because these fields are nullable.

ALTER TABLE public.camps
  ADD COLUMN IF NOT EXISTS map_image_path text;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS map_x numeric,
  ADD COLUMN IF NOT EXISTS map_y numeric;

ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_map_x_range CHECK (map_x IS NULL OR (map_x >= 0 AND map_x <= 100)),
  ADD CONSTRAINT rooms_map_y_range CHECK (map_y IS NULL OR (map_y >= 0 AND map_y <= 100));

COMMENT ON COLUMN public.camps.map_image_path IS
  'Public URL or path for the optional overhead camp map image.';
COMMENT ON COLUMN public.rooms.map_x IS
  'Optional horizontal map marker position as a percentage from 0 to 100.';
COMMENT ON COLUMN public.rooms.map_y IS
  'Optional vertical map marker position as a percentage from 0 to 100.';
