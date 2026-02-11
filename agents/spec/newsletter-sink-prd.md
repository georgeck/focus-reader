# Product Requirements Document: Focus Reader

**Version:** 1.0
**Date:** February 11, 2026
**Status:** Draft

---

## 1. Overview

### 1.1 Problem Statement

Email newsletters are a valuable source of curated information, but subscribing to them clutters the inbox and mixes long-form reading content with actionable correspondence. There is no clean separation between "things to read" and "things to act on" in a typical email workflow.

### 1.2 Product Vision

**Focus Reader** is a self-hosted system that provides a dedicated ingestion pipeline for email newsletters using pseudo email addresses, converts them into clean readable formats (HTML and Markdown), and presents them in an RSS-reader-like interface with support for tagging, categorization, and search.

### 1.3 Goals

- Eliminate newsletter clutter from the user's primary inbox.
- Provide a dedicated, distraction-free reading experience for newsletters.
- Allow the user to generate unlimited pseudo email addresses for subscriptions.
- Support an existing tagging/categorization system for organizing content.
- Optionally expose ingested newsletters as RSS/Atom feeds for interoperability with other readers.

### 1.4 Non-Goals

- This is not a general-purpose email client.
- This is not a collaborative or multi-tenant SaaS product (v1 targets single-user, self-hosted use).
- This does not handle transactional or marketing email beyond newsletters.
- This does not provide email sending capabilities.

---

## 2. Target User

A single power user (the system operator) who subscribes to many email newsletters, values organized reading workflows, and is comfortable self-hosting a lightweight application.

---

## 3. Architecture

### 3.1 High-Level Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Newsletter     │     │   Ingestion      │     │   Storage        │
│   Provider       │────▶│   Pipeline       │────▶│   Layer          │
│   (sends email)  │     │   (Email Worker) │     │   (Database)     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                           │
                                                           ▼
                                                   ┌──────────────────┐
                                                   │   Reader UI      │
                                                   │   (Web App)      │
                                                   └──────────────────┘
                                                           │
                                                           ▼
                                                   ┌──────────────────┐
                                                   │   RSS/Atom Feed  │
                                                   │   (Optional)     │
                                                   └──────────────────┘
```

### 3.2 Recommended Stack

| Layer             | Technology                                            | Rationale                                                                           |
|-------------------|-------------------------------------------------------|-------------------------------------------------------------------------------------|
| Email Ingestion   | Cloudflare Email Workers                              | Zero server management, programmable hooks on inbound email, free at personal scale |
| Database          | Cloudflare D1 (SQLite)                                | D1 for all-Cloudflare stack                                                         |
| Web UI            | Cloudflare Pages or self-hosted (Next.js / SvelteKit) | Static-first with API routes; low cost                                              |
| Email Parsing     | `postal-mime` / `mailparser`                          | MIME parsing and HTML body extraction                                               |
| HTML → Markdown   | Turndown / `html-to-markdown`                         | Well-maintained conversion libraries                                                |
| HTML Sanitization | DOMPurify / `sanitize-html`                           | Remove unsafe/tracking elements from newsletter HTML                                |

### 3.3 Email Addressing Strategy

Use a **catch-all configuration on a dedicated subdomain** (e.g., `*@read.yourdomain.com`).

- Each newsletter subscription gets a unique address: `techweekly@read.yourdomain.com`, `morning-brew@read.yourdomain.com`.
- The local part (before `@`) implicitly identifies the subscription.
- No pre-configuration needed — any new address auto-creates a subscription on first email received.
- Optionally support `+` subaddressing for additional metadata: `tech+ai@read.yourdomain.com`.

---

## 4. Data Model

### 4.1 Core Entities

#### Subscription

| Field            | Type            | Description                                                          |
|------------------|-----------------|----------------------------------------------------------------------|
| `id`             | UUID            | Primary key                                                          |
| `pseudo_email`   | string (unique) | The generated email address (e.g., `techweekly@read.yourdomain.com`) |
| `display_name`   | string          | Human-readable name for the subscription                             |
| `sender_address` | string          | The `From` address of the newsletter                                 |
| `sender_name`    | string          | The `From` display name                                              |
| `tags`           | string[]        | User-assigned tags/categories                                        |
| `is_active`      | boolean         | Whether this subscription is currently active                        |
| `auto_tag_rules` | JSON            | Optional rules for auto-tagging incoming issues                      |
| `created_at`     | timestamp       | When the subscription was first seen                                 |
| `updated_at`     | timestamp       | Last update time                                                     |

#### Issue (Individual Newsletter)

| Field                | Type      | Description                                       |
|----------------------|-----------|---------------------------------------------------|
| `id`                 | UUID      | Primary key                                       |
| `subscription_id`    | UUID (FK) | Link to parent subscription                       |
| `subject`            | string    | Email subject line                                |
| `from_address`       | string    | Sender email                                      |
| `from_name`          | string    | Sender display name                               |
| `received_at`        | timestamp | When the email was received                       |
| `html_content`       | text      | Sanitized HTML body                               |
| `markdown_content`   | text      | Converted Markdown body                           |
| `plain_text_content` | text      | Plain text fallback                               |
| `raw_headers`        | JSON      | Original email headers (for debugging)            |
| `tags`               | string[]  | Tags (inherited from subscription + auto-applied) |
| `is_read`            | boolean   | Read status                                       |
| `is_starred`         | boolean   | Starred/bookmarked status                         |
| `summary`            | text      | Optional LLM-generated summary                    |

#### Tag

| Field         | Type            | Description          |
|---------------|-----------------|----------------------|
| `id`          | UUID            | Primary key          |
| `name`        | string (unique) | Tag name             |
| `color`       | string          | Display color (hex)  |
| `description` | string          | Optional description |
| `created_at`  | timestamp       | Creation time        |

---

## 5. Feature Specifications

### 5.1 Email Ingestion Pipeline

**Priority:** P0 (Critical)

**Description:** Receive inbound emails at pseudo addresses, parse them, and store them as issues.

**Functional Requirements:**

- Accept inbound email on any address at the configured subdomain (catch-all).
- Parse MIME content to extract: subject, sender, date, HTML body, plain text body, and headers.
- Sanitize HTML body: remove tracking pixels, external scripts, and unsafe elements. Preserve layout and images.
- Convert sanitized HTML to Markdown.
- If no matching subscription exists for the recipient address, auto-create one using the local part as the display name and the sender info from the email.
- Store the parsed issue in the database linked to the subscription.
- Reject or discard emails that fail basic validation (empty body, known spam patterns).

**Edge Cases:**

- Confirmation emails from newsletter platforms that require a click-to-verify: detect these and surface them in the UI for manual action.
- Multipart emails with both HTML and plain text: prefer HTML, store both.
- Emails with attachments: store attachment metadata, optionally store attachments in object storage.
- Duplicate emails (retries from sender): deduplicate by `Message-ID` header.

### 5.2 Subscription Management

**Priority:** P0 (Critical)

**Description:** Allow the user to view, edit, organize, and manage their newsletter subscriptions.

**Functional Requirements:**

- List all subscriptions with: display name, pseudo email, sender, tag(s), last received date, unread count.
- Create a new subscription manually (generate a pseudo email address).
- Edit subscription: rename, assign/remove tags, toggle active/inactive.
- Delete a subscription and optionally all associated issues.
- Copy pseudo email address to clipboard (for pasting into newsletter signup forms).
- Show subscription stats: total issues received, frequency, last received.

### 5.3 Reader Interface

**Priority:** P0 (Critical)

**Description:** An RSS-reader-style web interface for browsing and reading newsletters.

**Functional Requirements:**

- **Left sidebar:** List of subscriptions, grouped by tags/folders. Show unread counts. Include an "All" view and a "Starred" view.
- **Feed view (center pane):** Chronological list of issues for the selected subscription, tag, or "All". Show subject, sender, date, preview snippet, read/unread status.
- **Reading pane (right or expanded):** Render the sanitized HTML content of the selected issue. Toggle between HTML and Markdown views.
- Mark issues as read/unread.
- Star/bookmark issues.
- Keyboard navigation: `j`/`k` for next/previous issue, `s` to star, `m` to toggle read.
- Pagination or infinite scroll for the feed view.
- Responsive design: usable on desktop and mobile.
- Focus mode: Reading view that makes the content from the reading pane full-width and hides distractions.

### 5.4 Tagging System

**Priority:** P1 (High)

**Description:** Flexible tagging for organizing subscriptions and individual issues.

**Functional Requirements:**

- Create, edit, delete tags with name and color.
- Assign multiple tags to a subscription (all future issues inherit these tags).
- Assign additional tags to individual issues.
- Filter the feed view by one or more tags.
- Auto-tagging rules: define rules per subscription or globally based on sender domain, subject keywords, or content keywords.
- Optional: LLM-based auto-tagging — on ingestion, classify the issue against the existing tag taxonomy and suggest/apply tags.

### 5.5 Search

**Priority:** P1 (High)

**Description:** Full-text search across all stored newsletters.

**Functional Requirements:**

- Search by: subject, sender, body content, tags.
- Filter results by: subscription, tag, date range, read/unread status.
- Return results ranked by relevance with highlighted snippets.
- Implementation: SQLite FTS5 (if using D1/SQLite) or Postgres full-text search.

### 5.6 Summarization (Optional / Future)

**Priority:** P3 (Low)

**Description:** LLM-generated summaries of newsletter issues for quick scanning.

**Functional Requirements:**

- On ingestion (or on demand), generate a 2–3 sentence summary of each issue.
- Display summaries in the feed view as an alternative to content previews.
- Generate daily/weekly digest summaries across all or tagged subscriptions.

### 5.7 RSS/Atom Feed Output

**Priority:** P4 (low)

**Description:** Expose ingested newsletters as standard RSS/Atom feeds for consumption in external readers.

**Functional Requirements:**

- Generate an Atom feed per subscription (`/feeds/{subscription-id}/atom.xml`).
- Generate an Atom feed per tag (`/feeds/tags/{tag-name}/atom.xml`).
- Generate a combined "all" feed (`/feeds/all/atom.xml`).
- Feeds are protected by a per-user secret token in the URL.
- Feed items include: title (subject), content (sanitized HTML), author (sender), published date.

---

## 6. Phased Rollout

### Phase 0 — Proof of Concept

**Goal:** Validate that the email ingestion pipeline works end to end.

**Deliverables:**

- Cloudflare Email Worker configured with catch-all on subdomain.
- Worker parses inbound email and writes to D1.
- No UI — verify via database inspection or API call.
- Subscribe to 2–3 real newsletters and confirm receipt and parsing.

**Success Criteria:** Emails from at least 3 different newsletter platforms are successfully received, parsed, and stored with clean HTML extraction.

### Phase 1 — Minimal Viable Reader

**Goal:** A functional reader for browsing stored newsletters.

**Deliverables:**

- Web UI with sidebar (subscriptions list), feed view, and reading pane.
- Subscription management: view, rename, copy email address.
- Basic tagging: create tags, assign to subscriptions.
- Mark read/unread, star issues.
- Mobile-responsive UI.

**Success Criteria:** User can subscribe to newsletters using generated addresses and read them entirely through the Focus Reader UI, with no need to check email.

### Phase 2 — Polish & Power Features

**Goal:** A refined daily-driver reading experience.

**Deliverables:**

- Full-text search.
- Keyboard navigation.
- Auto-tagging rules.
- Confirmation email detection and handling.

**Success Criteria:** User has fully migrated all newsletter subscriptions away from their inbox to Focus Reader.

### Phase 3 — Intelligence Layer

**Goal:** AI-assisted organization and summarization.

**Deliverables:**

- RSS/Atom feed output.
- LLM-based auto-tagging on ingestion.
- Per-issue summaries.
- Daily/weekly digest generation.

**Success Criteria:** User spends less time triaging and more time reading high-value content.

---

## 7. Technical Considerations

### 7.1 Deliverability & Reliability

- Some newsletter platforms verify recipient addresses by sending a confirmation email with a click-to-verify link. The system must surface these in the UI so the user can open and confirm manually.
- Some senders check MX records and may reject delivery to custom domains without proper DNS configuration. Ensure MX, SPF, DKIM, and DMARC records are correctly set.
- Implement idempotent processing: deduplicate by `Message-ID` header to handle sender retries.

### 7.2 Email HTML Challenges

- Newsletter HTML uses heavy inline styles, table-based layouts, and tracking pixels.
- Sanitization must strip tracking pixels (`<img>` tags with 1x1 dimensions or known tracker domains) and external scripts while preserving layout and legitimate images.
- Markdown conversion will be lossy for complex layouts — this is acceptable; the HTML view is primary, Markdown is a convenience.

### 7.3 Storage & Costs

- At personal scale (50 newsletters × 4 issues/month = 200 issues/month), storage is trivial.
- Each issue is roughly 50–200 KB of HTML. Annual storage: ~50 MB. Well within free tiers.
- Cloudflare D1 free tier: 5 GB. More than sufficient.
- If storing images locally (rather than hotlinking), storage grows significantly — consider keeping external image references with a proxy/cache.

### 7.4 Security

- The reader UI must be behind authentication (even if single-user). Options: Cloudflare Access, basic auth, or a simple session-based login.
- RSS feed URLs must include an unguessable token to prevent unauthorized access.
- Email ingestion should rate-limit and validate inbound messages to prevent abuse of the catch-all address.

---

## 8. Prior Art & References

| Project                                              | Relevance                                     | Notes                                                                         |
|------------------------------------------------------|-----------------------------------------------|-------------------------------------------------------------------------------|
| [Omnivore](https://github.com/omnivore-app/omnivore) | Full read-later app with newsletter ingestion | Acquired by ElevenLabs. Open source codebase may be available for reference.  |
| [Feedbin](https://feedbin.com)                       | RSS reader with newsletter email addresses    | Polished commercial product. Closest existing implementation of this concept. |
| [Readwise Reader](https://readwise.io/read)          | Reader with newsletter + RSS + read-later     | Commercial. Strong UX reference for the reader interface.                     |

---

## 9. Open Questions

1. **Image handling:** Should newsletter images be proxied/cached locally, or hotlinked from original sources? Hotlinking is simpler but breaks if the source removes images and leaks IP/reading activity to the sender.
   Answer: Start with hotlinking for simplicity. Consider local cache layer in Phase 2.
2. **Multi-device sync:** Is read/unread state syncing across devices a requirement for v1, or can it be deferred?
    Answer: The read/unread state is stored in the database and exposed via the UI, so it will be consistent across devices.
3. **Unsubscribe handling:** Should the system parse `List-Unsubscribe` headers and provide a one-click unsubscribe action in the UI?
   Answer: Yes, this is a common feature in email clients and should be implemented in Phase 3.
4. **Retention policy:** Should old issues be auto-archived or deleted after a configurable period?
    Answer: Not required for now
5. **Import/export:** Should the system support OPML import (from existing RSS readers) or export of stored content?
    Answer: Not required for v1, but we can revisit this when we implement RSS subscription features.

---

## 10. Success Metrics

- **Adoption:** 100% of newsletter subscriptions migrated to Focus Reader within 30 days of Phase 1 launch.
- **Reliability:** ≥99% of inbound newsletters successfully received and parsed (measured over 30 days).
- **Engagement:** User opens the reader UI at least 4× per week.
- **Inbox reduction:** Zero newsletter emails in the user's primary inbox.
