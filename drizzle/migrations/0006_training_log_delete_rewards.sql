CREATE OR REPLACE FUNCTION public.remove_training_log(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 PERFORM public.delete_fitness_workout(p_id);
 DELETE FROM public.driver_logs WHERE user_id=auth.uid() AND evidence LIKE '[workout:' || p_id::text || ']%';
END $$;
REVOKE ALL ON FUNCTION public.remove_training_log(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_training_log(uuid) TO authenticated;