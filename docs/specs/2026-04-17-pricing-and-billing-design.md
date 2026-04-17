# Pricing & Billing (Phase 3 — Pro) — Design Spec

**Date:** 2026-04-17
**Status:** Approved (design); implementation plan to follow
**Owner:** @manudelp
**Parent spec:** `docs/specs/2026-04-16-account-tiers-design.md` (Phase 3)

## Context

`account-tiers-design.md` locked in the three-tier ladder (Anonymous → Free → Pro) and the phased rollout (History → Limits → Pro). Phase 1 (History) is being wired through the tools now; Phase 2 (Limits) is next. This spec closes the open questions for **Phase 3 — Pro**: price points, merchant model, the exact feature envelope we ship Pro with, the backend/data model for subscriptions, the frontend surfaces, and the operational/legal prerequisites that must be true before the live-key flip.

Payment decisions were deliberately deferred by the parent spec; this document is where they get made.

## Goals

- Define a prosumer-priced Pro subscription that converts from Free without changing the anonymous flow.
- Choose a payment stack that (a) ships fast, (b) keeps PCI scope minimal, (c) can be swapped for a Merchant-of-Record later without rewriting our app.
- Define entitlement state as a single resolver function used everywhere, so no tool or surface re-implements "is this user Pro?".
- Enumerate the legal, tax, operational, and monitoring prerequisites with enough specificity that none of them are discovered mid-launch.

## Non-goals

- Team / seat-based billing. Solo accounts only (matches parent spec).
- One-time / lifetime purchases at launch.
- Multi-currency display at launch. USD only.
- In-app purchases (Apple/Google IAP). Irrelevant until a mobile app exists.
- Self-built plan-switching UI. Stripe Customer Portal does it.
- Coupon/promo engine at launch. Post-launch addition.
- Affiliate / referral program.

## Strategic decisions (answered upfront)

| Question | Decision | Alternative considered |
|---|---|---|
| Target customer | Prosumer individuals | SMB/teams (moves Pro off this roadmap) |
| Price band | $5–8 / month | $9–15 "obvious upgrade" — rejected for prosumer fit |
| Merchant model | Stripe direct (we are the merchant) | Paddle / LemonSqueezy MoR — reversible later |
| Tiers at launch | One paid tier (Pro) + monthly & annual | Pro + Team — contradicts solo-only scope |
| Trial policy | No trial — Free IS the trial | 7/14-day trial — adds friction without funnel data |
| Geography | Global, USD only | Multi-currency — defer until volume justifies FX complexity |

## Pricing

| Plan | Price | Effective /mo | Billing cadence |
|---|---|---|---|
| Pro Monthly | **$6 USD / month** | $6.00 | Monthly auto-renew |
| Pro Annual | **$60 USD / year** | $5.00 | Annual auto-renew, highlighted as default on `/pricing` |

- Annual is the default highlighted CTA ("Save ~17%"). Toggle on the pricing page switches between cadences.
- All prices are **inclusive of applicable tax only where required by law** (VAT/GST). Stripe Tax handles calculation and display. Default posture is tax-exclusive for US customers, tax-inclusive for VAT countries per local convention (Stripe handles the display automatically).
- **Price changes** follow a ≥30-day email notice for existing subscribers; grandfathering rules are not promised in the ToS.

## Final tier ladder (overrides parent spec placeholders)

|  | Anonymous | Free (account) | **Pro** |
|---|---|---|---|
| File size cap | 10 MB | 25 MB | **100 MB** |
| Daily jobs | 20 / day / IP | 200 / day | **Fair-use, 2,000 / day soft cap** |
| Result retention | 1 hour, one-shot link | 7 days | **30 days** |
| History dashboard | — | last 7 days | **last 30 days + search/filter** |
| Saved presets | — | — | **✓** |
| Priority processing | — | — | **✓** (separate queue during anon load) |
| Pro badge in header | — | — | **✓** |
| Email support | — | community | **48-hour SLA** |
| Ads / upsell nudges | shown | none | none |

**Deviations from parent spec and why:**
- Free file-size cap lowered from 50 → 25 MB. The parent's 50 MB placeholder left only 5× headroom above Anonymous; 25 MB preserves a meaningful Free tier while giving Pro a clearer 4× jump. Revisit once Phase 2 produces real distribution data.
- Pro file-size cap lowered from 250 → 100 MB. 250 MB forces a Supabase plan upgrade before we have Pro revenue validating it. 100 MB comfortably fits current Supabase object limits and covers >99% of real xlsx workloads. Revisit after 3 months of Pro data.
- Pro daily jobs clarified from "Unlimited (fair-use)" → `Fair-use, 2,000 / day soft cap`. Same intent; soft cap gives us an operational number to alert on without advertising a ceiling.
- **Pipelines, batch processing, and API access are deferred to Pro v2.** Launching Pro with every wishlist feature is the single biggest schedule risk; each of those three is a multi-week engineering project. Pro v1 leans on retention + limits + presets + priority + badge — a marketable, small surface.

## Pro v1 feature envelope (what actually ships at launch)

In priority order:

1. **30-day output retention** (Free is 7 days) — already partially supported by the Phase 1 Storage layer; only the retention constant changes.
2. **Raised file-size and daily-job limits** (table above) — enforced by the Phase 2 limits layer, gated by the entitlement resolver.
3. **Saved presets** — name and reuse any tool's config. New `tool_presets` table scoped to user. Minimal tool-side change: each tool's config form can "Save as preset" / "Load preset".
4. **Priority processing** — Pro requests skip the anonymous queue. Implementation is a priority flag on the existing job queue; no new infra.
5. **Pro badge** — small UI affordance next to avatar in header. Pure social proof, zero backend.
6. **48-hour email support SLA** — operational commitment, not engineering. Requires a monitored `billing@xlsxworld.com` / `support@xlsxworld.com` inbox.

**Deferred to Pro v2** (explicitly out of this spec): personal API key, pipelines (chain tools), batch (drop N files → zip).

## Payment architecture

**Stripe direct, Stripe Checkout hosted, Stripe Customer Portal for self-service.**

```
User ──(click "Get Pro")──▶  /billing/checkout  ──▶  Stripe Checkout (hosted)
                                                          │
                                   success redirect ◀─────┤
                                                          │
                              Stripe  ──(webhook)──▶  /webhooks/stripe  ──▶ DB
                                                          │
User ──(click "Manage billing")──▶  /billing/portal  ──▶ Stripe Customer Portal
```

### Why hosted Checkout + Portal

- **PCI scope is SAQ A** (the simplest questionnaire) because no card data ever touches our servers or DOM. Embedded Elements would put us on SAQ A-EP, more scope, more attestation work.
- 3DS / SCA, Apple Pay, Google Pay, link-to-pay, wallets, localized error strings — all free, maintained by Stripe.
- Portal gives users plan-change, card-update, cancel, invoice download, tax-ID entry out of the box. Building these ourselves is weeks of work that adds zero product value.
- The trade-off is a redirect off our domain during checkout. For a $6 prosumer product the conversion delta is negligible; for enterprise deals it would matter.

### Webhook-driven entitlement (single source of truth)

The checkout success redirect is UX only — a "thanks, your plan is being activated" page. It **never** grants access. All entitlement state transitions happen on webhook events:

| Event | Action |
|---|---|
| `checkout.session.completed` | Link Stripe customer to user; no state change yet |
| `customer.subscription.created` | Set `pro_status = active`, set plan, period end |
| `customer.subscription.updated` | Re-sync all fields; handles plan switches, pauses, grace periods |
| `customer.subscription.deleted` | Set `pro_status = canceled`, null out plan |
| `invoice.paid` | Extend `pro_current_period_end`; ensure status is `active` |
| `invoice.payment_failed` | Status flips to `past_due` (retained access during Stripe's ~3-week smart-retry window) |

All writes are idempotent keyed on `stripe_event.id`. Replaying the same event must be a no-op.

### Reconciliation cron (catches the webhook we miss)

A nightly job iterates users with `pro_status != 'none'` and reconciles against `stripe.subscriptions.retrieve()`. Any drift writes a reconciliation log row and corrects local state. One missed webhook over the project's lifetime is expected; reconciliation makes it recoverable silently instead of a support ticket.

## Data model

Additive only. No destructive migrations.

### `users` — new columns

| Column | Type | Default | Notes |
|---|---|---|---|
| `stripe_customer_id` | `text` | `NULL` | Unique when set |
| `pro_status` | `text` (enum-like) | `'none'` | `none` \| `active` \| `past_due` \| `canceled` |
| `pro_plan` | `text` | `NULL` | `monthly` \| `annual` |
| `pro_current_period_end` | `timestamptz` | `NULL` | From Stripe |
| `pro_cancel_at_period_end` | `boolean` | `false` | Set by Portal cancellations |

### New tables

**`stripe_events`** — raw audit log, idempotency source of truth.
| Column | Type | Notes |
|---|---|---|
| `event_id` | `text` PK | Stripe's `evt_...` |
| `type` | `text` | e.g. `invoice.paid` |
| `payload` | `jsonb` | Full event body |
| `received_at` | `timestamptz` | `default now()` |
| `processed_at` | `timestamptz` | `NULL` until handler completes |

**`subscription_history`** — thin changelog for support and churn analytics.
| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` PK | |
| `user_id` | `uuid` FK | |
| `from_status` | `text` | |
| `to_status` | `text` | |
| `from_plan` | `text` \| `NULL` | |
| `to_plan` | `text` \| `NULL` | |
| `stripe_event_id` | `text` FK | Points back into `stripe_events` |
| `created_at` | `timestamptz` | `default now()` |

**`tool_presets`** (Pro v1 feature — scoped here to keep Pro-related schema in one spec).
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `tool_slug` | `text` | Matches `toolsData.ts` slug |
| `name` | `text` | User-supplied |
| `config` | `jsonb` | Tool-specific shape |
| `created_at` / `updated_at` | `timestamptz` | |

Unique index: `(user_id, tool_slug, name)`.

### Entitlement resolver

Single function, used by the rate-limiter, retention, presets, priority-queue, and frontend middleware.

```python
def is_pro(user: User) -> bool:
    return user.pro_status in ("active", "past_due")
```

`past_due` intentionally counts as Pro to preserve access during Stripe's smart-retry window. After ~3 weeks Stripe flips the subscription to `canceled` on its own and the next webhook downgrades the local state. No custom grace-period logic on our side.

## Backend API

All endpoints require authentication except the webhook, which requires signature verification instead.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/billing/checkout` | Create Stripe Checkout Session. Body: `{ plan: 'monthly' \| 'annual' }`. Returns `{ url }`. |
| `POST` | `/api/v1/billing/portal` | Create Stripe Customer Portal session for the current user. Returns `{ url }`. |
| `POST` | `/api/v1/webhooks/stripe` | Signature-verified webhook handler. Idempotent. |
| `GET`  | `/api/v1/me/entitlements` | Returns `{ pro_status, pro_plan, pro_current_period_end, cancel_at_period_end }`. Consumed by the frontend on every session load. |
| `GET` / `POST` / `PATCH` / `DELETE` | `/api/v1/me/presets` (+ `/:id`) | Pro v1 preset CRUD. Gated by `is_pro`. |

The webhook endpoint has its own middleware path that skips the global JSON-body parsing (Stripe signs the raw body; any transformation breaks the signature).

## Frontend surfaces

All new strings land in `en` / `es` / `fr` / `pt` at PR time (current convention).

### `/pricing` (new, public)

- In top nav, indexed for SEO (unique `title`, `description`, structured data `Product`+`Offer`).
- Three columns: Anonymous · Free · **Pro (highlighted)**.
- Monthly ↔ Annual toggle at the top. Annual shows the "$5 effective / month, billed $60 yearly" breakdown.
- "Get Pro" CTA — signed-out → `/auth/signup?next=/pricing`; signed-in → `POST /billing/checkout`.
- FAQ block reusing the existing FAQ translations where they overlap (refunds, privacy, cancellation, data retention).

### Upgrade CTAs (wired after entitlements land)

| Moment | Surface | Copy intent |
|---|---|---|
| Free user hits daily-quota | Modal | "Unlimited runs with Pro — $5/mo annual" |
| Free user opens "Save preset" | Inline locked card | "Presets are a Pro feature" |
| History page header (Free only) | Dismissible banner | "Keep history 30 days with Pro" |
| Anonymous user hits anon limit | Existing signup modal (Phase 2) | "Sign up free, then see Pro" — unchanged flow, new secondary CTA |

### `/my-account`

New **Plan** section at the top:
- Free: "Free plan · [Upgrade to Pro]" with plan benefits summary.
- Pro: "Pro · $6/mo, renews Apr 17, 2027 · [Manage billing]".

### `/my-account/billing` (new)

- Current plan row (name, price, next renewal).
- "Manage billing" primary button → `POST /billing/portal` → redirect.
- Billing history summary delegated entirely to Stripe Portal; we do not reimplement invoice lists.

### Pro badge

Small badge next to the avatar in the header for `is_pro(user)`. Tooltip: "Pro member since {date}". No link — it is pure social proof.

### `/refund-policy` (new, required before live flip)

Standalone legal page. Simple policy: **no pro-rated refunds; within 7 days of the first charge we issue goodwill refunds on request via `billing@`; subscriptions cancel at period end by default; no refunds on renewal charges**. Linked from `/pricing`, `/terms`, and the Checkout success page.

### Updates to existing pages

- **`/terms`** — add Billing & Subscriptions section: auto-renewal, cancellation, price-change notice, refunds, payment processor (Stripe), governing law. Bump `LAST_UPDATED`.
- **`/privacy`** — list Stripe as a sub-processor, describe categories shared (email, country, card via Stripe only, not stored by us). Bump `LAST_UPDATED`.
- **`/faq`** — add entries: "How do I cancel?", "Do you offer refunds?", "What payment methods?", "Do you support VAT invoices?" — Stripe Portal answers the last three operationally.

## Prerequisites — what must be true before the live-key flip

Grouped by severity. Every hard blocker is an explicit pre-launch task in the implementation plan.

### Hard blockers (cannot legally or safely accept money without these)

1. **Registered business entity** in the operating jurisdiction (LLC or equivalent). Personal Stripe accounts for recurring revenue are a lifecycle risk.
2. **Business bank account** connected to Stripe payouts.
3. **Stripe account fully activated**: identity verification, business profile, statement descriptor set to `XLSXWORLD`, support phone/email on file.
4. **Refund & cancellation policy** published at `/refund-policy`, linked from Terms and Checkout.
5. **Terms of Service updated** with: subscription terms, auto-renewal disclosure, cancellation mechanics, refund policy link, price-change notice (≥30 days), sub-processor disclosure, dispute/chargeback clause, governing law.
6. **Privacy Policy updated** listing Stripe as sub-processor with the data categories shared.
7. **US home-state sales-tax registration** (if applicable for the operating state) **and Stripe Tax configured for it**.
8. **Billing inbox** (`billing@xlsxworld.com`) live, monitored, and linked from `/refund-policy` and the Customer Portal configuration.

### Soft blockers (should not launch without, but not strictly legal requirements)

9. **Webhook monitoring + alerting**: any failed webhook delivery (4xx/5xx from our endpoint) or any webhook pending >1 hour pages on-call.
10. **Nightly reconciliation cron** running in production against the test-mode Stripe account for at least 48 hours of clean runs before flipping live keys.
11. **Stripe CLI** set up for local webhook replay; all developers can run `stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe`.
12. **End-to-end Playwright suite** against Stripe test mode covering: happy-path upgrade (monthly and annual), 3DS card, declined card, cancel via Portal, resume via Portal, past-due flow simulated by Stripe CLI.
13. **All pricing/billing strings** translated in `en` / `es` / `fr` / `pt`.
14. **Checkout success and cancel URLs** wired and deployed; never point to local or preview domains.

### Deferrable (safe to add after launch)

- EU VAT registration via OSS (monitor revenue by country; register when approaching the €10k B2C threshold).
- Multi-currency display on `/pricing`.
- Coupon / promo code engine.
- Annual-plan revenue recognition schedule in bookkeeping (defer-and-amortize). Cash accounting is fine until revenues require otherwise.
- Per-country VAT invoice customization beyond what Stripe provides by default.

## Anti-abuse & edge cases

| Scenario | Behavior |
|---|---|
| User cancels mid-cycle | Access through `pro_current_period_end`; `pro_cancel_at_period_end = true` shown in UI with resubscribe CTA. |
| Payment fails | Stripe smart-retries ~3 weeks. Local state is `past_due`. UI shows a persistent banner: "Your payment failed — update your card". `is_pro` still returns true. |
| Card updated via Portal | Next retry succeeds, webhook flips state back to `active`. |
| User switches monthly → annual | Stripe prorates automatically. Portal handles UI. |
| User deletes account | Must cancel active subscription first (Portal). Account deletion then hard-deletes user row, cascade-deletes presets, and triggers a background job that deletes the Stripe customer (only if no outstanding invoices). |
| Same email, multiple users | Prevented by existing unique-email constraint on users. Stripe customer uniqueness enforced by `(user_id) → stripe_customer_id` 1:1. |
| Chargeback / dispute | Stripe notifies via `charge.dispute.created` (not handled in v1 — manual in Stripe dashboard). v1.1 adds automatic entitlement freeze on dispute open. |
| Refund issued manually | Stripe emits `charge.refunded`; handler emits a `subscription_history` audit row but does not change `pro_status` (refund does not cancel by default). |
| User in embargoed / sanctioned country | Stripe rejects at Checkout; no local handling needed. |

## Security & compliance

- **PCI DSS**: SAQ A. No card data touches our servers. Quarterly ASV scans are not required for SAQ A.
- **SCA / 3DS**: handled entirely by Stripe Checkout.
- **Webhook signature verification**: `Stripe-Signature` header verified against the webhook secret on every request. Unverified requests 400.
- **Webhook secret** rotated on first production deploy and stored in the server's secrets manager. Never in the repo.
- **GDPR right-to-be-forgotten**: user deletion flow includes Stripe customer deletion (when no outstanding subscription exists). Subscription-history rows are retained for 7 years for tax/legal compliance; this is disclosed in the Privacy Policy.
- **Data minimization at Checkout**: do not collect billing address unless Stripe Tax requires it. Do not collect phone. Do not pre-fill name from our DB unless the user has set one.

## Observability

| Metric | Source | Alert |
|---|---|---|
| Webhook delivery failures | Stripe dashboard + our logs | Any failure |
| Webhook processing latency p95 | App logs | >5s |
| Checkout-started → Checkout-completed conversion | Stripe dashboard | Weekly review |
| Free → Pro conversion rate | Our `subscription_history` + `users.pro_status` | Weekly review |
| Involuntary churn (payment_failed → canceled) | `subscription_history` | Monthly review |
| Reconciliation drift count | Reconciliation cron logs | Any non-zero |

No dashboards are built for v1. Metrics live in logs and the Stripe dashboard; dashboarding is a Pro v2 concern.

## Testing strategy

- **Server unit**: webhook signature verification, event idempotency, each event handler transitions state correctly, `is_pro` resolver exhaustive cases, presets CRUD.
- **Server integration**: full webhook flow via Stripe CLI against a test-mode account; reconciliation cron against known drift.
- **Client unit (Jest + RTL)**: `/pricing` toggle, FAQ expand, entitlement-gated component renders.
- **E2E (Playwright)**: the scenarios listed under prerequisite #12.

All tests run against Stripe **test mode**. Live keys are used only after the pre-launch checklist is fully green.

## Phased rollout of Phase 3 itself

The implementation plan will break these into tasks.

- **3a — Infrastructure.** DB migrations, `stripe_events`, `subscription_history`, `tool_presets`, webhook handler, entitlement resolver, `/me/entitlements`. No user-visible changes.
- **3b — Feature gating.** Wire `is_pro` into Phase 2 limits, retention, presets CRUD, priority queue flag. Pro features work for users whose `pro_status` is manually set in the DB (dogfooding).
- **3c — Pro surfaces.** `/pricing`, `/my-account/billing`, upgrade CTAs, Pro badge, `/refund-policy`.
- **3d — Pre-launch QA & legal.** Checklist items from Prerequisites. Includes ToS / Privacy / Refund page updates, state tax registration, reconciliation dry-run, Playwright e2e green, i18n green.
- **3e — Launch.** Feature flag `BILLING_ENABLED=true`. Dark-launch to the owner account first (real charge, immediate refund). Then public.

## Reversibility

- **Merchant-of-Record swap**: if Stripe-direct tax compliance becomes too heavy, swap Checkout + Portal for Paddle or Lemon Squeezy without changing the entitlement resolver or the webhook handler's *shape* (only the event vocabulary changes). The `stripe_customer_id` and `stripe_events` tables become `billing_customer_id` / `billing_events`; the `users.pro_status` state machine is provider-agnostic. Cost: one full migration, ~1 week of engineering.
- **Price changes**: existing subscribers grandfathered by Stripe subscription's `price_id`. New customers get the new `price_id`. ToS gives us the ≥30-day notice clause.
- **Pull Pro**: `BILLING_ENABLED=false` hides `/pricing`, `/my-account/billing`, and upgrade CTAs. Existing subscriptions continue through Stripe until they self-cancel; `is_pro` keeps returning true; no customer loses access.

## Open questions (non-blocking)

1. **Exact US operating state** — determines initial sales-tax registration. Assumed to be the state of the registered LLC; confirm at prereq step.
2. **Monthly vs annual default selection on `/pricing`** — design assumes annual is the highlighted default. A/B test this within 60 days of launch.
3. **"Early adopter" price lock** — whether the first N annual subscribers get a rate-lock badge in `subscription_history` for future price-change carve-outs. Recommendation: store `signup_price_id` on `subscription_history` at creation; makes future grandfathering trivial without committing to it in the ToS.
4. **Automatic dispute handling** — deferred to Pro v1.1.

## Next step

Invoke the `writing-plans` skill to produce `docs/plans/2026-04-17-phase-3-pricing-and-billing.md` covering sub-phases 3a–3e.
