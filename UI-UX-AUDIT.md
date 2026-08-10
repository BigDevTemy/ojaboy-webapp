# Ojaboy UI/UX Launch Audit

**Audit date:** 10 August 2026  
**Release context:** Pre-launch review of the authenticated app at `app.ojaboy.com`; the marketing website/landing page is outside this repository's scope  
**Overall readiness:** **Conditionally ready for an authenticated app launch after the P0 release checks below**  
**Source-backed UX score:** **62/100**

## Executive summary

Ojaboy has a coherent visual foundation: a recognizable red brand colour, consistent rounded surfaces, generally generous touch targets, responsive dashboard shells, explicit loading states, and role-specific customer/market-agent experiences. The product already feels more considered than a raw admin template.

Because this repository is the authenticated product hosted at `app.ojaboy.com`, a login-first root is appropriate and the absence of marketing content is not a defect. The main release risks are instead implementation and product-quality issues: the root embeds the login route in a way that duplicates shell UI, dormant prototype/public routes remain reachable, several authenticated controls appear actionable but do nothing, and production lint/build status is unverified. The app also needs a focused accessibility pass: keyboard focus is routinely suppressed, login fields have no visible labels, important mobile text is as small as 8–10px, and several status treatments depend heavily on colour.

The app can proceed to a controlled production launch after the P0 authentication, routing, duplicate-UI, and build checks pass. Accessibility and misleading inactive controls should follow immediately and before scaling traffic.

## Audit scope and confidence

This review covered the application source, route structure, public pages, authentication flows, customer mobile shell, role-based dashboard shell, navigation, forms, loading/error states, PWA entry point, and production validation commands.

The in-app browser was unavailable during the audit, so this is not a rendered visual or click-through certification. Layout, contrast, overflow, API behaviour, screen-reader output, and device-specific behaviour still require the manual launch checklist at the end. Findings explicitly tied to source are high-confidence.

## What is working well

- Brand styling is consistent across public, authentication, customer, and admin surfaces.
- Most primary controls use 44–48px heights, which is appropriate for touch.
- Customer navigation is purpose-built for mobile and includes safe-area handling for installed iOS/PWA use.
- Loading, empty, disabled, and error states exist in many of the more complex dashboard flows.
- Customer, market-agent, and other dashboard experiences are separated rather than forcing every role into one layout.
- Inputs generally use appropriate HTML types and autocomplete attributes in authentication flows.
- Reduced-motion support exists for the market ticker.

## Prioritized findings

### P0 — Fix before the authenticated app launch

#### 1. The root route composes the login route incorrectly and duplicates global UI

`app/page.tsx` renders the `/login` page component directly. A login-first root is correct for `app.ojaboy.com`, but that route component already supplies a page shell and chat widget while the root adds another chat widget. This can produce nested `<main>` landmarks and two overlapping chat launchers.

**Impact:** Accessibility and interaction risk on the primary entry route.  
**Recommendation:** Make `/` issue a server redirect to `/login`, or extract and reuse a shared login-screen component without nesting route components. Render the chat widget once. Keep the PWA start URL session-aware so returning users can continue to the dashboard.

#### 2. Marketing/prototype routes should not remain exposed on the app subdomain

The repository still exposes About, FAQ, Blog, and a public Market Prices route, while `PageShell` intentionally disables their header. These pages belong to the marketing-site concern but are reachable on the app host. The dormant Header component's mobile menu is also nonfunctional.

**Impact:** Duplicate content, confused ownership, unfinished surfaces appearing in search/direct links, and inconsistent navigation between `ojaboy.com` and `app.ojaboy.com`.  
**Recommendation:** Redirect marketing routes to their canonical pages on `ojaboy.com`, or remove them from the app deployment. Keep only authentication, verification/recovery, and authenticated product routes on the app host. Add canonical/noindex policy as appropriate.

#### 3. Reachable prototype routes expose mock data as if live

The Market Prices page calls its data “Live commodity prices” while displaying hard-coded rows and saying it is ready for a future backend. FAQ copy says ordering is “planned” and the UI is static. Blog cards look like content but do not link anywhere.

**Impact:** High trust and potentially reputational risk; users may make purchase decisions from stale prices.  
**Recommendation:** Prefer redirecting/removing these routes from `app.ojaboy.com`. If the public market-price route is intentionally retained, connect verified live data or remove the “Live” claim and show source, observation time, unit definition, freshness, and an informational disclaimer.

#### 4. Authentication-page footer links and social icons are dead

All footer and social destinations use `href="#"`, including Terms, Privacy, Refund, Contact, and Help. The copyright still says 2024.

**Impact:** Legal/compliance, support, credibility, and keyboard-navigation failure.  
**Recommendation:** Link legal/support items to canonical pages on `ojaboy.com` and use real social destinations. Remove unavailable links rather than shipping dead controls. Generate the copyright year dynamically or update it to 2026.

#### 5. Production readiness is not verified

`npm run lint` did not complete within the 120-second audit window. A production build could not start because another Next build process held the build lock. This audit therefore cannot certify a clean lint or production build.

**Impact:** Unknown deployment and runtime risk.  
**Recommendation:** Before release, allow the existing build to finish or stop only the confirmed stale project build process, then require both `npm run lint` and `npm run build` to pass. Treat any failure as a deployment blocker.

### P1 — Fix before inviting significant user traffic

#### 6. Keyboard focus is too weak or absent

Many inputs and textareas use `outline-none` and replace it with only a subtle border colour. Most links/buttons define hover styles without equally visible `focus-visible` styles.

**Impact:** Keyboard and low-vision users can lose their position; this also makes complex admin workflows error-prone.  
**Recommendation:** Establish a global, high-contrast `:focus-visible` ring with at least a 2px indicator and offset. Do not remove outlines unless replaced with an equally clear indicator. Test every route using only Tab, Shift+Tab, Enter, Space, and Escape.

#### 7. Authentication form semantics and recovery need improvement

The login inputs rely on placeholders instead of persistent labels. Errors are visual paragraphs without `aria-live`, fields do not reference their errors, there is no password visibility control, and signup does not explain password requirements before submission. Signup also states that account creation accepts terms and market alerts without a linked policy or explicit consent control.

**Impact:** Accessibility, failed sign-ins, avoidable signup errors, and questionable consent clarity.  
**Recommendation:** Add visible labels, field-level errors, `aria-describedby`, an error summary/live region, password reveal, Caps Lock hint, and password requirements. Link Terms and Privacy. Separate required agreement from optional marketing consent.

#### 8. Critical mobile text is below a comfortable readable size

The customer bottom navigation uses 9px labels and many order, market, wishlist, status, timestamp, and metadata labels use 8–10px text with low-opacity black. Some desktop operational tables do the same.

**Impact:** Poor readability outdoors, on low-density phones, and for users with low vision—especially problematic for prices, quantities, and order status.  
**Recommendation:** Use 12px as the practical minimum for secondary labels and 14–16px for transactional content. Avoid low-opacity text for essential facts. Confirm layouts at 200% text zoom.

#### 9. Dashboard navigation is too flat and crowded

The desktop sidebar presents roughly 20 destinations in one continuous list, mixing commerce, catalogue, operations, marketing, reporting, support, and settings. “Staffs” is also less natural than “Staff” or “Team.” The Orders badge is hard-coded to `3`.

**Impact:** Slower wayfinding, perceived complexity, and misleading notification state.  
**Recommendation:** Group navigation into labelled sections, prioritize each role’s frequent tasks, move low-frequency configuration under Settings, use permissions to hide unavailable modules, and source badges from live unread/action-needed counts.

#### 10. Search and interactive affordances are inconsistent

The public market search input has no state or filtering logic. Blog cards have no link. The sidebar profile button displays a chevron but has no action. “Upgrade Now” has no action. Several visible controls therefore promise behaviour they do not deliver.

**Impact:** Erodes confidence quickly because users learn that clickable-looking UI may not work.  
**Recommendation:** Wire each affordance, mark it clearly unavailable, or remove it. Never ship a chevron, button, search field, or card hover treatment without the expected outcome.

### P2 — Improve shortly after launch

#### 11. Information hierarchy overuses heavy font weight

`font-black` is used for headings, labels, navigation, buttons, badges, and metadata. When everything is emphasized, scanning priority becomes less clear.

**Recommendation:** Reserve the heaviest weight for page titles and primary actions. Use medium/semibold for labels, nav, and supporting content; let size, spacing, and colour carry hierarchy.

#### 12. Colour semantics need standardization

Brand red is used for primary actions, errors, positive price increases, selection, and general emphasis. Green can mean lower prices, success, or completion. Price direction is mainly communicated by colour and signs.

**Recommendation:** Define semantic tokens for action, danger, success, warning, and price movement. Pair colour with arrows and explicit “up/down” text where decisions depend on it.

#### 13. The handoff from the marketing site to the app should preserve context

The marketing site is outside this audit, but the app entry should preserve the promise and intended action that brought a user from `ojaboy.com`. A generic login screen can create a context break for users who selected a specific signup, price, order, or invitation CTA.

**Recommendation:** Use explicit login/signup return URLs or campaign parameters, retain invitation/referral context, and return authenticated users to the intended destination. Keep brand, terminology, and support/legal links consistent across both domains.

#### 14. PWA launch behaviour is not role-aware

The manifest starts at `/`, which currently means login even for returning installed-app users. Portrait orientation is forced.

**Recommendation:** Decide deliberately whether installed users should start at `/dashboard`, a session-aware routing page, or login. Avoid forcing portrait unless landscape is genuinely unsupported and tested.

#### 15. Developer diagnostics leak into signup/set-password flows

Validation helpers contain unconditional `console.log` calls, including a typo in one message.

**Recommendation:** Remove production console noise or route sanitized diagnostics through an environment-aware logging service. Never log tokens, passwords, full API payloads, or personal data.

## Recommended launch sequence

### Today: minimum safe release gate

1. Fix the root-route duplication and single-instance chat widget.
2. Redirect or remove marketing/prototype routes from the app host.
3. Replace every dead authentication/footer link with its canonical `ojaboy.com` destination or remove it.
4. Remove mock/live contradictions from any public route intentionally retained.
5. Confirm working Privacy, Terms, Contact, and Help destinations.
6. Confirm API environment configuration, authentication, email verification, password reset, logout, role routing, and default-address onboarding against production.
7. Pass lint and production build; deploy to staging first.
8. Run the manual browser/device checklist below.

### First week after launch

1. Complete the keyboard/focus and form accessibility pass.
2. Increase critical text sizes and contrast.
3. Group dashboard navigation by task and role.
4. Replace hard-coded counters/statuses with live state.
5. Instrument the key funnel: landing → signup → verification → address → first price view → first order.

## Manual launch acceptance checklist

Complete this on the actual production candidate, not only localhost.

- Test at 320, 375, 390, 768, 1024, and 1440px widths.
- Test iOS Safari, Android Chrome, and desktop Chrome/Edge; include one Firefox pass.
- At 200% browser zoom, confirm no clipped text, hidden actions, or horizontal page scroll.
- Navigate every public and dashboard route by keyboard only; confirm focus is always visible.
- Confirm the mobile menu opens, traps focus, closes with Escape/backdrop, and returns focus to its trigger.
- Use a screen reader to verify page title, heading order, landmarks, form labels, errors, dialogs, and status announcements.
- Verify login failure, Google sign-in failure, signup validation, verification expiry/resend, forgot password, reset password, logout, and expired-session recovery.
- Test slow 3G/offline transitions and API 400/401/403/404/409/429/500 responses.
- Confirm empty, loading, partial-data, stale-data, and no-permission states for orders, prices, markets, alerts, wishlist, reports, and support.
- Confirm all prices show currency, unit, market, source/freshness, and a human-readable observation time.
- Confirm destructive admin actions require clear confirmation, describe consequences, prevent double submission, and provide success/failure feedback.
- Install the PWA, relaunch it as a signed-in and signed-out user, test safe areas, and verify service-worker update behaviour.
- Check that every visible link/button works and that no `#` links, prototype copy, debug logs, or hard-coded notification counts remain.
- Run an automated accessibility scan, but do not treat it as a substitute for keyboard and screen-reader testing.

## Go/no-go recommendation

**Conditional go for the authenticated app launch.** A login-first root is appropriate for `app.ojaboy.com`. Before release, fix the duplicated root/chat composition, prevent unfinished marketing/prototype routes from being exposed on the app host, smoke-test production authentication and role routing, and require lint/build to pass. The P1 accessibility and inactive-control work should be treated as the immediate post-launch priority and completed before scaling traffic.
