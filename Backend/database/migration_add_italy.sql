-- Add Italy to countries table (Switzerland and Spain already exist)
INSERT INTO public.countries (name, code, currency, flag_emoji)
VALUES ('Italy', 'IT', 'EUR', '🇮🇹')
ON CONFLICT (code) DO NOTHING;
