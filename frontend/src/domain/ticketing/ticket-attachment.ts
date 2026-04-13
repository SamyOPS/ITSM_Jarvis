export type TicketAttachmentSnapshot = {
  bucketId: string;
  createdAt: string;
  fileName: string;
  id: string;
  mimeType: string | null;
  sizeBytes: number;
  storagePath: string;
  ticketId: string;
  uploadedByUserId: string;
};
