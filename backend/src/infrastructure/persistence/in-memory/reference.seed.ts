import { PriorityName } from '../../../domain/ticketing/priority-name';
import { SupportLevel } from '../../../domain/ticketing/support-level';

const NOW = '2026-03-30T10:00:00.000Z';

export const SUPPORT_GROUP_SEED = [
  {
    createdAt: NOW,
    description: 'Premier niveau de qualification et de support.',
    id: 'group-n1',
    level: SupportLevel.N1,
    name: 'Support N1',
    updatedAt: NOW,
  },
  {
    createdAt: NOW,
    description: 'Support avance pour incidents techniques.',
    id: 'group-n2',
    level: SupportLevel.N2,
    name: 'Support N2',
    updatedAt: NOW,
  },
  {
    createdAt: NOW,
    description: 'Support expert et escalade finale.',
    id: 'group-n3',
    level: SupportLevel.N3,
    name: 'Support N3',
    updatedAt: NOW,
  },
] as const;

export const CATEGORY_SEED = [
  {
    createdAt: NOW,
    id: 'cat-access',
    name: 'Acces',
    parentId: null,
    updatedAt: NOW,
  },
  {
    createdAt: NOW,
    id: 'cat-access-account',
    name: 'Compte utilisateur',
    parentId: 'cat-access',
    updatedAt: NOW,
  },
  {
    createdAt: NOW,
    id: 'cat-network',
    name: 'Reseau',
    parentId: null,
    updatedAt: NOW,
  },
  {
    createdAt: NOW,
    id: 'cat-network-vpn',
    name: 'VPN',
    parentId: 'cat-network',
    updatedAt: NOW,
  },
] as const;

export const SERVICE_SEED = [
  {
    createdAt: NOW,
    description: 'Service de gestion des identites.',
    id: 'service-identity',
    name: 'Identity',
    updatedAt: NOW,
  },
  {
    createdAt: NOW,
    description: 'Service de connectivite distante.',
    id: 'service-vpn',
    name: 'VPN',
    updatedAt: NOW,
  },
] as const;

export const CHANNEL_SEED = [
  {
    createdAt: NOW,
    id: 'channel-portal',
    name: 'PORTAL',
    updatedAt: NOW,
  },
  {
    createdAt: NOW,
    id: 'channel-email',
    name: 'EMAIL',
    updatedAt: NOW,
  },
  {
    createdAt: NOW,
    id: 'channel-phone',
    name: 'PHONE',
    updatedAt: NOW,
  },
] as const;

export const PRIORITY_SEED = [
  {
    createdAt: NOW,
    id: 'priority-low',
    level: 1,
    name: PriorityName.LOW,
    resolutionHours: 40,
    responseHours: 8,
    updatedAt: NOW,
  },
  {
    createdAt: NOW,
    id: 'priority-medium',
    level: 2,
    name: PriorityName.MEDIUM,
    resolutionHours: 16,
    responseHours: 4,
    updatedAt: NOW,
  },
  {
    createdAt: NOW,
    id: 'priority-high',
    level: 3,
    name: PriorityName.HIGH,
    resolutionHours: 8,
    responseHours: 2,
    updatedAt: NOW,
  },
] as const;
