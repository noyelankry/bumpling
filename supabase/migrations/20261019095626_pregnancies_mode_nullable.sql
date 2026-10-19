-- The real onboarding flow saves the LMP date before the user has chosen
-- booked-vs-catchup, so the row must be insertable with mode still unknown.
alter table pregnancies alter column mode drop not null;
