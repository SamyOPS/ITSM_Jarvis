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
};

export type ReferentialCiType = {
  id: string;
  name: string;
};

export type ReferentialGroup = {
  id: string;
  name: string;
  description: string | null;
  level: string | null;
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
