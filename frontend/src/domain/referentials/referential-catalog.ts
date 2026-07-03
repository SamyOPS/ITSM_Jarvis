export type ReferentialCategory = {
  id: string;
  name: string;
  parentId: string | null;
};

export type ReferentialChannel = {
  id: string;
  name: string;
};

export type ReferentialCi = {
  id: string;
  name: string;
  ciTypeId: string;
  status: string;
  assignedUserId: string | null;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  operatingSystem: string | null;
  location: string | null;
  purchaseDate: string | null;
  warrantyEndDate: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  cpuName: string | null;
  diskSpaceGb: number | null;
  ramMb: number | null;
  keyboardLayout: string | null;
  osVersion: string | null;
  price: number | null;
  comment: string | null;
  archivedAt: string | null;
  createdAt: string | null;
};

export type ReferentialCiType = {
  id: string;
  name: string;
};

export type ReferentialGroup = {
  createdAt?: string | null;
  id: string;
  name: string;
  description: string | null;
  level: string | null;
  updatedAt?: string | null;
};

export type ReferentialPriority = {
  id: string;
  name: string;
  level: number;
  responseHours: number | null;
  resolutionHours: number | null;
};

export interface ReferentialCatalogSnapshot {
  categories: ReferentialCategory[];
  channels: ReferentialChannel[];
  cis: ReferentialCi[];
  ciTypes: ReferentialCiType[];
  groups: ReferentialGroup[];
  priorities: ReferentialPriority[];
}
