import type {
  DocumentType,
  DocumentLocation,
  OriginType,
  ChannelType,
  IngestionStatus,
} from "./types.js";

// Enum arrays
export const DOCUMENT_TYPES: DocumentType[] = [
  "article",
  "pdf",
  "email",
  "rss",
  "bookmark",
  "post",
];

export const DOCUMENT_LOCATIONS: DocumentLocation[] = [
  "inbox",
  "later",
  "archive",
];

export const ORIGIN_TYPES: OriginType[] = ["subscription", "feed", "manual"];

export const CHANNEL_TYPES: ChannelType[] = [
  "email",
  "rss",
  "api",
  "extension",
];

export const INGESTION_STATUSES: IngestionStatus[] = ["success", "failure"];

// Defaults
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_RETRY_ATTEMPTS = 3;

// Known email tracking pixel domains
export const TRACKER_DOMAINS = [
  "list-manage.com",
  "open.substack.com",
  "email.mg1.substack.com",
  "clicks.beehiiv.com",
  "track.mailerlite.com",
  "pixel.mailchimp.com",
  "mandrillapp.com",
  "sendgrid.net",
  "sparkpostmail.com",
  "mailgun.org",
  "ct.sendgrid.net",
  "links.buttondown.email",
  "convertkit-mail.com",
  "email-open-log.convertkit.com",
  "tr.sendinblue.com",
  "post.spmailtechnol.com",
];

// Subject line keywords for confirmation email detection
export const CONFIRMATION_KEYWORDS = [
  "confirm",
  "verify",
  "activate",
  "validate",
  "opt-in",
  "optin",
  "double opt-in",
  "subscription confirmation",
  "confirm your email",
  "verify your email",
  "confirm your subscription",
  "please confirm",
  "action required",
];
