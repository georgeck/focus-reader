import type {
  DocumentPdfMeta,
  CreatePdfMetaInput,
} from "@focus-reader/shared";

export async function createPdfMeta(
  db: D1Database,
  input: CreatePdfMetaInput
): Promise<DocumentPdfMeta> {
  const stmt = db.prepare(`
    INSERT INTO document_pdf_meta (
      document_id, page_count, file_size_bytes, storage_key
    ) VALUES (?1, ?2, ?3, ?4)
  `);
  await stmt
    .bind(
      input.document_id,
      input.page_count,
      input.file_size_bytes,
      input.storage_key
    )
    .run();

  return (await db
    .prepare("SELECT * FROM document_pdf_meta WHERE document_id = ?1")
    .bind(input.document_id)
    .first<DocumentPdfMeta>())!;
}

export async function getPdfMeta(
  db: D1Database,
  documentId: string
): Promise<DocumentPdfMeta | null> {
  const result = await db
    .prepare("SELECT * FROM document_pdf_meta WHERE document_id = ?1")
    .bind(documentId)
    .first<DocumentPdfMeta>();
  return result ?? null;
}
