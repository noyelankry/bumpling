# 🍽️ Bumpling — Product Specification
**Bon Appétit · Smart Macro & Meal Intelligence App**
Version 1.0 · Draft

---

## 1. Overview

**Bumpling** is a mobile-first nutrition and meal planning application that combines macro tracking, AI-powered meal suggestions, social recipe sharing, and smart grocery optimization. Unlike passive trackers, Bumpling acts as a personal nutrition engine — it learns your food preferences, understands your active fitness phase, and recommends meals and recipes specifically engineered to close your daily targets.

**Core philosophy:** Don't just log food. *Hit your targets intelligently.*

---

## 2. Target Users

- Fitness-conscious individuals managing cutting, bulking, or maintenance phases
- Athletes or gym-goers with structured nutrition periods
- Users who want smart, preference-aware meal suggestions (not generic calorie counting)
- People who meal prep and want optimized grocery lists
- Casual users who want simple daily guidance without obsessive tracking

---

## 3. High-Level Feature Pillars

| Pillar | Description |
|---|---|
| **Goal Profile System** | Pre-configured macro/calorie profiles by fitness phase |
| **Daily Food Planner** | Meal-divided daily diary with AI-powered logging |
| **Smart Meal Suggester** | AI recommendations based on targets, preferences & history |
| **Recipe Feed** | Social feed for sharing recipes with full nutrition data |
| **Grocery Optimizer** | AI-generated shopping lists based on goals and history |
| **Nutrition Insights** | Health warnings, trend analysis, weekly rebalancing |
| **Coffee Tracker** | Lightweight quick-log widget for coffee consumption |

---

## 4. User & Auth System

### 4.1 Authentication
- Email/password signup and login
- OAuth: Google, Apple
- Onboarding wizard: physical stats (height, weight, age, sex), activity level, dietary restrictions, initial goal profile selection
- Optional: sync with Apple Health / Google Fit for step count and weight

### 4.2 User Profile Data
- Display name, profile photo
- Physical stats (updateable over time; tracked with timestamps for trend analysis)
- Dietary restrictions: vegetarian, vegan, gluten-free, lactose-free, halal, custom
- Favorite foods / preferred ingredients (tag-based, user-editable)
- Coffee preference settings (cup size, milk type, sugar — used for default coffee logging)
- Notification preferences
- Meal block configuration (see §6.3)

---

## 5. Goal Profile System

### 5.1 Profile Types
Each profile defines a named, reusable macro + calorie configuration:

| Phase Class | Example Use Case |
|---|---|
| **Cutting** | Caloric deficit, high protein, fat loss focus |
| **Maintaining** | TDEE calories, moderate macros, recomposition |
| **Mass Gaining** | Caloric surplus, high protein + carbs |
| **Custom** | Fully user-defined |

### 5.2 Profile Configuration Fields
- Profile name (e.g., "My 12-Week Lean Cut Cycle")
- Phase class (cutting / maintaining / mass gaining / custom)
- Intended period length (in weeks)
- Daily calorie limit (kcal)
- Protein priority target (g/day)
- Fiber focus target (g/day)
- Carbohydrate limit (g/day) — optional
- Fat limit (g/day) — optional

### 5.3 Profile Management
- Users can create, name, edit, and delete multiple profiles
- One profile is set as the **Active Tracker Basis** at a time
- Switching profiles is a single tap — no data re-entry needed
- Past profiles are preserved with history; switching does not erase logs
- Profile period countdown visible on home dashboard

### 5.4 Weekend / Event Calorie Rebalancer
- User schedules a "feast event" day (e.g., Saturday dinner party) and sets an estimated calorie budget for it
- System calculates the weekly calorie pool and dynamically redistributes the deficit across the remaining 6 days
- Shows a **Mathematical Rebalancing Summary**: Regular weekly target → Party day budget → Adjusted remaining-days pool
- Toggle: **Calibration Mode** (auto-adjust) vs manual

### 5.5 Profile Transition Suggestions
- At the end of a profile's intended period, Bumpling prompts: "Your 12-week cut is ending — ready to switch to maintenance?"
- Optional auto-schedule: configure next profile in advance (e.g., cut → maintenance → cut)

---

## 6. Daily Food Planner

### 6.1 Overview
The daily planner is the core interaction surface. It is divided into **meal blocks** and tracks progress toward all active macro targets throughout the day.

### 6.2 Date Navigation
- Default view: **Today**
- Navigation: arrow buttons or date picker to browse any past day
- Past days are read-only (with edit option if unlocked in settings)
- Future days: planning mode (mark meals as "planned")

### 6.3 Meal Blocks
Default blocks:
1. Breakfast
2. Lunch
3. Dinner
4. Snacks
5. ☕ Coffee Tracker (dedicated lightweight widget — see §6.7)
6. Cups of water Tracker (also lightweight widget that count cups of water)

User can:
- Rename any block
- Reorder blocks
- Add custom blocks (e.g., "Pre-Workout", "Post-Workout")
- Hide/show blocks

### 6.4 Macro Progress Bar (Top of Day View)
Live-updating cards showing:
- Energy Intake (kcal consumed / daily limit)
- Protein Goal (g consumed / g target)
- Fiber Goal (g consumed / g target)
- Steps Goal Tracker (steps logged / daily goal — if health sync enabled)
- Total Carbs (g consumed / g limit)
- Total Fats (g consumed / g limit)

### 6.5 Food Logging Methods

**Method 1: AI Text Parse**
- User types a natural language description of their meal
- AI extracts food items, estimates serving sizes, and calculates macros
- Example input: *"I had two poached eggs and half an avocado on whole wheat toast with a drizzle of olive oil"*
- Estimated nutrition is shown with an editable breakdown before confirming
- Quick-click preset phrases from recent meals for fast re-logging

**Method 2: Manual Entry**
- Search food database (USDA, Open Food Facts, or licensed DB)
- Enter item name + quantity/weight
- Add custom foods with manual macro entry

**Method 3: AI Smart Photo Scan** *(Mobile only)*
- Camera captures plate photo
- AI identifies foods and estimates portions
- Returns macro breakdown for user review before logging

**Method 4: Barcode Scan** *(Mobile only)*
- Scan packaged food barcode → auto-populate macros from product database

### 6.6 Logged Meal Display
Each logged item within a block shows:
- Item name
- kcal | Protein (g) | Fiber (g) | Carbs (g) | Fat (g)
- Delete option
- Tap to edit quantity/serving size

### 6.7 Coffee Tracker Widget
- Dedicated compact card in the daily planner
- **+1 button** to log a coffee with one tap
- Uses the user's saved coffee preference (from settings) to auto-apply macros
- Default: small coffee with milk (~50 kcal, ~2g protein, ~5g carbs)
- User can define custom profiles: "Flat White", "Black Americano", "Oat Latte", etc.
- Shows: coffees today / daily limit (optional), total caffeine estimate

---

## 7. Smart Meal Suggester (AI Target Closer)

### 7.1 Core Concept
After a user logs some meals, the **AI Target Closer** calculates remaining daily deficits across protein, fiber, and calories, then recommends a specific meal or snack that best bridges the gap — using the user's favorite foods and dietary restrictions as constraints.

### 7.2 Inputs to the Suggestion Engine
- Current daily shortfalls (calories, protein, fiber remaining)
- User's saved favorite foods / preferred ingredients
- Active dietary restrictions
- Time of day (breakfast vs. dinner suggestions differ)
- Recent meal history (avoid repetition)
- Popular recipes tagged to the active goal phase (cutting, bulk, etc.)

### 7.3 Output
- Suggested meal name + recipe summary
- Full macro breakdown (kcal, protein, fiber, carbs, fat)
- Why this meal fits: *"This hits 40g protein and only 350 kcal — fits your remaining cut budget perfectly."*
- Option to log immediately or save to favorites

### 7.4 Favorite Foods / Preferred Ingredients
- Managed from Home dashboard
- Tag-based (e.g., Chicken Breast, Greek Yogurt, Egg Whites, Smoked Salmon, Oat Bran)
- Used by the AI to bias suggestions toward foods the user actually buys and enjoys
- Prompt to keep updated: *"Keep this up-to-date for better suggestions"*

### 7.5 History-Aware Optimization
- Tracks which meals were logged frequently → learns implicit preferences
- Can detect "I always skip fiber at dinner" → surface fiber-rich dinner suggestions
- Weekly summary: most logged foods, macro hit rate per day

---

## 8. AI Recipes Module

### 8.1 Goal-Phase Recipes
- Curated and AI-generated recipes tagged by phase (Cutting, Maintaining, Mass)
- Each recipe includes: full ingredient list, macros per serving, prep time, difficulty
- Filter by: phase tag, dietary restriction, protein range, prep time
- "Make this meal" → auto-generates a shopping list for missing ingredients

### 8.2 Recipe Generation
- User can request: *"Generate a high-protein breakfast under 400 kcal using Greek yogurt and oats"*
- AI returns full recipe with macro calculation
- Option to save to personal recipe library or share to feed

---

## 9. Recipe & Nutrition Social Feed

### 9.1 Feed Overview
A social content layer for sharing and discovering recipes with verified nutrition data.

### 9.2 Post Types
- **Recipe Post**: Text-based recipe with macro table
- **Photo Post**: Meal photo + nutrition badge overlay
- **Video Post**: Short cooking video (similar to Reels format)
- **Food Blog Entry**: Longer-form text post with embedded nutrition data

### 9.3 Post Metadata
Every post includes:
- Author, timestamp
- Recipe / meal name
- Macro badge: kcal · Protein · Fiber · Carbs · Fat
- Goal phase tag (Cutting / Maintaining / Bulk / General)
- Dietary tags (vegan, gluten-free, etc.)
- Save to personal recipe library
- Like, comment, share

### 9.4 Discovery
- Feed algorithm prioritizes recipes matching the user's active goal phase and dietary restrictions
- Search by ingredient, macro range, or phase
- Trending recipes this week
- "Similar to meals you've logged" recommendations

---

## 10. Grocery Optimizer (Smart Shopping List)

### 10.1 Core Feature
Bumpling analyzes a configurable time window of food logs (e.g., past 2 weeks) and generates an optimized grocery list engineered to support the user's active nutrition goals.

**Tagline UX copy:** *"Generate an optimized grocery trip cart engineered specifically to hit your daily protein targets, custom fiber priority limits, active restrictions, and personal food favorites."*

### 10.2 List Generation Inputs
- Active goal profile (protein target, fiber target, calorie limit)
- Dietary restrictions
- Favorite foods list
- Recent food diary (what foods appear most, what gaps exist)
- Optional: budget range
- Optional: exclude certain foods

### 10.3 Output Format
- Grouped by category: Proteins, Produce, Dairy & Eggs, Grains, Pantry
- Each item: name, estimated quantity for the week, why it's included (*"High in protein, aligns with your cut targets"*)
- Export to: clipboard text, Notes app, or native share sheet
- Future: direct integration with supermarket delivery apps

### 10.4 Shopping History
- Past generated lists saved with date
- Mark items as purchased (checkbox mode)
- Re-use or regenerate previous list

---

## 11. Nutrition Insights & Health Monitoring

### 11.1 Daily Insights
- Progress summary at end of day
- Macro hit rate (did you hit protein today? fiber?)
- Calorie accuracy vs. target
- Streak counter: days in a row hitting protein target

### 11.2 Weekly Insights
- Average daily intake for the week (kcal, protein, fiber)
- Best day / worst day
- Weekly macro balance chart (visual breakdown)
- Suggestion: *"You're consistently under on fiber — try adding oat bran or raspberries to breakfast"*

### 11.3 Health & Safety Warnings
Rule-based flagging system:

| Warning Trigger | Message |
|---|---|
| Calories consistently below 1,200 kcal for 5+ days | *"Your caloric intake may be too low for sustained health. Please consult a healthcare professional."* |
| Protein below 0.6g/kg body weight for 7+ days | *"Protein intake appears low relative to your body weight. Consider reviewing your targets."* |
| Fiber below 15g for 7+ days | *"Consistently low fiber intake may affect gut health."* |
| Extreme calorie deficit (>1,000 kcal below TDEE) | *"This deficit is aggressive. We recommend checking with a dietitian before continuing."* |

All warnings are informational, non-blocking, and dismissible. Never used to restrict the user.

### 11.4 Long-Term History
- Calendar view: tap any day to review its full food diary
- Weight tracking (if user logs or syncs from health app)
- Body metric trends over time
- Phase performance: "During your last cut, you averaged 1,680 kcal and 158g protein/day"

---

## 12. App Navigation Structure

```
Bumpling
├── Home (Dashboard)
│   ├── Active Profile Summary
│   ├── Daily Macro Progress Cards
│   ├── Today's Macro Balancers (carbs/fats)
│   ├── Current Phase Info
│   └── Favorite Foods Manager
│
├── Diary & Scan (Daily Food Planner)
│   ├── Date Navigator
│   ├── AI Text Parse / Manual Entry / Photo Scan
│   ├── Meal Blocks (Breakfast, Lunch, Dinner, Snacks)
│   ├── Coffee Tracker Widget
│   └── AI Target Closer (Smart Meal Suggester)
│
├── AI Recipes
│   ├── Browse by Phase / Restriction
│   ├── AI Recipe Generator
│   └── My Recipe Library
│
├── Feed (Social)
│   ├── Discover Feed
│   ├── Post a Recipe / Photo / Video
│   └── Saved Posts
│
├── Shopping
│   ├── Generate Grocery List
│   ├── Past Lists
│   └── Active Checklist
│
└── Macro Goals (Goal Profiles)
    ├── Active Profile
    ├── All Profiles (Create / Edit / Delete)
    └── Weekend Calorie Rebalancer
```

---

## 13. Settings & Configuration

- Account & profile management
- Dietary restrictions
- Coffee preferences (default cup, custom profiles)
- Meal block configuration
- Notification settings (daily reminder, macro alerts, streak nudges)
- Health app sync (Apple Health / Google Fit)
- Units: metric / imperial
- Data export (CSV of food diary)
- Privacy controls

---

## 14. Tech Stack Considerations *(High-Level)*

| Layer | Recommended Approach |
|---|---|
| **Mobile** | React Native (iOS + Android from one codebase) |
| **Backend** | Node.js / Python FastAPI |
| **Database** | PostgreSQL (user data, logs) + Redis (sessions, caching) |
| **AI / NLP** | OpenAI GPT-4o or Gemini for text parse + meal suggestion |
| **Food DB** | USDA FoodData Central API + Open Food Facts (barcode) |
| **Image AI** | Google Vision or custom fine-tuned model for plate scan |
| **Auth** | Firebase Auth or Supabase Auth (Google + Apple OAuth) |
| **Storage** | S3-compatible (recipe feed photos/videos) |
| **Analytics** | PostHog or Amplitude (usage insights) |

---

## 15. MVP Scope Recommendation

For a first release, focus on the core loop that differentiates Bumpling from existing apps:

**MVP includes:**
- Auth & onboarding
- Goal profile system (create, switch, activate)
- Daily food planner (meal blocks, AI text parse logging, manual entry)
- AI Target Closer (smart meal suggestion based on remaining macros + favorites)
- Basic nutrition history (calendar view, daily review)
- Coffee tracker widget

**Post-MVP (Phase 2):**
- Photo scan
- Grocery optimizer
- Social recipe feed
- Weekend calorie rebalancer

**Phase 3:**
- Video feed (Reels-style)
- Health app sync
- Dietitian consultation integrations
- Grocery delivery partnerships

---

*Bumpling — Engineered for the way you actually eat.*


### WIP
THIS IS WHAT I  NEED TO DO TO SETUP THE AI FEATURES:

  Last thing to unlock AI parsing: add your Anthropic key to .env:
 
  EXPO_PUBLIC_ANTHROPIC_KEY=sk-ant-api03-...

  Then rebuild with npx expo run:ios and the AI text + photo features in the diary will go live.
