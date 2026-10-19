# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users

Primary: the pregnant person using Bumpling to track their pregnancy day-to-day — their care plan, appointments, symptoms/mood, birth preferences, and free-form notes.

Secondary (confirmed direction, not yet fully built): a partner/co-parent as a genuine in-app user with their own access, not just a PDF/email recipient. Today, partner involvement is implemented as share-out only (appointment details sent to a partner's saved email); full partner in-app access is confirmed as the intended direction but is not yet implemented — see Capabilities and Constraints.

## Product Purpose

Bumpling turns the generic pregnancy timeline into a personal, trimester-by-trimester action list: it auto-schedules the tests, scans, and appointments relevant to the user's own stage of pregnancy and surfaces booking deadlines before they're missed, alongside day-to-day logging (symptoms/mood/vitals), free-form "brain dump" notes, and a guided flow for producing a shareable birth plan. Success means the user never misses a booking window and has one calm place for everything pregnancy-related, instead of juggling a generic timeline app, a notes app, and separate appointment reminders.

## Positioning

Care-plan automation is the mechanism competitors (BabyCenter, Ovia, What to Expect) don't have: Bumpling doesn't just show generic week-by-week content, it computes which tests/scans apply to the user's own LMP-derived gestational age, tracks each one's booking deadline and status (upcoming/scheduled/done), and turns that into a personal, trackable list rather than static reading material.

## Operating Context

- Onboarding opens with a 5-slide carousel (plan / today / health / all-in-one / medical disclaimer) before account creation, then captures the LMP (last menstrual period) date to compute gestational age; separate flows exist for users who are mid-pregnancy and already have appointments booked ("booked") versus users who need to catch up on tracking from where they are ("catch-up").
- Daily/weekly use: checking the Today view (current week, next care item, weekly tip), logging to Health (mood/symptoms/vitals) and Brain dump, reviewing/updating the Plan (trimester care-item list).
- Appointment-specific flow: viewing an appointment, adding visit notes, sharing details with a partner via saved email/share sheet.
- Ongoing plan maintenance: a separate "catch-up review" screen (reachable from Plan, distinct from onboarding's one-time catch-up step) surfaces any care item whose booking window has since closed unactioned ("missed") and lets the user resolve the whole backlog in one pass — mark done or skip — rather than leaving it to linger.
- Later-pregnancy flow: "Prepare for birth" guided flow producing birth preferences, with a summary screen and a shareable PDF birth plan.
- Backed by Supabase (auth + data); calendar integration via expo-calendar for adding appointments to the device calendar.
- Localized into English and Hebrew (full RTL layout), switchable from Profile; not just translated strings — layout, icons, and carousel direction all mirror for RTL.
- A public, no-backend web preview of the app is exported to GitHub Pages on every push to `master` (see `.github/workflows/deploy-pages.yml`), with a persistent banner marking it as a preview build and a "skip sign-in" dev-bypass button (`lib/devBypass.ts`) so it's explorable without Supabase credentials. On wide (>700px) desktop browser widths it renders inside a phone-shaped frame (`components/DesktopWebFrame.tsx`) rather than stretching full-bleed.

## Capabilities and Constraints

- Confirmed: single pregnant-person account; appointment sharing with a partner today works via a stored partner name/email and the share sheet/email send — not a partner login or shared account.
- Confirmed direction, not yet implemented: partner/co-parent as a true secondary in-app user with their own access. Future work should treat this as a real multi-user/auth gap, not a UI-only add-on.
- Platform: built and shipping on iOS (native `ios/` project exists). `app.json` stages an Android package name and adaptive icon for a future build, but no Android native project exists yet and there is no OS-specific design divergence today.
- Birth preferences export to a shareable PDF birth plan (`expo-print` + `expo-sharing`).
- Terminology: "LMP" = last menstrual period (used to compute gestational age); "brain dump" = the free-form notes tab; "care items" / "care plan" = the trimester-based list of tests, scans, and appointments with booking deadlines; `lib/momContact.ts` ("mom contact") is **not** a separate person's contact — it's the pregnant user's own phone number, surfaced as the plain "Phone" field in Profile's Basic Info, as distinct from the `partner` contact (a different person's name + email).

## Account, Legal & Settings

- Signup requires three separate unticked consent checkboxes (Terms of Service + Privacy Policy, health-data processing, 18+ age attestation) before the account can be created; sign-in has no such gate.
- The onboarding carousel's final slide is a medical disclaimer ("A place to stay organized, not a doctor"), reinforced again as its own disclaimer block on the LMP entry screen.
- Profile screen covers: basic info (name, username, phone/mom-contact with country-code picker), partner contact (name + email, share-only), language switch (English/Hebrew), "view onboarding again" (replay), change password, delete account (confirm-to-destroy, intended to cascade via a Postgres function per `BACKEND.md`), download-my-data export, and an unsaved-changes guard that confirms before navigating away with unsaved edits.
- Legal pages (`app/legal.tsx`, `privacy-policy.tsx`, `terms-of-service.tsx`) are reachable both from the signup consent links and from Profile's "About & legal", and deliberately stay reachable even for a visitor with no account yet (an explicit root-layout carve-out) so tapping a consent link during signup never bounces them back to onboarding.

## Brand Commitments

- Name: Bumpling (bundle id `com.bumpling.app`). Custom illustrated brand marks: BabyMark, FetusIllustration, MoodFace.
- Voice: warm and calm, explicitly positioned against anxiety/overwhelm ("all in one calm, simple place"); onboarding copy avoids clinical tone.
- Confirmed palette in active use: warm peach/terracotta primary (`#E8927C` family) with sage and lavender accents on a cream background — see Evidence on Hand.

## Evidence on Hand

- `lib/theme.ts` holds the live color tokens (peach/sage/lavender/cream palette) and itself flags `protein`/`carbs`/`fat`/`fiber` tokens as "legacy nutrition-tracking accents" — orphaned from an earlier, unrelated version of this repo. Not current product.
- `SPECS.md` and the Supabase migrations `20260612000000_bonap_core.sql` / `20260612000001_food_logs.sql` describe an unrelated nutrition/macro-tracking app ("Bon Appétit"). Confirmed stale, left over from a prior pivot — do not treat as product truth or evidence for future design work.
- `README.md` is now a Bumpling-specific visual tour (real screenshots captured from the live GitHub Pages preview) plus setup instructions — previously generic Supabase starter boilerplate.
- `DESIGN.md` (untracked, repo root) describes an unrelated "Claude-design-analysis" — Claude.com's own marketing-site design system (coral/cream Anthropic branding, Copernicus/StyreneB type). It does not describe Bumpling in any way and appears to be a stray artifact from a different session/target, not this product's design spec. Flagged here rather than deleted or repurposed — needs a human call on whether to remove it.
- `BACKEND.md` is the authoritative, current migration plan for moving off AsyncStorage onto Supabase (table-by-table, with the exact current `lib/*.ts` storage shapes) — treat it as more current/detailed than this file's own data-layer claims where the two overlap.
- App icon/splash/favicon exist in `assets/` but were not reviewed for brand fit in this session.

## Product Principles

- Automate the pregnancy timeline into a personal, deadline-aware action list — don't just display generic week-by-week content.
- Keep the tone calm and low-anxiety; reminders and health flags should inform, never alarm.
- One place for everything pregnancy-related (plan, health log, notes, birth plan) beats stitching together separate single-purpose apps.
- Treat partner involvement as a real product surface to grow into, not an afterthought bolted onto sharing.
