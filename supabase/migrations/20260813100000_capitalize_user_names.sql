UPDATE public.users
SET first_name = upper(left(trim(first_name), 1)) || substring(trim(first_name) from 2)
WHERE first_name IS NOT NULL
  AND trim(first_name) <> '';

UPDATE public.users
SET last_name = upper(left(trim(last_name), 1)) || substring(trim(last_name) from 2)
WHERE last_name IS NOT NULL
  AND trim(last_name) <> '';
