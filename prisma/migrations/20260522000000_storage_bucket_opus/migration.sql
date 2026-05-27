-- Storage bucket accepts audio/opus uploads.
--
-- The application allowlist (lib/storage/audio.ts) and the sample fixture
-- already use opus; the bucket's allowed_mime_types was the only thing
-- rejecting these uploads.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/x-wav',
  'audio/webm', 'audio/ogg', 'audio/opus', 'audio/flac', 'audio/x-m4a',
  'audio/m4a'
]
WHERE id = 'call-audio';
