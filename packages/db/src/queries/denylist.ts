export async function isDomainDenied(
  db: D1Database,
  domain: string
): Promise<boolean> {
  const result = await db
    .prepare("SELECT 1 FROM denylist WHERE domain = ?1")
    .bind(domain.toLowerCase())
    .first();
  return result !== null;
}
