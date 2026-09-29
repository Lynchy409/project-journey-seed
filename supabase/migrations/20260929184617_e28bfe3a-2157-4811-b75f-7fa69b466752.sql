UPDATE public.match_pairs
SET left_text = '-ent', right_text = '-ente'
WHERE left_text = '-ble' AND right_text = '-ble';