-- Restores the title snapshot captured at link-time (matches the original
-- AsyncStorage Entry shape) rather than requiring a join back to care_items.
alter table brain_dump_entries add column if not exists linked_appointment_title text;
