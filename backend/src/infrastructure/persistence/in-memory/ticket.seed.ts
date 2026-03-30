import { PriorityName } from '../../../domain/ticketing/priority-name';
import { TicketStatus } from '../../../domain/ticketing/ticket-status';
import { TicketType } from '../../../domain/ticketing/ticket-type';

const NOW = '2026-03-30T10:00:00.000Z';

export const TICKET_SEED = [
  {
    assignedToUserId: null,
    assignmentGroupId: 'group-n1',
    createdAt: NOW,
    id: 'ticket-1',
    number: 'TICK-000001',
    priority: PriorityName.MEDIUM,
    status: TicketStatus.OPEN,
    title: 'Creation de compte nouvel arrivant',
    type: TicketType.REQUEST,
  },
  {
    assignedToUserId: 'user-agent-1',
    assignmentGroupId: 'group-n2',
    createdAt: NOW,
    id: 'ticket-2',
    number: 'TICK-000002',
    priority: PriorityName.HIGH,
    status: TicketStatus.IN_PROGRESS,
    title: 'VPN inaccessible pour plusieurs utilisateurs',
    type: TicketType.INCIDENT,
  },
] as const;
