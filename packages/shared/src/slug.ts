export function slugToDisplayName(slug: string): string {
  return slug
    .split(/[-_+]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function emailToSubscriptionKey(
  email: string,
  collapsePlus: boolean
): string {
  const localPart = email.split("@")[0].toLowerCase();
  if (collapsePlus && localPart.includes("+")) {
    return localPart.split("+")[0];
  }
  return localPart;
}
