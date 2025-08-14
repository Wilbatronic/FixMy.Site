# FixMy.Site – TODO and Suggested Improvements

This is a living backlog of missing features, fixes, and suggested improvements discovered from reviewing the current codebase.

## Critical before production
- Add CAPTCHA to public forms if abuse appears.
- Credentials: one-time reveal flow and access audit logs.
- AI safety hardening: additional content filters and sensitive-data masking.

## Backend
- Expand input validation coverage and stricter schemas across all endpoints.
- Auth/session:
  - Add refresh tokens (HttpOnly, Secure cookies), short-lived access tokens, logout and rotation.
  - Add password reset; optionally switch email verification to signed tokens (currently code-based).
- Payments/subscriptions:
  - Gate features/UI by subscription tier.
- Credentials vault:
  - Last-access audit + expiring links.
- Discord bot robustness:
  - Gracefully handle missing/invalid env vars; reconnect logic; per-guild configuration.
  - Permission checks before creating channels; configurable category for tickets.
- Site health checks:
  - Consider `HEAD` with fallbacks; capture DNS/timeouts distinctly; store latency percentiles; alerting thresholds.
- Logging/observability:
  - Add request logging with correlation IDs; structured logs for API and jobs; health metrics endpoint; integrate with a log shipper.
- Rate limiting and security headers: Implemented global limiter + specific chat/contact limits; added `helmet`.
- Error handling:
  - Return structured error payloads; avoid leaking stack traces in production.

## Frontend
- Consistent module paths:
  - Standardize on `@/Components/...` imports; fix mixed relative and aliased paths.
- AI Chat UX:
  - Stream responses; preserve and send conversation history to backend; render markdown; copy buttons; error toasts.
- Contact form: Add optional CAPTCHA on public endpoint.
- Pricing/Checkout:
  - Show subscription status in dashboard; manage cancel/upgrade.
- Dashboard:
  - Service request detail view; status timeline; upload attachments; filter/sort.
- Accessibility & SEO:
  - Update `index.html` title/meta/OG tags; add `robots.txt` and `sitemap.xml`; ensure keyboard navigation and ARIA labels.

## DevOps
- Environment configuration: Add `.env.example`.
- Process management:
  - Add PM2 ecosystem config or systemd unit template.
- WebSockets in reverse proxy:
  - Ensure Nginx config includes upgrade headers for Socket.IO.
- Database:
  - Back up `backend/database.sqlite` routinely; consider migrations (e.g., `knex` or `drizzle`).
- CI/CD:
  - Add GitHub Actions for lint/build/test; deploy script with zero-downtime restarts.

## Documentation
- README additions:
  - Architecture overview, environment variables, local dev, and troubleshooting.
- SECURITY.md:
  - Responsible disclosure, data handling, secret storage policy.

## New feature suggestions
- AI and automation
  - AI triage for new service requests: summarize, extract entities (site, urgency), predict category/SLA, and suggest first response.
  - AI health assistant: automatically run targeted checks (headers, uptime, Lighthouse) when a user asks in chat and post results back into the thread.
  - RAG over Knowledge Base and past tickets to give cited answers with links and confidence score.
  - AI-generated remediation plans for detected issues, with one-click task creation and tracking.

- Site health and monitoring
  - Scheduled Lighthouse audits with trend charts for performance, SEO, accessibility, and best practices.
  - Core Web Vitals ingestion (CrUX/PSI API) and alerting on regressions.
  - Screenshot diff monitoring (homepage + key paths) to catch layout regressions.
  - DNS/DNSSEC/SPF/DMARC/CAA checks and TLS report (protocols, ciphers, OCSP).
  - Security headers scan (CSP, HSTS, X-Frame) with fix recipes.
  - Uptime/latency SLOs with alert policies and maintenance windows.

- Quotes and sales
  - Save/share quotes with short links and PDF export (logo + terms).
  - Quote templates per service type with pre-filled add-ons and regional pricing.
  - Taxes and localization: VAT/GST support, multi-currency display and rounding rules.
  - Convert quote to service request and optionally kick off onboarding tasks automatically.

- Billing and subscriptions
  - Trials, coupons/promo codes, and seat-based pricing (per user/organization).
  - Usage-based metering for automated checks (e.g., X health checks per month) with overage pricing.
  - Dunning emails and soft account downgrades on failed payments.
  - In-app invoice history and downloadable receipts.

- Accounts, teams, and security
  - Organization accounts with roles (Owner/Admin/Member) and shared vault/projects.
  - 2FA (TOTP/WebAuthn) and new-device verification, with session management UI.
  - Passwordless (magic link) optional login; OAuth (Google/Microsoft/GitHub) SSO.
  - Activity logs and login alerts via email/Discord.

- Credentials vault enhancements
  - One-time reveal with automatic redaction afterward and optional approval workflow.
  - Time-limited share links for external collaborators with granular scopes.
  - Rotation reminders and breach monitoring (HIBP) for detected credentials.
  - File secrets/attachments (e.g., certificates, SSH keys) with per-file access logs.
  - KMS-backed envelope encryption and Hardware-backed key support where available.
  - Import/export bridges (e.g., HashiCorp Vault, 1Password) for migration.

- Notifications and integrations
  - Unified notification center with per-channel preferences (Email, Discord, Slack, Teams, SMS, Web Push, ntfy).
  - Slack/Discord apps: create/view tickets, get health summaries, and approve vault access requests.
  - GitHub/GitLab integrations: open issues for findings, attach logs, optionally create fix PRs.
  - Cloud/CDN integrations (Cloudflare, Vercel, Netlify) to trigger redeploy or purge cache after fixes.

- Portal and UX
  - Customer onboarding checklist and guided product tour.
  - Self-serve domain/site management: add sites, verify ownership, schedule checks per site.
  - Dashboard charts for historical trends (latency, uptime, Lighthouse scores).
  - Export to CSV/JSON and embed small status widgets.

- Internationalization and accessibility
  - i18n for UI and emails; currency/number/date locale-aware formatting.
  - Accessibility scanner integration with prioritized fixes and keyboard navigation coverage reports.

- Admin and ops
  - Admin console: user search, impersonation with audit, feature flags, and system health.
  - Structured logs shipping with dashboards (OpenTelemetry → Grafana/Loki/ELK) and error tracking (Sentry).
  - Database migrations, seed scripts, and backup/restore tooling.

## Nice-to-have
- Dockerization with multi-stage build; `docker-compose` (app + Nginx).
- Feature flags for experimental features.
 

## Acceptance checks
- Linux build succeeds and app runs; imports are case-correct.
- Public pages behave per chosen auth strategy; rate limits in place.
- Credentials never leave the system in plaintext; retrieval is audited and time-limited.
- Stripe checkout can create, update, and cancel subscriptions; webhooks update `subscription_tier`.
- Nginx serves HTTPS with WebSocket upgrades; `/api/health` returns 200 via domain.


