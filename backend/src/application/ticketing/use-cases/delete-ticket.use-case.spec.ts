import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../../domain/auth/user-role';
import { TicketReadRepository } from '../repositories/ticket-read.repository';
import { TicketWriteRepository } from '../repositories/ticket-write.repository';
import { DeleteTicketUseCase } from './delete-ticket.use-case';

describe('DeleteTicketUseCase', () => {
  it('allows admins to delete an existing ticket', async () => {
    const deleteTicket = jest.fn().mockResolvedValue(undefined);
    const useCase = new DeleteTicketUseCase(
      {
        getTicketById: jest.fn().mockResolvedValue({
          ticket: { id: 'ticket-1' },
        }),
      } as unknown as TicketReadRepository,
      {
        deleteTicket,
      } as unknown as TicketWriteRepository,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.ADMIN,
        actorUserId: 'admin-1',
        ticketId: 'ticket-1',
      }),
    ).resolves.toBeUndefined();

    expect(deleteTicket).toHaveBeenCalledWith('ticket-1');
  });

  it('rejects non-admin users', async () => {
    const useCase = new DeleteTicketUseCase(
      {
        getTicketById: jest.fn(),
      } as unknown as TicketReadRepository,
      {
        deleteTicket: jest.fn(),
      } as unknown as TicketWriteRepository,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.AGENT,
        actorUserId: 'agent-1',
        ticketId: 'ticket-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown tickets', async () => {
    const useCase = new DeleteTicketUseCase(
      {
        getTicketById: jest.fn().mockResolvedValue(null),
      } as unknown as TicketReadRepository,
      {
        deleteTicket: jest.fn(),
      } as unknown as TicketWriteRepository,
    );

    await expect(
      useCase.execute({
        actorRole: UserRole.ADMIN,
        actorUserId: 'admin-1',
        ticketId: 'ticket-unknown',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
