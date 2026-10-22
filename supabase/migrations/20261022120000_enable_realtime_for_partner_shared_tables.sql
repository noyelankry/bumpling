-- Powers subscribeToTable() (lib/supabase.ts): pushes row changes for the
-- three screens where mom and her partner may be looking at the same data
-- at the same time (appointment detail, birth plan summary, shared brain
-- dump notes), instead of waiting for the next screen focus to refetch.
-- Existing RLS select policies (20261019120554) already scope what each
-- side of a pregnancy can see, including via postgres_changes.
alter publication supabase_realtime add table care_items;
alter publication supabase_realtime add table birth_preferences;
alter publication supabase_realtime add table brain_dump_entries;
