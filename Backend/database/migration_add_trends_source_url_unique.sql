DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.trends'::regclass
          AND contype = 'u'
          AND pg_get_constraintdef(oid) = 'UNIQUE (source_url)'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'trends'
          AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
          AND REPLACE(indexdef, ' ', '') LIKE '%(source_url)%'
    ) THEN
        ALTER TABLE public.trends
            ADD CONSTRAINT trends_source_url_key UNIQUE (source_url);
    END IF;
END $$;
