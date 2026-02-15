CREATE INDEX IF NOT EXISTS idx_highlight_document_id ON highlight(document_id);
CREATE INDEX IF NOT EXISTS idx_highlight_created_at ON highlight(created_at);
CREATE INDEX IF NOT EXISTS idx_collection_documents_sort ON collection_documents(collection_id, sort_order);
