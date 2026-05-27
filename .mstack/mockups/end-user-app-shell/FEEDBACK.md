# Mockup Feedback — End-User App Shell

**Winner:** V4 — Sidebar Refined  
**Date locked:** 2026-05-27  
**Refined from:** V2 (Editorial Sidebar Split)

## Why V4

The persistent green-textured left sidebar (matching the Figma inspiration
`Sidebar_menu_1779692573949.png`) makes category navigation feel native to
the brand. The cream-textured main area gives content room to breathe, and
the mobile 3-tab structure (Home / Categories / Account) is the right level
of simplicity for the end-user app.

## Locked design decisions from this mockup round

1. **Desktop nav = persistent left sidebar** (no top nav).
   - Width: ~280px
   - Background: `paper-green.webp` texture
   - Header: avatar circle + "AIRA / by Nisarga" stacked
   - Menu rows: leading icon (cream) + label (cream) + trailing chevron
   - Active row: subtle cream/10% background tint + bold label
   - Footer: "Contact Us" + 3 icon buttons (mail / globe / phone) + "Operated by Nisarga Group LLC"
   - Utility actions (notifications, sign out, account) move to a thin top utility bar in the main content area on desktop

2. **Mobile nav = 3-tab bottom bar + hamburger drawer**
   - Bottom tabs (always visible): **Home** · **Categories** · **Account**
   - Hamburger in top bar opens the full green sidebar as a drawer (with close X)
   - Messages and notifications move to the top bar notification bell

3. **Home screen content** (mobile + desktop):
   - Centered AIRA logo mark (olive circle, cream "A")
   - "AIRA" wordmark + "ROOTS · REACH" caps tagline (from `brand.tagline`)
   - "About AIRA" headline + paragraph
   - Two stat cards: 500+ Verified Businesses · 10K+ Community Members
   - "Featured Businesses" section with avatar + name + verified tick + Call button
   - "View All →" link

4. **Business card pattern** (used everywhere):
   - Circular avatar (cream background, cream border)
   - Display-font name + verified blue tick
   - Body-font category · location subtitle
   - Tier pill (Tier 1 olive / Tier 2 burnt-orange / Tier 3 chocolate) — desktop listings only
   - Olive "☎ Call" pill button at the right

5. **Account screen** (mobile, new screen this round):
   - Profile header: avatar + name + email
   - "Account" group: Edit profile · Notifications · Privacy & security
   - "Support" group: Contact us · Terms & privacy · About AIRA
   - "Sign out" outline button
   - "Operated by Nisarga Group LLC" footer

6. **Categories screen** (mobile, new screen this round):
   - Full-width list of 7 categories
   - Each row: icon + name + count subtitle + chevron
   - Reuses the same green sidebar content but as a dedicated screen

7. **Admin**
   - Out of scope here — stays at `/admin/*` with existing layout, untouched

## What changed vs the original review

- Top nav with 4-link hamburger drawer → persistent green-textured sidebar (desktop)
- Mobile hamburger drawer → mobile 3-tab bottom bar + hamburger that opens the full sidebar
- "/account" decision flips back: Account is now its own screen on mobile (not a redirect to /profile) so the bottom tab has a real destination. Desktop "Account" link in utility bar can still link to /profile.
- New mobile route: `/categories` (full-screen category list)
- New components: `Sidebar` (persistent + drawer modes), `BottomTabBar`, `AccountScreen`, `StatCard`, `BusinessCard` (avatar + call-button variant)
