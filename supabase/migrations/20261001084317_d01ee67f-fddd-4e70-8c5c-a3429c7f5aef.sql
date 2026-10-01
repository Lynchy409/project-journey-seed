-- Trade screenshots: private bucket, user-scoped access

CREATE POLICY "Users can upload their own trade screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'trade-screenshots'
  AND name LIKE auth.uid()::text || '/%'
);

CREATE POLICY "Users can view their own trade screenshots"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'trade-screenshots'
  AND name LIKE auth.uid()::text || '/%'
);

CREATE POLICY "Users can delete their own trade screenshots"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'trade-screenshots'
  AND name LIKE auth.uid()::text || '/%'
);

CREATE POLICY "Users can replace their own trade screenshots"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'trade-screenshots'
  AND name LIKE auth.uid()::text || '/%'
)
WITH CHECK (
  bucket_id = 'trade-screenshots'
  AND name LIKE auth.uid()::text || '/%'
);