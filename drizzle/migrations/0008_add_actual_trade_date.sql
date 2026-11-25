ALTER TABLE public.trades ADD COLUMN traded_on date;
UPDATE public.trades SET traded_on = date;
COMMENT ON COLUMN public.trades.date IS 'DEPRECATED: actual trade date is traded_on; retained as a legacy ordering anchor for older clients and undated imported records.';