# Backend Migration — Technical Guide

For whoever (human or agent) implements the Supabase migration described in the product-level backend plan. This document is the executable version of that plan: real table definitions, real file-by-file porting instructions, grounded in the actual shapes currently in `lib/*.ts` and `app/(tabs)/health.tsx` — not a generic schema.

## 0. Decided inputs — don't re-litigate these

- **Minimum age: 18.** Self-attestation checkbox at signup, no DOB collection.
- **EU users: yes.** Requires picking an EU region when the real Supabase project is created — **this is a manual dashboard step, not scriptable**, and the region can't be changed after creation (moving regions later means a new project + full data migration). Confirm the exact region (e.g. Frankfurt `eu-central-1`) with the product owner before creating it.
- **Offline support: undecided.** Affects Step 9 below (whether AsyncStorage is removed outright or kept as a sync cache). Don't remove it as a read path until this is answered.
- **Partner-access timeline: undecided.** Build `pregnancy_members` now regardless (Step 3) — it's cheap scaffolding. The invite/login flow itself is separate, larger-scoped work.

## 1. Current inventory

| File | AsyncStorage key(s) | Shape |
|---|---|---|
| `lib/carePlan.ts` | `bumpling_care_items`, `bumpling_lmp`, `bumpling_catchup_done`, `bumpling_booked_done` | `CareItemWithCustom[]`, LMP `Date`, two boolean flags |
| `app/(tabs)/health.tsx` | `bumpling_health_checkins` | `CheckIn[]`: `{ date, mood, symptoms, note, weight, bloodPressure, loggedAt }` |
| `lib/brainDump.ts` | `bumpling_brain_dump` | `Entry[]`: `{ id, text, details?, kind, tags, linkedAppointmentId?, linkedAppointmentTitle?, done, createdAt }` |
| `lib/birthPrefs.ts` | `bumpling_birth_prefs` | `{ answers: Partial<Record<TopicId,string>>, supportContacts: SupportContact[] }` |
| `lib/partner.ts` | `bumpling_partner` | `{ name, email }` |
| `lib/momContact.ts` | `bumpling_mom_contact` | plain phone string |
| `lib/devBypass.ts` | `bumpling_dev_bypass` | boolean flag, `__DEV__`-gated — confirmed by its own comment to never ship in release; worth one smoke-test on a release build, not a design flaw |
| `app/_layout.tsx`, `app/(auth)/onboarding.tsx` | `bumpling_onboarding_seen` | boolean, device-local by design (not a backend concern) |

Existing Supabase state: `profiles` table (from `20240403090422_init.sql`) plus two migrations from an unrelated prior pivot (`20260612000000_bonap_core.sql`, `20260612000001_food_logs.sql`) that add `food_logs` and nutrition columns to `profiles`. These get dropped in Step 4, not built around.

## 2. Non-obvious gotchas — read before writing migrations

- **Care items must be seeded, not lazily created.** `loadCareItems()` today falls back to the 18 hardcoded `DEFAULT_CARE_ITEMS` *in memory* whenever nothing is stored yet — nothing gets written to AsyncStorage until the user interacts with at least one item (any `markDone`/`scheduleItem`/etc. call re-serializes the *whole* array). If the new schema only inserts a `care_items` row on interaction, a brand-new pregnancy's Plan screen queries an empty table and renders nothing. **Insert all 18 default rows into `care_items` at the moment a `pregnancies` row is created** (app-side bulk insert right after creating the pregnancy, or a trigger — app-side is simpler to reason about and debug).
- **Keep `care_items.id` as text, not uuid.** Default item ids (`'first-ob-visit'`, `'nuchal-translucency'`, …) are looked up directly against i18n keys in `getItemTitle()` (`carePlan:${item.id}`) and custom items use `custom-${Date.now()}`. Switching to generated uuids breaks every default item's translated title.
- **`window_start_week` / `window_end_week` must be `numeric`, not `int`.** Default items use whole weeks, but `addCustomItem()` computes a fractional week offset (`weeksSinceLMP`) for user-added items.
- **Brain dump ids currently come from the client** (`Date.now().toString()`). Switch to `gen_random_uuid()` as the column default and use the id Supabase returns from the insert — don't keep generating ids client-side once this is backed by Postgres.
- **`health_logs` is a one-row-per-day upsert**, mirroring today's "replace today's entry" logic (`checkIns.filter(c => c.date !== entry.date)` then prepend). Model this as a unique constraint on `(user_id, log_date)` and use `upsert(..., { onConflict: 'user_id,log_date' })` — not insert-then-manual-dedupe.
- **`birth_preferences` ports cleanest as two `jsonb` columns** (`answers`, `support_contacts`), mirroring the existing shape exactly. Nothing today queries across users by topic, so normalizing into per-topic rows buys nothing and costs a rewrite.
- **The AsyncStorage-backed Supabase session (`lib/supabase.ts`) is unencrypted on disk.** Swap for `expo-secure-store` (Step 6) — but iOS Keychain items cap around 2048 bytes per entry; verify the session payload fits after wiring it up, and chunk across multiple keys if it ever doesn't, rather than letting it fail silently. **`expo-secure-store` has no web implementation at all** — Platform-branch the storage adapter (SecureStore on native, AsyncStorage on web) or the web build crashes on first load.
- **`catchup_done` and `booked_done` are independent, not a single mode.** The real onboarding flow runs catch-up *then* booked, in sequence — both complete for every user, it's not an either/or choice. Modeling this as one `mode` column (`'catchup' | 'booked'`) means the second write silently erases the first, and the layout's auth-gating effect (`app/_layout.tsx`) bounces the user back to catch-up forever since it reads `hasCompletedCatchUp()` as false again. Caught live by querying the production table directly after a real test account got stuck in exactly this loop.

## 3. Target schema

Run as migrations in this order (see Step 4 for filenames). RLS policies live in the *same* migration that creates each table.

```sql
-- pregnancies
-- catchup_done / booked_done are independent flags, not a mutually exclusive
-- mode — the original design used a single `mode` enum here and it was
-- wrong: the real flow runs catch-up then booked in sequence, and
-- markBookedDone() was silently un-setting catch-up completion by
-- overwriting the same column. Caught live (see Section 2).
create table pregnancies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lmp_date date not null,
  catchup_done boolean not null default false,
  booked_done boolean not null default false,
  created_at timestamptz not null default now()
);
alter table pregnancies enable row level security;
create policy "pregnancies: owner select" on pregnancies for select using (auth.uid() = user_id);
create policy "pregnancies: owner insert" on pregnancies for insert with check (auth.uid() = user_id);
create policy "pregnancies: owner update" on pregnancies for update using (auth.uid() = user_id);
create policy "pregnancies: owner delete" on pregnancies for delete using (auth.uid() = user_id);

-- care_items (id stays text — see Step 2)
create table care_items (
  pregnancy_id uuid not null references pregnancies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  window_start_week numeric not null,
  window_end_week numeric not null,
  booking_lead_days numeric not null,
  scheduled_at timestamptz,
  scheduled_time_label text,
  location text,
  prep_note text,
  visit_notes text,
  done boolean not null default false,
  done_at timestamptz,
  skipped boolean not null default false,
  skipped_at timestamptz,
  custom boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (pregnancy_id, id)
);
alter table care_items enable row level security;
create policy "care_items: owner select" on care_items for select using (auth.uid() = user_id);
create policy "care_items: owner insert" on care_items for insert with check (auth.uid() = user_id);
create policy "care_items: owner update" on care_items for update using (auth.uid() = user_id);
create policy "care_items: owner delete" on care_items for delete using (auth.uid() = user_id);

-- health_logs (one row per user per day — see Step 2)
create table health_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pregnancy_id uuid references pregnancies(id) on delete cascade,
  log_date date not null,
  mood text check (mood in ('happy', 'calm', 'okay', 'tired', 'anxious')),
  symptoms text[] not null default '{}',
  note text,
  weight text,
  blood_pressure text,
  logged_at timestamptz not null default now(),
  unique (user_id, log_date)
);
alter table health_logs enable row level security;
create policy "health_logs: owner select" on health_logs for select using (auth.uid() = user_id);
create policy "health_logs: owner insert" on health_logs for insert with check (auth.uid() = user_id);
create policy "health_logs: owner update" on health_logs for update using (auth.uid() = user_id);
create policy "health_logs: owner delete" on health_logs for delete using (auth.uid() = user_id);

-- brain_dump_entries
create table brain_dump_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  details text,
  kind text not null check (kind in ('thought', 'doctor')),
  tags text[] not null default '{}',
  linked_appointment_id text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
alter table brain_dump_entries enable row level security;
create policy "brain_dump_entries: owner select" on brain_dump_entries for select using (auth.uid() = user_id);
create policy "brain_dump_entries: owner insert" on brain_dump_entries for insert with check (auth.uid() = user_id);
create policy "brain_dump_entries: owner update" on brain_dump_entries for update using (auth.uid() = user_id);
create policy "brain_dump_entries: owner delete" on brain_dump_entries for delete using (auth.uid() = user_id);

-- birth_preferences (jsonb — see Step 2; one row per pregnancy)
create table birth_preferences (
  pregnancy_id uuid primary key references pregnancies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  support_contacts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table birth_preferences enable row level security;
create policy "birth_preferences: owner select" on birth_preferences for select using (auth.uid() = user_id);
create policy "birth_preferences: owner insert" on birth_preferences for insert with check (auth.uid() = user_id);
create policy "birth_preferences: owner update" on birth_preferences for update using (auth.uid() = user_id);
create policy "birth_preferences: owner delete" on birth_preferences for delete using (auth.uid() = user_id);

-- partner_contacts
create table partner_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  updated_at timestamptz not null default now()
);
alter table partner_contacts enable row level security;
create policy "partner_contacts: owner all" on partner_contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- mom_contacts
create table mom_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  updated_at timestamptz not null default now()
);
alter table mom_contacts enable row level security;
create policy "mom_contacts: owner all" on mom_contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- consent_logs (append-only — never updated, see Step 8)
create table consent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document text not null,          -- 'terms' | 'privacy' | 'health_data' | 'marketing_opt_in' | 'age_attestation'
  version text not null,           -- e.g. '2026-10-17'
  accepted_at timestamptz not null default now()
);
alter table consent_logs enable row level security;
create policy "consent_logs: owner select" on consent_logs for select using (auth.uid() = user_id);
create policy "consent_logs: owner insert" on consent_logs for insert with check (auth.uid() = user_id);
-- deliberately no update/delete policy: consent is a historical record, not an editable one.

-- pregnancy_members (future-proofing for partner access — see Decided Inputs)
create table pregnancy_members (
  pregnancy_id uuid not null references pregnancies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'partner')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (pregnancy_id, user_id)
);
alter table pregnancy_members enable row level security;
create policy "pregnancy_members: member or owner select" on pregnancy_members for select
  using (auth.uid() = user_id or auth.uid() in (select user_id from pregnancies where id = pregnancy_id));
create policy "pregnancy_members: owner manages" on pregnancy_members for all
  using (auth.uid() in (select user_id from pregnancies where id = pregnancy_id))
  with check (auth.uid() in (select user_id from pregnancies where id = pregnancy_id));
```

Not revisited in this pass: every table above uses `user_id = auth.uid()` directly rather than routing through `pregnancy_members`. That's intentional — correct for today's single-owner model, and it's a known, scoped follow-up once partner access actually gets built (swap the `using` clause to check membership instead of direct ownership).

## 4. Migration files — order

Use `supabase migration new <name>` so the timestamp prefix is generated correctly; don't hand-write timestamps.

1. `drop_bonap_leftovers` — `drop table if exists food_logs; alter table profiles drop column if exists height_cm, drop column if exists weight_kg, drop column if exists age;` (confirm with the product owner that nothing currently reads these columns before dropping — PRODUCT.md already calls them stale, but a repo grep for `height_cm`/`weight_kg` costs nothing and removes any doubt).
2. `create_pregnancies`
3. `create_care_items`
4. `create_health_logs`
5. `create_brain_dump_entries`
6. `create_birth_preferences`
7. `create_partner_and_mom_contacts`
8. `create_consent_logs`
9. `create_pregnancy_members`

## 5. Config changes

- `supabase/config.toml`: rename `project_id = "expo-user-management"` to something Bumpling-specific.
- EU region: chosen at project creation in the Supabase **dashboard**, not in `config.toml` — this is the one step in this whole document that can't be automated. Do it before running any migrations against the real project.
- Session/JWT lifetime (ties to the security-practices item on session expiry): `[auth]` section of `config.toml` has `jwt_expiry` and the refresh-token settings; mirror whatever gets set locally in the hosted project's Authentication settings in the dashboard.

## 6. Session storage swap

`lib/supabase.ts` currently passes `AsyncStorage` directly as the auth storage adapter. Replace with a small adapter over `expo-secure-store`, since `SecureStore` doesn't expose the exact `{getItem,setItem,removeItem}` shape Supabase expects out of the box:

```ts
import * as SecureStore from 'expo-secure-store'

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

Run `npx expo install expo-secure-store` first. Test sign-in/sign-out/app-restart on a real device, not just the simulator — Keychain behavior differs.

## 7. Per-file porting recipes

Keep exported function names and signatures stable where practical so call sites in `app/` don't need rewrites beyond passing `pregnancyId` where one is now needed.

**`lib/momContact.ts`** and **`lib/partner.ts`** (smallest, do these first):
```ts
export async function loadPartner(): Promise<Partner> {
  const { data } = await supabase.from('partner_contacts').select('name,email').single()
  return data ?? EMPTY_PARTNER
}
export async function savePartner(partner: Partner): Promise<void> {
  await supabase.from('partner_contacts').upsert({ user_id: (await supabase.auth.getUser()).data.user!.id, ...partner })
}
```
Same pattern for `mom_contacts` (single `phone` column instead of `name`/`email`).

**`lib/brainDump.ts`**: `loadEntries` → `select('*').order('created_at', { ascending: false })`; `addEntry` → `insert({...}).select().single()` and use the returned `id`/`created_at` instead of generating them client-side; `toggleDone`/`removeEntry` → `update`/`delete` filtered by `id`. RLS makes the `user_id` filter implicit — don't add a redundant `.eq('user_id', ...)` in the query itself, the policy already enforces it, but do still set `user_id` on insert.

**`lib/birthPrefs.ts`**: `loadBirthPrefs` → `select('answers,support_contacts').eq('pregnancy_id', pregnancyId).maybeSingle()`, default to `EMPTY` if null; `saveBirthPrefAnswer`/`saveSupportContacts` → `upsert` the whole row (matches today's "save the whole blob" behavior exactly).

**`lib/carePlan.ts`** (do last, once the pattern above is proven):
- `loadLMP`/`saveLMP`/`hasLMP` → read/write `pregnancies.lmp_date` for the current user's pregnancy row (there's exactly one today).
- `hasCompletedCatchUp`/`markCatchUpDone`/`hasCompletedBooked`/`markBookedDone` → these two booleans collapse into `pregnancies.mode`; once a pregnancy row exists with a `mode`, both "has completed X setup" checks become `mode === 'catchup'` / `mode === 'booked'` on the already-loaded row — no separate flags needed.
- `loadCareItems` → `select('*').eq('pregnancy_id', pregnancyId)`. **On first creation of the pregnancy row, bulk-insert `DEFAULT_CARE_ITEMS` into `care_items`** (see Step 2's gotcha) before the user ever reaches the Plan screen.
- `scheduleItem`/`markDone`/`markSkipped`/`saveVisitNotes`/etc. → each becomes a single-row `update` filtered by `(pregnancy_id, id)` instead of rewriting the whole array — this is actually simpler than the current AsyncStorage version, not harder.
- `addCustomItem` → `insert` one row with `custom: true`.

**`app/(tabs)/health.tsx`**: `load()` → `select('*').eq('pregnancy_id', pregnancyId).order('log_date', { ascending: false })`; `save()` → `upsert({...}, { onConflict: 'user_id,log_date' })` (see Step 2's gotcha — this replaces the current filter-then-prepend dedupe logic).

## 8. Registration & consent flow

In the signup component (`components/Auth.tsx`) add, as separate unticked checkboxes:
1. Terms of Service + Privacy Policy
2. Health-data processing consent
3. Age attestation ("I confirm I am 18 years of age or older")

On successful signup, write one `consent_logs` row per accepted document (not one row covering all three — a future policy-version bump needs to know exactly which document a user last accepted and when):
```ts
await supabase.from('consent_logs').insert([
  { user_id, document: 'terms', version: TERMS_VERSION },
  { user_id, document: 'privacy', version: PRIVACY_VERSION },
  { user_id, document: 'health_data', version: HEALTH_CONSENT_VERSION },
  { user_id, document: 'age_attestation', version: TERMS_VERSION },
])
```
Surface the medical disclaimer at both signup (next to the checkbox) and onboarding (in-voice) — exact suggested copy for both is in the plan artifact's Section 05; keep the two versions distinct, don't just repeat the signup legal wording in onboarding.

## 9. Account deletion & data export

- **Deletion**: the cleanest implementation is a single Postgres function, `security definer`, owned by a role with rights to delete from `auth.users` directly — Supabase's documented pattern for self-service account deletion. It cascades automatically through every table above because they're all `on delete cascade` against `auth.users(id)` or `pregnancies(id)`. Expose it via `supabase.rpc('delete_my_account')`, callable with the user's own session (no service_role key needed client-side).
- **Export**: don't build a backend endpoint for this — simpler to have the client query each of the 8 user-owned tables directly (RLS already scopes every query to the signed-in user) and assemble the results into one JSON object client-side for sharing/saving. No new backend code required.
- Both depend on the offline-support decision being irrelevant here — they're explicitly online-only actions regardless of what Step 2's AsyncStorage question resolves to.

## 10. Session expiry & dormant accounts

Two distinct mechanisms, don't conflate them:
- **Session/token lifetime** — how long a signed-in session lasts before requiring fresh login. Configured in `[auth]` of `config.toml` locally and in Authentication → Sessions in the hosted dashboard.
- **Dormant-account sweep** — accounts that haven't opened the app in ~12 months. This needs outbound email (not yet wired up anywhere in this codebase) before it can send a "still want us to keep this?" notice, so sequence it after the core migration (Steps 1–9) and after email sending exists for any other reason (e.g. password reset already uses Supabase's built-in email — that's likely reusable). Implement as a scheduled Supabase Edge Function (cron-triggered) querying `auth.users.last_sign_in_at`.

## 11. Order of work (PR-sized)

1. Migrations: drop stale tables, create the 9 new ones with RLS (Steps 3–4).
2. Consent + age-gate signup changes, writing to `consent_logs` (Step 8) — land before any feature-data porting, so every row ported afterward belongs to a user who gave informed consent.
3. Port `momContact.ts` + `partner.ts` (smallest surface area, proves the pattern).
4. Port `brainDump.ts`.
5. Port `birthPrefs.ts`.
6. Port `carePlan.ts` + the default-care-items seeding step — the biggest, most central change, do it once 3–5 are merged and the pattern is settled.
7. Port `health.tsx`.
8. Swap session storage to `expo-secure-store` (Step 6) — independent of the above, can land any time, but do it before shipping to real users.
9. Account deletion + data export screens (Step 9).
10. Resolve the offline-support decision, then either remove AsyncStorage entirely or demote it to an explicit sync cache.

## 12. Before merging — verification checklist

- [ ] Create a second test account and confirm it **cannot** read the first account's rows in any of the 9 tables (RLS actually enforced, not just declared).
- [ ] Confirm only the anon/publishable key appears in `EXPO_PUBLIC_*` env vars — grep the bundle output for `service_role` if unsure.
- [ ] Confirm `.env` is still gitignored after any new env vars are added.
- [ ] Sign in, kill the app, relaunch — session should survive via `expo-secure-store`.
- [ ] Create a brand-new pregnancy and open Plan immediately — all 18 default care items should already be there (the seeding-gotcha check).
- [ ] Run `delete_my_account` against a disposable test user and confirm every one of the 9 tables plus `auth.users` is actually empty for that user afterward.

## 12a. Username (added post-launch-testing)

`profiles.username` now has a case-insensitive unique index (`lower(username)`, replacing the original plain-text `unique`). A `username_available(check_username text)` function, `security definer`, granted to `anon` and `authenticated`, lets the signup form check availability live before a session exists — it only returns a boolean, never leaks other profile data. `handle_new_user()` was updated to also read `username` out of `raw_user_meta_data`, so it's set the moment `auth.users` gets a row, via `signUp({ options: { data: { username } } })`. Profile's own username edit reuses the same RPC for a friendly "taken" message instead of surfacing the raw Postgres constraint error.

## 12b. Editing LMP after onboarding

`app/change-lmp.tsx`, linked from Profile settings, reuses `saveLMP()` as-is — no new backend logic needed, since it already handles the "pregnancy row exists → update `lmp_date`" path without touching `care_items` (every item's window is computed live from `lmp_date` + relative week offsets, never stored as an absolute date). Changing LMP is safe and doesn't disturb anything already scheduled or marked done.

## 13. Deferred: Sign in with Apple / Google

Deliberately not implemented yet — needs an Apple Developer account first, which isn't set up. A `TODO` in `components/Auth.tsx` points here.

- **Apple**: enable the "Sign in with Apple" capability on the app's identifier in the Apple Developer portal (no extra cost beyond the existing $99/year membership), then configure the same in Supabase under Authentication → Providers → Apple. Code-side: `expo-apple-authentication` + `supabase.auth.signInWithIdToken()`.
- **Google**: free Google Cloud project, OAuth consent screen, OAuth client ID — configured in Supabase under Authentication → Providers → Google. Code-side: either Supabase's hosted `signInWithOAuth()` redirect flow, or a native Google Sign-In SDK for a more in-app feel.
- **Not optional once Google ships**: Apple's App Store Review Guideline 4.8 requires offering Sign in with Apple as an equivalent option if any other third-party login (Google included) is offered. Budget for both together, not Google alone.
- Both are a native rebuild, not an OTA update — plan for an EAS/`expo run:ios` build when this actually gets picked up.
