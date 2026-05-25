# Aira Community Business Directory — Product Requirements Document (PRD)

Version: v1.0 (MVP)
Owner: Aira
Market Type: Marketplace (B2C discovery, B2B monetization)
Platforms:
- End users: iOS/Android native app (Bubble responsive app wrapped via BDK Native/Capacitor)
- Admin: Web app (Bubble)

> **Implementation note (added 2026-05-25):** This PRD was authored assuming a
> Bubble.io build. The actual implementation is on the MLabs monorepo template
> (Next.js 16 + Server Actions for web/admin, Expo 55 for mobile, Drizzle +
> Postgres, Better Auth, Postmark). When this document references Bubble Data
> Types, Bubble Privacy Rules, Bubble Backend Workflows, BDK Native wrapper, or
> `/api/1.1/wf/*`, translate them to the corresponding MLabs-stack primitives.
> See the substitution map in Claude memory (`stack-translation-rule`) and the
> service-layer / API-versioning ADRs in `docs/decisions/`.

---

## 1) Executive Summary

Aira Community Business Directory is a curated, city-scoped directory app enabling the Atlanta Indian community to easily discover and contact trusted local businesses. Admins manage the taxonomy (categories/subcategories), listings, membership activation, sponsorship placement, and a moderated “Post an Item” community requests board. Listings can be verified by admins and optionally sponsored to rank at the top. MVP prioritizes simplicity, speed, and maintainability in Bubble, with clean UI and minimal clutter.

Core MVP pillars:
- OTP-gated access (no anonymous browsing) for all end users.
- Category > subcategory (up to 3 levels) navigation with in-category-only search.
- Compact listing cards with phone/WhatsApp quick actions, verified badge, and optional sponsored highlighting.
- Admin web console for CRUD of categories, listings, memberships, sponsorships, pricing, moderation, notifications, audit logs, and exports.
- City scoping for data and deep links (launch city: Atlanta).
- Manual payments and renewal reminders (SMS/email).
- Moderated “Post an Item” board with configurable expirations.

Phase 2 (not in MVP): Self-serve Stripe subscriptions, masked call routing, anti-spam enhancements, multi-city UI switcher, sponsorship tiers/slot limits, and business portals.

---

## 2) Project Objectives and Success Criteria

Objectives
- Provide a fast, uncluttered directory UX for the Atlanta Indian community.
- Maintain high-quality, verified listings curated by admin.
- Monetize via memberships (required) and sponsorships (optional).
- Ship an MVP admins can maintain in Bubble without complex dev work.

Success Criteria (MVP)
- <3 taps from Home to a working listing page (category > subcategory > listings).
- Time-to-first-result after OTP login < 5s on 4G.
- Listing page renders ≥10 listings per page with sponsor-first ordering and verified filter.
- Admins can create/edit listings, attach to multiple subcategories, verify, rate, and manage gallery.
- Admins can record manual payments, control membership activation, and configure pricing.
- Automated renewal reminders via SMS/email with configurable schedules.
- “Post an Item” fully functional with moderation and auto-expiry.
- Push notifications can be broadcast to business users by category/city.
- Audit log records all critical admin changes.

Non-goals (MVP)
- Self-serve payments (Stripe subscriptions/checkout).
- Business owner self-edit.
- Fuzzy/fault-tolerant search.
- Multi-city UI switcher.

---

## 3) Target Users and Personas

- Priya Patel (Project Coordinator): High technical proficiency, values trusted, consistent categories and verified signals.
- Anita Rao (Office Admin/Caregiver): Low-moderate proficiency, prioritizes minimal taps and legible UI, tap-to-call over social.
- Arjun Mehta (Restaurant Owner): Moderate proficiency, wants visibility (sponsorship), verified badge, and timely renewals.
- Maria Rodriguez (Application Admin): High proficiency, manages CRUD, curation, memberships, sponsorships, moderation, and audit.
- Sanjay Kulkarni (Grad Student): High proficiency, uses Requests Board for fast help, wants speed and clear status.

Key UX constraints from personas:
- OTP login friction: keep it reliable and fast; avoid multi-step friction for browsing.
- Clear trust and ranking signals: verified badge distinct from sponsored highlighting.
- Tap targets: respect mobile ergonomics; avoid crowded icon rows.
- Scoping: search must not leak across categories; breadcrumbs and collapsible nav aid backtracking.

---

## 4) Feature Specifications (with Acceptance Criteria)

Note: All user-facing features require OTP login before browsing.

1) Phone OTP Authentication (v1)
- Description: Passwordless login using phone number + SMS OTP.
- Acceptance:
  - Given a phone number, when user requests OTP, then an OTP is sent via SMS, rate-limited (e.g., 5/minute, 10/hour).
  - When user enters a correct OTP within validity window (e.g., 5 minutes), session begins.
  - If incorrect/expired OTP, user sees error and can request a new OTP (subject to rate limits).
  - Session auto-expires after configurable inactivity (e.g., 7 days on mobile, 1 day web admin).
- Notes: Use Twilio Verify or Firebase Phone Auth. Store E.164-format phone numbers.

2) Admin MFA & Role-Based Access Control (v1)
- Description: Super Admin and Admin accounts use password + MFA (TOTP or SMS). Only Super Admin may create Admins.
- Acceptance:
  - Admin web login requires email/username + password + 2FA code.
  - Only users with role=admin or role=super_admin can access /admin routes.
  - Super Admin can assign/remove admin roles; Admin cannot elevate roles.

3) Session Management & Logout (v1)
- Description: Secure logout and auto-timeout.
- Acceptance:
  - Logout clears session and push token associations.
  - Inactivity timeout logs out admin session (e.g., 30 min) and user app session (configurable, e.g., 7 days background).

4) City Scoping & Data Model (v1)
- Description: All data scoped by City (Atlanta at launch).
- Acceptance:
  - Admin can create City “Atlanta” (active) and associate categories and listings to it.
  - All end-user navigation and search returns content for the current city context only.
  - Deep links include city slug.

5) Multi-level Category Navigation & Breadcrumbs (v1)
- Description: Up to 3 levels: Category > Subcategory > Sub-subcategory.
- Acceptance:
  - Collapsible menu shows hierarchy; clicking expands children.
  - Breadcrumbs reflect path and allow jumping back at any level.
  - If a category has no children, its page acts as the listing page.

6) Category & Subcategory Management (Admin) (v1)
- Description: CRUD categories, ordering, activation, parent-child relation per city.
- Acceptance:
  - Admin can create category with fields: name, slug (auto from name, editable), level (0/1/2), parent (nullable), city, is_active, display_order.
  - Reorder via drag or display_order; inactive categories don’t show in user nav.
  - Uniqueness: (city_id, slug, level) unique.

7) Directory Listing Page with Pagination, Sorting, Filters (v1)
- Description: Show compact business cards, ≥10 per page; sponsored-first sort; filters for Verified/Sponsored; pagination controls.
- Acceptance:
  - Default sort: sponsored-first (active sponsorship in this category by tier priority asc, then amount desc, then name asc), then A–Z.
  - Filter toggles: Verified only, Sponsored only (can combine with search).
  - Pagination stable across state changes (search/filter retains page 1).
  - Performance: initial page load under 2s on 4G median.

8) Scoped Keyword Search (In-Category) (v1)
- Description: Search within the current category/subcategory only; simple contains/starts-with search.
- Acceptance:
  - Searching “cat” within Catering returns listings mapped to that category whose name or short description contains “cat” (case-insensitive).
  - Search does not include other categories or parent/sibling categories.

9) Business Listing Card with Quick Actions (v1)
- Description: Card includes: logo, business name, phone (number or icon per mode), WhatsApp icon, social icons, website, Verified badge, Sponsored tag, “More Info”.
- Acceptance:
  - Tap-to-call: tel: link calls the business; if phone_mode=mask (phase 2), dial the proxy instead.
  - WhatsApp: opens wa.me link; social icons open respective URLs; if missing links, show disabled/inactive icon.
  - Verified shows only if is_verified=true; Sponsored visual (tag or border) if active sponsorship exists in current category context.

10) More Info Modal with Details & Gallery (v1)
- Description: Modal displays address, email, short description, directions link, website, phone, up to 3 images.
- Acceptance:
  - Directions link opens default maps app with lat/lng (prefer place_id when set); fallback to formatted address query.
  - Fields are optional; empty fields don’t render.
  - Images open in lightbox viewer (swipe).

11) Verified Badge & Admin Star Rating (v1)
- Description: Admin manages is_verified (tick) and rating (0–5).
- Acceptance:
  - If rating=0 or null, hide stars on card.
  - Verified and rating visible in card and modal.

12) Sponsored Placement & Sorting Rules (v1)
- Description: Sponsored-first sort within the listing page; highlight sponsored cards.
- Acceptance:
  - Active sponsorship is defined by category match and date window inclusive of today and status=ACTIVE.
  - Sort order among sponsored: tier.priority asc, amount_cents desc (nullable last), business.name asc.
  - Then organic: business.name asc.

13) Business Listing Management (Admin) (v1)
- Description: CRUD listings; attach to multiple subcategories; soft delete/restore; manage verified/rating; gallery; contact info.
- Acceptance:
  - Create listing form includes: business core info, contact links, Google Places address, classification (multi-select categories), phone_mode (number|icon), verification, rating (optional), gallery images (≤3), status (active/inactive).
  - Prevent duplicate BusinessCategory pairs (business_id, category_id unique).
  - Soft delete sets status=soft_deleted and deleted_at; restore clears them.
  - Listing is visible only if status=active and has an active BusinessSubscription covering today.

14) Lifecycle Rules: Soft Delete & Auto-Purge (v1)
- Description: Soft delete capability and scheduled purge for long-inactive listings.
- Acceptance:
  - Configurable purge_days (default 180). Nightly job permanently deletes soft_deleted listings older than purge_days.
  - Admin UI shows soft-deleted records with restore button until purge.

15) Membership Management & Activation Rules (v1)
- Description: Track membership plans (6 or 12 months), activation, renewal dates.
- Acceptance:
  - BusinessSubscription: start_date, end_date, status (ACTIVE|EXPIRED|CANCELED), payment_status (PAID|UNPAID|PARTIAL).
  - Listing visibility requires an ACTIVE subscription covering now AND listing.status=active.
  - Admin can mark payment_status and set dates; renewal_date=end_date.

16) Manual Payment Recording & Renewal Tracking (v1)
- Description: Record offline payments (cash/Zelle), amounts, notes; filters by due dates.
- Acceptance:
  - Admin can update payment_status and record payment_method (text), amount, notes.
  - Filter: “Renewals due in X days” based on end_date.
  - CSV export supports filters.

17) Renewal Reminder Automation (SMS/Email) (v1)
- Description: Automated reminder messages pre/post renewal dates.
- Acceptance:
  - Configurable schedule (e.g., -14d, -3d, +7d).
  - SMS (Twilio) + Email (Postmark) templates editable in Admin Settings.
  - Delivery logged in NotificationDelivery (optional for MVP – log to AuditLog at least).

18) Sponsorship Management (Admin) (v1)
- Description: Assign time-bounded sponsorships per category/subcategory with tier priority and amounts.
- Acceptance:
  - Fields: business, category, tier (priority int), start_date, end_date, amount_cents, status (SCHEDULED|ACTIVE|EXPIRED).
  - Nightly job flips status based on dates.
  - Filters: expiring soon, active by category, etc.

19) Pricing Configuration (Membership & Sponsorship) (v1)
- Description: Admin-controlled pricing/durations.
- Acceptance:
  - MembershipPlan: name, duration_months (6|12), price_cents.
  - SponsorshipTier: name, priority (int), default price_cents, is_active.
  - City-aware optional scoping.

20) Community Requests Board (Post an Item) with Moderation & Expiry (v1)
- Description: Logged-in users post a request (title, description) -> pending approval; auto-expire after N days.
- Acceptance:
  - Admin sees queue: approve/reject with notes.
  - Approved posts visible on public board immediately; expired posts auto-hidden (status=EXPIRED) and purged on schedule.
  - Configurable expiry_days and max_visible (page count via pagination).
  - Search within titles/descriptions; filter by status/date.

21) Notifications Broadcast to Business Users (v1)
- Description: Admin can broadcast push notifications to business users, segmented by city/category.
- Acceptance:
  - Audience selection: all business users in city, by selected categories, or pick-list of businesses.
  - Records Notification and target list; triggers push delivery via OneSignal/API; logs send time and status.
  - End users (non-business) do not receive promotional broadcasts (only app-update prompts).

22) Audit Log & Change History (v1)
- Description: Immutable logs of critical admin actions.
- Acceptance:
  - Log on create/update/delete for: Category, Business, BusinessSubscription, Sponsorship, MembershipPlan, SponsorshipTier, Pricing, Post moderation, Settings changes, Role changes.
  - Fields: actor_user_id, entity_type, entity_id, action, changes_json (old->new), ip_address, created_at.
  - Searchable by date range, actor, entity.

23) Data Export (CSV) (v1)
- Description: CSV export for Listings, Categories, Memberships, Sponsorships, Posts.
- Acceptance:
  - Apply current filters to exports.
  - Include human-readable values (e.g., category path).

24) Homepage Content Management (v1)
- Description: Admin-manage About text; counts (businesses, categories, community members).
- Acceptance:
  - Counts can be either admin-entered overrides or dynamic. If override present, it displays; else system-calculated.
  - Editable via Admin Settings.

25) City-aware Slugs & Deep Links (v1)
- Description: Generate deep links for shareability: /city/category/subcategory
- Acceptance:
  - Unique City.slug and Category.slug within city+level.
  - Tapping a shared deep link within the app navigates to the target; on web, show a minimal “Download App” page (optional) or open PWA.

26) Mobile App Distribution & Update Prompt (v1)
- Description: Package iOS/Android builds; enforce min app version.
- Acceptance:
  - Admin sets min_supported_build in settings.
  - On launch, if appVersion < min, show blocking “Update required” prompt with store links.

27) Google Places Autocomplete for Addresses (v1)
- Description: Validated address capture with lat/lng and place_id.
- Acceptance:
  - Admin selecting a suggestion populates: formatted_address, place_id, lat, lng.
  - “Directions” link uses place_id when present.

Phase 2 placeholders (not in MVP):
- Email/Password Auth & Password Recovery.
- Masked Call Routing via Proxy Number.
- Anti-spam & Posting Guidelines for Requests (rate-limiting, keyword checks).
- Multi-city Deployment & City Switcher.
- Sponsorship Tiers & Slot Limits beyond simple priority.
- Stripe Subscriptions and Business Billing Dashboards.

---

## 5) Technical Architecture and Data Models

Primary platform: Bubble.io
Mobile: Responsive Bubble front-end wrapped (BDK Native / Capacitor).
Push: OneSignal (or BDK Native push via FCM/APNs).
SMS OTP: Twilio Verify (preferred) or Firebase Phone Auth.
Email: Postmark.
Maps/Places: Google Places Autocomplete + Maps links.
Storage: Bubble S3-backed storage + CDN.

Data Types (Bubble) — Fields, Types, Constraints

User
- phone_e164 (text, unique, required for end users)
- name (text)
- email (text, unique nullable)
- role (text enum: end_user|admin|super_admin)
- status (text enum: active|inactive)
- password_hash (text; required for admin/super_admin)
- mfa_enabled (yes/no)
- last_login_at (date)
- is_business_contact (yes/no; default no)
- created_at (date, auto)
- updated_at (date, auto)

UserDevice
- user (User)
- platform (text enum: ios|android|web)
- push_token (text)
- app_version (text)
- last_seen_at (date)
- created_at (date)

City
- name (text)
- slug (text, unique)
- country_code (text)
- state_code (text)
- is_active (yes/no)
- display_order (number)
- created_at/updated_at (date)

Category
- city (City)
- parent (Category nullable)
- name (text)
- slug (text)
- level (number: 0=Category, 1=Subcategory, 2=Sub-subcategory)
- description (text nullable)
- is_active (yes/no)
- display_order (number)
- created_at/updated_at (date)
- Constraints: unique (city, slug, level)

Business
- city (City)
- owner_user (User nullable; for targeted notifications)
- name (text)
- slug (text, unique within city)
- logo_url (image)
- phone (text E.164)
- phone_mode (text enum: number|icon)  // icon = hide number (phase 1 still dials number)
- whatsapp_number (text E.164)
- email (text)
- website_url (text)
- instagram_url (text)
- facebook_url (text)
- youtube_url (text)
- formatted_address (text)
- google_place_id (text)
- lat (number)
- lng (number)
- short_description (text)
- is_verified (yes/no)
- rating (number 0–5)
- ira_review (text, optional; reserved for future)
- status (text enum: active|inactive|soft_deleted)
- deactivated_at (date nullable)
- deleted_at (date nullable)
- created_at/updated_at (date)
- Index: city, status, name, is_verified, slug

BusinessImage
- business (Business)
- image_url (image)
- caption (text)
- display_order (number)

BusinessCategory (join)
- business (Business)
- category (Category)
- is_primary (yes/no)
- created_at (date)
- Constraint: unique (business, category)

MembershipPlan
- city (City nullable for global)
- name (text)
- duration_months (number)
- price_cents (number)
- currency (text, default USD)
- is_active (yes/no)
- display_order (number)
- created_at/updated_at (date)

BusinessSubscription
- business (Business)
- membership_plan (MembershipPlan)
- start_date (date)
- end_date (date)
- status (text enum: ACTIVE|EXPIRED|CANCELED)
- payment_status (text enum: PAID|UNPAID|PARTIAL)
- payment_method (text)
- amount_cents (number nullable)
- notes (text)
- created_at/updated_at (date)
- Index: end_date, status, payment_status

SponsorshipTier
- city (City nullable)
- name (text)
- priority (number) // lower = higher priority
- price_cents (number)
- color_hex (text)
- is_active (yes/no)
- created_at/updated_at (date)

Sponsorship
- business (Business)
- category (Category)
- tier (SponsorshipTier)
- start_date (date)
- end_date (date)
- status (text enum: SCHEDULED|ACTIVE|EXPIRED)
- amount_cents (number)
- created_at/updated_at (date)
- Index: category, start/end_date, status

Post (Community Request)
- city (City)
- user (User)
- title (text)
- description (text)
- status (text enum: PENDING|APPROVED|REJECTED|EXPIRED)
- approved_by (User nullable)
- approved_at (date nullable)
- expires_at (date)
- created_at/updated_at (date)
- Index: status, expires_at

Notification
- title (text)
- body (text)
- audience_type (text enum: BUSINESSES_BY_CITY|BUSINESSES_BY_CATEGORY|SPECIFIC_BUSINESSES|APP_UPDATE)
- city (City nullable)
- category_list (list of Category nullable)
- business_list (list of Business nullable)
- channel (text enum: PUSH|SMS|EMAIL)
- scheduled_for (date nullable)
- sent_at (date nullable)
- status (text enum: DRAFT|SCHEDULED|SENT|FAILED)
- created_by (User)
- created_at/updated_at (date)

NotificationDelivery (optional MVP)
- notification (Notification)
- user (User)
- device (UserDevice nullable)
- status (text enum: SENT|FAILED)
- error_code (text)
- sent_at (date)
- created_at (date)

AppSetting
- city (City nullable)
- key (text)
- value (text)
- created_at/updated_at (date)
Common keys:
- posts_expiry_days (default 7)
- posts_max_visible (default 20 per page)
- soft_delete_purge_days (default 180)
- otp_rate_limits (json)
- min_supported_build_ios, min_supported_build_android
- homepage_counts_override (json)
- reminder_schedule (json: [-14, -3, +7] days)

AuditLog
- actor_user (User)
- entity_type (text)
- entity_id (text)
- action (text enum: CREATE|UPDATE|DELETE|RESTORE|APPROVE|REJECT|ROLE_CHANGE|SETTINGS_CHANGE)
- changes_json (text)
- ip_address (text)
- created_at (date)

Scheduled (Backend) Workflows
- expire_posts: Set status=EXPIRED when now > expires_at.
- sponsorship_status_rollover: SCHEDULED->ACTIVE on start_date, ACTIVE->EXPIRED on end_date+1.
- subscription_status_rollover: Set EXPIRED when now > end_date; queue reminders (pre/post).
- purge_soft_deleted: Delete businesses with status=soft_deleted and deleted_at older than purge_days.
- send_broadcast_notification: Fan-out pushes by audience rules.
- renewal_reminders: Generate SMS/Email jobs per schedule.

Indexes & Uniqueness (Bubble-equivalent)
- Unique: City.slug; (City, Category.slug, Category.level); (City, Business.slug); (BusinessCategory: business, category).
- Add search indices: Business.name, Business.is_verified, Business.status, Business.city; Category.city, Category.parent; Post.status, Post.expires_at.

Privacy Rules (Bubble)
- End users: read-only access to published content for current city (only active categories; active businesses with ACTIVE subscriptions).
- End users: can create Post (own record) and read APPROVED/active posts.
- Admins: full CRUD per role; only Super Admin may alter roles or AppSettings keys limiting access (e.g., min_supported_build).
- Ensure PII fields (phone/email) not exposed beyond necessary contexts.

---

## 6) User Experience and Flows

End-User (Mobile)

1. App Launch & Update Check
- App checks AppSetting.min_supported_build_*; if current < min, show forced update dialog with store links.

2. OTP Login
- Enter phone; request OTP; verify; proceed. Persist session token for N days.

3. Home (City-scoped)
- Header with logo; city context implicitly Atlanta (no city switcher in MVP).
- About text, counts (override or dynamic).
- Collapsible category tree with up to 3 levels.
- Tap a subcategory (or category without children) to navigate to listing page.

4. Listing Page
- Breadcrumbs: Home > Category > Subcategory > (Sub-subcategory).
- Search input (scoped); filter toggles for Verified and Sponsored; pagination.
- Card: logo, name, phone/phone icon, WhatsApp, social icons, website, Verified tick, Sponsored tag/border; “More Info”.
- Tap-to-call (tel:), WhatsApp (wa.me), social links.
- More Info opens modal: address, directions, email, phone, website, short description, images (≤3).

5. Community Requests Board
- Post a request: title, description -> status=PENDING; shows status to author.
- View board of APPROVED, not expired posts; search; pagination.

6. Profile/Settings (lightweight)
- View/update name and optional email; view logout.

Admin (Web)

1. Admin Login + MFA
- Email/password + TOTP code. Role-based redirect to /admin dashboard.

2. Dashboard
- Quick stats: total active listings, categories, pending posts, upcoming renewals.
- Actions: Create Listing, Create Category, Review Posts.

3. Categories
- List/search; create/edit; parent assignment; drag to reorder; activate/deactivate; slug edit with uniqueness checks.

4. Listings
- List/search; filters by status, city, category, verified; create/edit; gallery images; assign to multiple subcategories; verify/rate; soft delete/restore; hard delete disabled (purged by job).

5. Memberships
- Plans: define/reorder; price/durations; city-scope.
- Subscriptions: tie to business; set start/end; status; payment_status; notes; renewal filters and CSV export.

6. Sponsorships
- Tiers: define (priority, price).
- Sponsorships: assign business + category + date range + amount; list/search; status rollovers.

7. Posts Moderation
- Queue: approve/reject with notes; edit expiry; view active/expired.

8. Notifications
- Compose broadcast: pick audience (by city/category/specific businesses); schedule/send; view status logs.

9. Users & Roles
- View/search users; activate/deactivate; assign admin roles (Super Admin only).

10. Settings & Homepage Content
- Edit About text; counts override; reminder schedule; expiry/purge durations; min_supported_build.

11. Audit Logs & CSV Export
- Filterable audit trail; exportable data by feature with applied filters.

---

## 7) Page-by-Page Specifications

Mobile App (End User)
- Splash/Update Prompt
  - Reads AppSetting keys and compares versions.
  - Buttons: Update, Close (disabled if forced).

- Login (OTP)
  - Input: phone (E.164 formatting helper).
  - Actions: Send OTP (rate-limited), Verify code, Resend.
  - Error messaging for invalid/expired OTP.

- Home
  - Header: app logo/title.
  - About section (admin-managed).
  - Counts: categories, businesses, community members (override or dynamic).
  - Category tree:
    - Level 0: Categories shown in brand color (green).
    - Expand to Level 1 (orange), Level 2 (brown).
    - Tap navigates to listing page at last-level node (or category if leaf).

- Listing Page
  - Breadcrumbs (tapable).
  - Search input (scoped); filters: Verified, Sponsored.
  - Pagination: numeric or prev/next; shows at least 10 per page.
  - Cards: one-row layout optimized for mobile:
    - Left: logo (square), Name + Verified tick.
    - Right: action icons (phone/WhatsApp/website/social), Sponsored tag/border; More Info link.
  - More Info modal: fields described above; carousel for images.

- Requests Board
  - Submit form (title, description); shows status.
  - List approved posts; search; pagination.
  - Expired posts hidden automatically.

- Profile/Settings
  - Display/edit name; optional email; logout.

Admin Web
- /admin/login: email/password + MFA.
- /admin/dashboard: stats & shortcuts.
- /admin/categories: CRUD, reorder, activate/deactivate, slugs.
- /admin/listings: CRUD, filters, soft delete/restore, bulk CSV export.
- /admin/memberships: Plans and Subscriptions management.
- /admin/sponsorships: Tiers and Sponsorships management.
- /admin/posts: Moderation queue + list.
- /admin/notifications: Compose, target, send, logs.
- /admin/users: list/filter; role assignment (super admin only).
- /admin/settings: app content (About), counts overrides, reminders, expiries, min builds.
- /admin/audit-logs: filterable, exportable.

Accessibility & UI Constraints
- Tap targets ≥44px; avoid dense icon clusters.
- Icons disabled (reduced opacity) if no link configured.
- Typography legible for older users; high contrast for verified/sponsored indicators.

---

## 8) Monetization Strategy

Model
- Required membership (6-month or annual) to be listed.
- Optional sponsorships per category/subcategory; sponsored-first ordering; visual highlight.

MVP
- Manual offline payments (cash/Zelle); admin records payment_status and controls activation.
- Automated SMS/email renewal reminders via configurable schedules.

Phase 2
- Stripe Billing subscriptions and Checkout; Stripe Customer Portal; sponsorship tiers with slot limits; admin revenue dashboard; Stripe invoicing for ACH/check/wire.

Proposed Price Points (example; configurable)
- Membership: $149/year or $89/6 months.
- Additional category add-on: $29/year per extra category.
- Sponsorship tiers: Bronze $49/mo, Silver $99/mo, Gold $199/mo; enforce priority and optional slots (phase 2).

---

## 9) Technical Stack and Requirements

Core
- Bubble.io (data types, privacy, responsive UI, backend workflows).
- Mobile wrapper: BDK Native or Capacitor for iOS/Android builds and push.
- Push: OneSignal (recommended) or BDK push; register UserDevice tokens.
- SMS OTP: Twilio Verify (preferred) with rate limiting.
- Email: Postmark (from test@millionlabs.digital for dev; production sender for Aira).
- Maps: Google Places Autocomplete + Maps deep links.

Environment & Secrets
- TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID
- ONESIGNAL_APP_ID, ONESIGNAL_API_KEY
- POSTMARK_SERVER_TOKEN
- GOOGLE_MAPS_API_KEY
- APP_ENV (dev/staging/prod)
- MIN_SUPPORTED_BUILD_IOS, MIN_SUPPORTED_BUILD_ANDROID (in AppSetting)

Security
- HTTPS/TLS enforced.
- OTP request rate limits + cooldown UI.
- Admin password + TOTP MFA (e.g., Google Authenticator).
- RBAC via Bubble privacy + server-side checks in backend workflows.
- Audit logging for all sensitive changes.

Performance Targets
- P50 page load: < 2s on listing pages (4G).
- Queries optimized with indices and filters; minimal denormalization (e.g., rating int).

---

## 10) Implementation Guidelines for AI Agents

Project Setup
- Create Bubble data types exactly as in Section 5; enforce constraints through workflows where uniqueness is needed.
- Implement privacy rules to restrict read/write per role.
- Seed initial City (Atlanta), sample Categories/Subcategories via Admin UI or script.

OTP Auth
- Build /v1/auth/otp/request and /v1/auth/otp/verify as backend workflows:
  - Validate E.164; throttle requests; call Twilio Verify; handle errors.
  - On verify success: create/update User with role=end_user if not exists; create session; link device token when available.

Admin Auth
- Separate /admin routes: email/password + MFA TOTP.
- Create Super Admin manually for bootstrap. Only Super Admin can manage roles.

Navigation & Listings
- Category tree: load by city, parent=null for root; recursive expand/repeating group for children.
- Breadcrumbs: maintain path state; tapping ancestor reloads the relevant level.
- Listing page data source:
  - Filter by selected category: include businesses linked via BusinessCategory where category is current (or descendants when applicable only if on parent leaf — MVP restrict to exact category context).
  - Only status=active and with ACTIVE BusinessSubscription overlapping now.
  - Sort using sponsorship presence in current category with tier priority, amount, then name.
  - Pagination using custom states (page, pageSize=10), display 10 items per page.

Search & Filters
- Search field applies :filtered on Business.name and Business.short_description (lowercase contains).
- Filters toggle verified-only and sponsored-only via data source constraints.

More Info Modal
- Show/hide fields if empty.
- Directions link:
  - If google_place_id -> use https://www.google.com/maps/search/?api=1&query=place_id:{place_id}
  - Else use https://www.google.com/maps/dir/?api=1&destination={encoded_address}

Posts Board
- Submission form writes Post with status=PENDING and expires_at = now + posts_expiry_days.
- Admin moderation toggles status and sets approved fields.
- Scheduled workflow expires posts; purge optional.

Memberships & Sponsorships
- Listing visibility computed: Listing active AND Subscription ACTIVE in now (inclusive).
- Nightly jobs update statuses by dates.
- Pricing visible/editable under Admin Settings.

Notifications
- On create broadcast: compute recipients (business owners linked via Business.owner_user or is_business_contact=true).
- Push via OneSignal API; log Notification and (optional) NotificationDelivery records.

Audit Logging
- Create a centralized workflow to write AuditLog entries; call it after each admin action.
- Include old/new values in changes_json.

CSV Exports
- Generate via Bubble’s export with applied filters; or assemble server-side and return a file.

Deep Links & Slugs
- Slug generation: lowercased, hyphenized names; enforce uniqueness within city scope for Category (level) and Business.
- When opening a deep link in app, parse city/category slugs to navigate to correct screens.

---

## 11) Testing and Quality Criteria

Functional Acceptance Tests (Gherkin examples)

OTP Login
- Given a registered phone, when I request an OTP and enter it within 5 minutes, then I should be logged in and see Home.
- Given I exceed OTP attempts, when I request again within 1 minute, then I should see a throttling message.

Category Navigation
- Given a category with children, when I tap it, then I should see subcategories and updated breadcrumbs.
- Given a leaf category, when I tap it, then I should be taken to the listing page.

Scoped Search
- Given I am on “Restaurants” subcategory, when I search “veg”, then only listings under “Restaurants” matching “veg” are shown.

Listing Sort & Filters
- Given a mix of sponsored and non-sponsored listings, when I load the page, then sponsored appear first ordered by tier.priority then amount then name.
- Given I toggle Verified, when I view results, then only verified listings appear.

More Info
- Given a listing with address and images, when I tap More Info, then I see address, a Directions link, and up to 3 images.

Membership Visibility
- Given a listing with EXPIRED subscription, when I visit its category, then it does not appear.

Posts Moderation
- Given I submit a request, when Admin approves it, then it appears on the board until expires_at.

Broadcast Notifications
- Given Admin selects Restaurants in Atlanta, when a push broadcast is sent, then only business users linked to Restaurants in Atlanta get the push.

Audit Logs
- Given Admin updates pricing, when I open Audit Logs, then I see an UPDATE entry with changed fields.

Non-Functional
- Performance: P50 < 2s listing load, P90 < 4s on 4G; image assets optimized, lazy-loaded.
- Reliability: OTP delivery success ≥ 98% in test markets; retry flows; clear errors.
- UX: Tap targets ≥44px; headings readable; no icon-only affordances without tooltips/labels where possible.
- Security: Admin routes protected; MFA enforced; OTP rate limits; PII guarded by privacy rules.

QA Strategy
- Unit tests for backend workflows (simulate OTP, reminders, rollovers).
- Integration tests: full flows from login to listing browse, posting, and admin moderation.
- UAT scripts for Admin: Categories CRUD, Listings CRUD, Membership, Sponsorship, Posts, Notifications, Settings, Exports, Audit Logs.

---

## 12) Deployment and Scaling Considerations

Environments
- Bubble Development (dev), Staging (optional), Live (prod).
- Feature flags via AppSetting keys.

Initial Data Seeding
- City: Atlanta (active).
- Initial categories/subcategories.
- At least 10 sample businesses across 3+ categories to validate pagination/sort.
- Membership plans (6, 12 months).
- One SponsorshipTier (e.g., Default priority=1) for MVP; extend tiers later.

Job Scheduling
- Configure recurring backend workflows for:
  - expire_posts (hourly)
  - sponsorship_status_rollover (hourly)
  - subscription_status_rollover + renewal_reminders (daily)
  - purge_soft_deleted (daily)

Monitoring & Logs
- Bubble logs + external error tracking (optional).
- Track OTP send/verify error codes and failure rates.

Backups
- Bubble automatic backups; schedule periodic exports of critical entities (Business, Category, BusinessSubscription, Sponsorship).

Scalability
- Use indexed searches and minimal joins within Bubble constraints.
- If search scale needs exceed Bubble, integrate Algolia (phase 2).
- Consider externalizing notifications fan-out if audience size grows (OneSignal handles scale well).

App Store Submission
- Prepare app name, description, screenshots (iOS/Android); configure bundle IDs; push entitlements.
- Test push notifications on both platforms before submission.

---

## API Specifications (Bubble Backend Workflows)

Note: Bubble workflows typically live at /api/1.1/wf/{name}. Include authentication (App token / logged-in user). Where applicable, secure endpoints with role checks.

Public (Authenticated Users)
- POST /v1/auth/otp/request
  - body: { phone_e164 }
  - resp: { success, throttle_hint }
- POST /v1/auth/otp/verify
  - body: { phone_e164, code }
  - resp: { success, session_token }
- GET /v1/cities
  - resp: [{ name, slug }]
- GET /v1/cities/{citySlug}/categories?parent={slug|null}
  - resp: category list with children meta.
- GET /v1/cities/{citySlug}/categories/{catSlug}/listings?page=&pageSize=&filter=verified|sponsored&q=
  - resp: { items: [card fields], page, totalPages }
- GET /v1/businesses/{businessSlug}
  - resp: full business details + images.
- GET /v1/posts?status=APPROVED&page=&q=
  - resp: posts, paginated.
- POST /v1/posts
  - body: { title, description }
  - resp: created post with PENDING status.

Admin (role=admin or super_admin)
- POST /v1/admin/login (email+password) + /v1/admin/mfa/verify
- CRUD /v1/admin/cities
- CRUD /v1/admin/categories
- CRUD /v1/admin/businesses
- POST /v1/admin/businesses/{id}/images (uploads)
- CRUD /v1/admin/membership-plans
- CRUD /v1/admin/subscriptions
- CRUD /v1/admin/sponsorship-tiers
- CRUD /v1/admin/sponsorships
- GET/POST /v1/admin/posts (moderation)
- POST /v1/admin/notifications (compose/send)
- GET/POST /v1/admin/settings
- GET /v1/admin/audit-logs (filters)
- GET /v1/admin/exports?entity=&filters=

Example JSON — Listing Card
{
  "id": "biz_123",
  "name": "Elegant Catering",
  "slug": "elegant-catering",
  "logo_url": "https://...",
  "is_verified": true,
  "rating": 4,
  "phone_mode": "number",
  "phone": "+14045551234",
  "whatsapp_number": "+14045551234",
  "website_url": "https://elegant.example",
  "instagram_url": "https://instagram.com/elegant",
  "facebook_url": null,
  "sponsored": true
}

---

## Additional Acceptance & Edge Cases

- Business in multiple subcategories: one Business record, many BusinessCategory joins; update once reflects everywhere.
- Category deactivation: hides category and prevents it as a filter; associated listings still exist but are unreachable by users until reactivated or re-assigned.
- Sponsorship category mismatch: sponsored status only applies on listing pages matching that category.
- Phone Mode=icon in MVP: still dials real phone number, number not shown on card (only phone icon). True proxy mask deferred to phase 2.
- Posts “two to three pages” retention: configurable pagination + expiry_days enforce limited visible history.

---

## Roadmap: Phase 2 Highlights (Out of Scope for MVP)

- Email/password flows for end users and password recovery fallback.
- Masked call routing via Twilio proxy numbers; call logging (basic analytics).
- Anti-spam (rate limiting, disallow promo keywords, rejection reasons UI).
- Multi-city switcher UI; cross-city slug handling in app; city awareness in admin analytics.
- Sponsorship tiers with slot limits and richer ordering/rotation.
- Stripe subscriptions (memberships and sponsorship add-ons), Checkout, Customer Portal, revenue dashboards, and invoicing.

---

## Appendix: Role Matrix (MVP)

- End User:
  - Can login via OTP; browse/search listings; submit Posts; manage profile; receive app update prompts.
- Business User (same as End User + flagged is_business_contact):
  - Receives business-targeted broadcasts.
- Admin:
  - CRUD Categories, Listings, Memberships, Sponsorships, Pricing; Moderate Posts; Broadcasts; Exports; View Audit Logs.
- Super Admin:
  - All Admin capabilities + Manage Users/Roles + Manage AppSettings keys that affect platform (e.g., min app builds, purge/reminder configs).

---

## Appendix: Style & UX Tokens (Guidelines)

- Colors (as per client preference):
  - Level 0 Category: Green (#… exact hex provided by design).
  - Level 1 Subcategory: Orange (#…).
  - Level 2 Sub-subcategory: Brown (#…).
  - Sponsored highlight: subtle red border + “Sponsored” tag.
  - Verified: green tick icon.
- Typography: Mobile-friendly sizes; avoid small text in modals; ensure contrast compliance (WCAG AA).

---

This PRD is designed to be directly actionable for Bubble-based AI coding agents, with data models, workflows, endpoints, and acceptance criteria aligned to the MVP scope and future-proofed for Phase 2 enhancements.
