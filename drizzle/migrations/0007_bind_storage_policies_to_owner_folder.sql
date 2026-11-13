DROP POLICY IF EXISTS "Users can delete their own trade screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can replace their own trade screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own trade screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own trade screenshots" ON storage.objects;
DROP POLICY IF EXISTS "own workout media delete" ON storage.objects;
DROP POLICY IF EXISTS "own workout media insert" ON storage.objects;
DROP POLICY IF EXISTS "own workout media select" ON storage.objects;

CREATE POLICY "Users can view their own trade screenshots" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = (select auth.uid()::text));
CREATE POLICY "Users can upload their own trade screenshots" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = (select auth.uid()::text));
CREATE POLICY "Users can replace their own trade screenshots" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = (select auth.uid()::text))
WITH CHECK (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = (select auth.uid()::text));
CREATE POLICY "Users can delete their own trade screenshots" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = (select auth.uid()::text));

CREATE POLICY "own workout media select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'workout-media' AND (storage.foldername(name))[1] = (select auth.uid()::text));
CREATE POLICY "own workout media insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'workout-media' AND (storage.foldername(name))[1] = (select auth.uid()::text));
CREATE POLICY "own workout media delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'workout-media' AND (storage.foldername(name))[1] = (select auth.uid()::text));