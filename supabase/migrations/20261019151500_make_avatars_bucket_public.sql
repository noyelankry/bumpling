-- The original bucket insert (20240403090422_init.sql) never set `public`,
-- so it defaulted to false. getPublicUrl() still happily returns a
-- /object/public/... URL either way, but Storage's public-object endpoint
-- checks the bucket's own `public` flag directly — it doesn't consult our
-- RLS select policy at all — so every "public" avatar URL was 400ing and
-- <Image> just rendered nothing (the surrounding placeholder background,
-- no visible photo). Flip the flag so those URLs actually resolve.
update storage.buckets set public = true where id = 'avatars';
