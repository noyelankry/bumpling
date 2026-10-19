-- `mode` wrongly modeled catch-up and booked completion as mutually
-- exclusive. The real flow runs both steps in sequence (catch-up, then
-- booked) — markBookedDone() was silently un-setting catch-up completion by
-- overwriting the same column. Split into two independent flags, matching
-- the original AsyncStorage CATCHUP_KEY / BOOKED_KEY semantics exactly.
alter table pregnancies add column catchup_done boolean not null default false;
alter table pregnancies add column booked_done boolean not null default false;

update pregnancies set catchup_done = true where mode = 'catchup';
update pregnancies set booked_done = true where mode = 'booked';

alter table pregnancies drop column mode;
