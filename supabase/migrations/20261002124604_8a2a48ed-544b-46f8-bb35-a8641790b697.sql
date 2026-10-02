ALTER TABLE public.match_decks ADD COLUMN mode text NOT NULL DEFAULT 'match';
ALTER TABLE public.match_scores ADD COLUMN mode text NOT NULL DEFAULT 'match';