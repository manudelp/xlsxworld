# Account Tiers — Design Spec

**Date:** 2026-04-16
**Status:** Approved (high-level direction); detailed implementation plan pending
**Owner:** @manudelp

## Context

xlsxworld today markets itself as "no signup required" and the tagline is true: all 32 tools work fully anonymously. The only authenticated surface is `/my-account`, which lets a user set a display name. There is currently zero functional reason for a visitor to create an account.

This spec defines the strategic direction for changing that — turning accounts into a meaningful tier of the product, with a paid Pro tier on top — and locks in the first phase of work to ship.

## Strategic direction

**Model: B — "Free with Pro."** Anonymous use stays as the default and remains genuinely useful. Accounts unlock real, visible benefits without paywalling existing functionality. A paid Pro tier sits on top and is where monetization happens.

```
Anonymous (no account)   →   Free account   →   Pro ($)
   quick one-off jobs        saved work +        power users,
                             higher limits       devs, teams
```

**Marquee Free benefit (the "why sign up" hook):** History & re-download + Higher limits.
This anchors the signup CTA, the comparison table, and the upgrade modals shown to anonymous users when they hit a limit.

## Tier ladder (target end-state)

Numeric values are placeholders to be tuned during phase 1.

|  | Anonymous | Free (account) | Pro (paid) |
|---|---|---|---|
| **File size cap** | 10 MB | 50 MB | 250 MB |
| **Daily jobs** | 20 / day / IP | 200 / day | Unlimited (fair-use) |
| **Result retention** | 1 hour, one-shot link | 7 days, re-download any time | 30 days |
| **History dashboard** | — | last 7 days of jobs with re-download | last 30 days + search/filter |
| **Saved presets** | — | — | name & reuse any tool config |
| **Pipelines** (chain tools) | — | — | e.g. trim → dedup → freeze header |
| **Batch processing** | — | — | drop N files, get a zip |
| **API access** | — | — | personal API key |
| **Priority processing** | — | — | skip the anon queue during load |
| **Ads / upsell nudges** | shown | none | none |
| **Email support** | — | community | 48-hour SLA |

## Design constraints & decisions

These apply across all phases.

### History semantics

- **History = re-download, not "your file lives forever."** Output files are stored with retention-bound expiry; after expiry the history row remains but the file is gone (greyed-out "expired" badge).
- **Inputs are NOT retained by default.** This is a privacy and cost decision. History stores: which tool was used, the config, the output file (until expiry), timestamps, success/failure, error type if any.
- **"Re-run with different settings"** is a Pro feature that requires retaining inputs. It will be opt-in per-job (a checkbox at upload time).

### Storage

- Output files go in **Supabase Storage** (we already use Supabase for auth).
- Re-download links are **signed URLs** with explicit expiry matching the tier's retention.
- A DB row per job in a new `tool_jobs` table holds the metadata. The row outlives the file.
- **Supabase Free tier caps individual object size at 50 MB.** This is above our current 20 MB input limit, so it's not a Phase 1 concern. Pro's target 250 MB output cap will require upgrading the Supabase plan before Phase 3 launch.

### Limits

- Anonymous limits are **IP-based** (best-effort; we accept the abuse model is imperfect).
- When an anonymous user hits a limit, we show a **"Sign up free, keep your work, raise the limit"** modal. This is the primary conversion moment for the Free tier.
- Free-account limits are **per-user**, enforced at the API layer.
- Limit enforcement reuses the per-user job rows that history already produces — i.e. once history is built, limits are nearly free to add.

### Privacy

- Excel files commonly contain sensitive data. Default behavior is conservative: short retention, no input retention, signed URLs only.
- Free and Pro accounts get a **"delete this job"** action in the history view that hard-deletes the file immediately.
- A **"delete all my data"** account-level action is a phase-2 requirement (not blocking phase 1, but must ship before Pro launches for GDPR sanity).

### Payment infrastructure

- **Stripe integration is out of scope until phase 3.** Pro is a future tier; we deliberately ship Free first to test the conversion funnel before building billing.
- Pricing decisions, currency support, and tax handling are not part of this spec.

### Existing functionality is not paywalled

- No tool that currently works anonymously stops working anonymously.
- The only "regression" for anon users is the introduction of explicit limits (file size + daily quota). These are framed as the upgrade hook, not as something taken away.

## Phased rollout

We're shipping in the order **D**: history → limits → Pro. Each phase is its own milestone with its own design doc + plan.

### Phase 1 — History (this is what we plan next)

- New `tool_jobs` table — `user_id` is nullable so anon jobs can be recorded for analytics if we choose to (see open question 5).
- Authenticated tool runs write a job row + push the output to Supabase Storage with a 7-day signed URL.
- New page `/my-account/history`: list, re-download, hard-delete.
- Anonymous tool runs: behavior unchanged from today — direct streamed download, no Storage write, no history list. (See open question 5 for the alternative.)
- Free account: 7-day retention, history list visible, re-download works for the lifetime of the signed URL.
- No new limits in this phase — anon users still get full access.

**Why first:** Pure value-add. No "this used to be free" blowback. Lets us measure sign-up conversion driven by a benefit before we add any restriction.

### Phase 2 — Limits

- Enforce file-size and daily-quota tiers per the table above.
- Show "Sign up to raise the limit" modal on anonymous limit hits.
- Show quota usage on `/my-account` (and on the global header for signed-in users when they're > 80% used).
- Tune the placeholder numbers based on what real usage looks like after phase 1.

**Why second:** Now we have real per-user job data and history is in place, so the upgrade modal points at a feature the user can actually see ("Sign up to keep your work *and* raise this limit").

### Phase 3 — Pro

- Stripe billing.
- Pro-only features in priority order: presets → API access → pipelines → batch → priority queue.
- Account-level "delete all my data" must ship at or before Pro launch.

**Why last:** Until we have measured Free-tier conversion and engagement, we don't know what to charge for or how to position Pro. Phase 1 + 2 give us that data.

## Out of scope (explicitly)

- Team / organization accounts. Solo accounts only for now.
- SSO / OAuth providers (we have Supabase email/password — that's enough).
- Drive / Dropbox / S3 integrations. Future Pro consideration; not on the roadmap yet.
- Mobile app.
- Self-hosted / enterprise license.
- Replacing the existing admin role/dashboard (that stays untouched).

## Open questions

These do not block phase 1 design but should be answered before phase 2 closes.

1. **Anonymous quota enforcement** — IP-based caps are bypassable. Are we OK with best-effort, or do we want device fingerprinting / Turnstile? Recommendation: best-effort + Cloudflare Turnstile only if we see real abuse.
2. **Soft-delete vs hard-delete on history rows after retention.** Recommendation: hard-delete the file, keep the row for 90 days for analytics, then prune.
3. **Internationalization scope for new surfaces** — confirm: every new string lands in en/es/fr/pt at PR time (consistent with current convention).
4. **Final tier numbers.** The table values are starting points and will be revised after phase 1 ships and we have real usage data.
5. **Anonymous outputs in Supabase Storage?** Phase 1 default is *no* (anon stays direct-stream as today, only authenticated runs hit Storage). Pushing anon outputs to Storage with a 1-hour signed URL would give a consistent download flow and would let us show "this would have been kept for 7 days if you had an account" as a stronger conversion nudge — at the cost of doubling Storage write volume and bandwidth. Decision deferred until we see phase 1 cost numbers.

## Next step

Invoke the writing-plans skill to produce a detailed implementation plan for **Phase 1 — History**.
