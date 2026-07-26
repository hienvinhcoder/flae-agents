import { z } from "zod";

export const documentStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);
export const documentTypeSchema = z.enum([
  "pdf",
  "markdown",
  "text",
  "manual_input",
]);

export const knowledgeDocumentSchema = z.object({
  chunk_count: z.number().int().nullable(),
  created_at: z.string().min(1),
  description: z.string().nullable(),
  document_type: documentTypeSchema,
  entity_count: z.number().int().nullable(),
  file_name: z.string().nullable(),
  file_size: z.number().int().nullable(),
  id: z.uuid(),
  relation_count: z.number().int().nullable(),
  status: documentStatusSchema,
  title: z.string().min(1),
  updated_at: z.string().min(1),
  uploaded_by: z.string().min(1),
});

export const knowledgeDocumentDetailSchema = knowledgeDocumentSchema.extend({
  content_text: z.string().nullable(),
  error_message: z.string().nullable(),
  gcs_path: z.string().nullable(),
  mime_type: z.string().nullable(),
  processing_time_seconds: z.number().nullable(),
  temporal_workflow_id: z.string().nullable(),
  token_usage: z.record(z.string(), z.number()).nullable(),
});

export const documentUploadResponseSchema = z.object({
  id: z.uuid(),
  status: documentStatusSchema,
  temporal_workflow_id: z.string().nullable(),
  title: z.string().min(1),
});

export const ingestionStatusSchema = z.object({
  chunk_count: z.number().int().nullable(),
  document_id: z.uuid(),
  entity_count: z.number().int().nullable(),
  error_message: z.string().nullable(),
  processing_time_seconds: z.number().nullable(),
  relation_count: z.number().int().nullable(),
  status: documentStatusSchema,
});

export type DocumentStatus = z.infer<typeof documentStatusSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type KnowledgeDocument = z.infer<typeof knowledgeDocumentSchema>;
export type KnowledgeDocumentDetail = z.infer<
  typeof knowledgeDocumentDetailSchema
>;
export type DocumentUploadResponse = z.infer<
  typeof documentUploadResponseSchema
>;
export type IngestionStatus = z.infer<typeof ingestionStatusSchema>;

export interface ManualDocumentPayload {
  content_text: string;
  description?: string;
  title: string;
}

export interface UploadDocumentPayload {
  description?: string;
  file: File;
  title: string;
}
