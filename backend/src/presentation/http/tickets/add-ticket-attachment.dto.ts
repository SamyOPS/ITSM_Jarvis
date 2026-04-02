export type AddTicketAttachmentDto = {
  bucketId: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes: number;
  storagePath: string;
};
