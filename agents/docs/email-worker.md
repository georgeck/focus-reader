# Email Worker Pipeline

The email worker (`apps/email-worker/src/index.ts`) implements a 17-step pipeline:

1. Parse MIME (postal-mime)
2. Extract recipient / subscription key
3. Deduplicate (Message-ID, then SHA-256 fingerprint)
4. Validate (empty body, sender denylist)
5. Detect confirmation emails
6. Pre-generate document UUID (for CID image R2 paths)
7. Sanitize HTML (linkedom)
8. Upload CID images to R2
9. Rewrite CID URLs to proxy paths
10. Convert to Markdown (turndown)
11. Compute word count / reading time
12. Look up or auto-create subscription
13. Create Document in D1
14. Create EmailMeta (dedup keys, rejection/confirmation flags)
15. Create Attachment records
16. Inherit subscription tags
17. Log ingestion event

The outer handler wraps the pipeline in `withRetry(3, fn)` with exponential backoff. The raw stream is read once before the retry loop.

## Pitfalls

- **postal-mime content type:** `content` field on attachments is `string | ArrayBuffer`, not just `ArrayBuffer`. Handle both.
- **ContentID angle brackets:** postal-mime returns `contentId` with angle brackets (`<img001>`). Always strip with `.replace(/^<|>$/g, "")`.
- **ReadableStream consumption:** Streams can only be read once. Read `message.raw` into an ArrayBuffer before the retry loop.
