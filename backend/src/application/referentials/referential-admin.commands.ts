import { type PriorityName } from '../../domain/ticketing/priority-name';
import { type SupportLevel } from '../../domain/ticketing/support-level';
import { type CiStatus } from '../../domain/ticketing/ci-status';

export type CreateReferentialCategoryCommand = {
  name: string;
  parentId: string | null;
};

export type UpdateReferentialCategoryCommand =
  CreateReferentialCategoryCommand & {
    id: string;
  };

export type CreateReferentialChannelCommand = {
  name: string;
};

export type UpdateReferentialChannelCommand =
  CreateReferentialChannelCommand & {
    id: string;
  };

export type CreateReferentialCiTypeCommand = {
  name: string;
};

export type UpdateReferentialCiTypeCommand = CreateReferentialCiTypeCommand & {
  id: string;
};

export type CreateReferentialGroupCommand = {
  name: string;
  description: string | null;
  level: SupportLevel | null;
};

export type UpdateReferentialGroupCommand = CreateReferentialGroupCommand & {
  id: string;
};

export type CreateReferentialPriorityCommand = {
  name: PriorityName;
  level: number;
  responseHours: number | null;
  resolutionHours: number | null;
};

export type UpdateReferentialPriorityCommand =
  CreateReferentialPriorityCommand & {
    id: string;
  };

export type CreateReferentialServiceCommand = {
  name: string;
  description: string | null;
};

export type UpdateReferentialServiceCommand =
  CreateReferentialServiceCommand & {
    id: string;
  };

export type CreateReferentialCiCommand = {
  name: string;
  ciTypeId: string;
  status: CiStatus;
  assignedUserId: string | null;
  serialNumber: string | null;
};

export type UpdateReferentialCiCommand = CreateReferentialCiCommand & {
  id: string;
};
