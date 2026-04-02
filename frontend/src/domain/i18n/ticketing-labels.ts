import type { UserRole } from '../auth/user-role';

export type TicketType = 'INCIDENT' | 'REQUEST';

export function translateUserRole(role: UserRole | string): string {
  switch (role) {
    case 'DEMANDEUR':
      return 'Demandeur';
    case 'AGENT':
      return 'Agent';
    case 'ADMIN':
      return 'Administrateur';
    default:
      return role;
  }
}

export function translateTicketType(type: TicketType | string): string {
  switch (type) {
    case 'INCIDENT':
      return 'Incident';
    case 'REQUEST':
      return 'Demande';
    default:
      return type;
  }
}

export function translateRequestType(value: string): string {
  switch (value) {
    case 'ACCESS':
      return 'Acces';
    case 'HARDWARE':
      return 'Materiel';
    case 'SOFTWARE':
      return 'Logiciel';
    case 'OTHER':
      return 'Autre';
    default:
      return value;
  }
}

export function translatePriority(name: string): string {
  switch (name) {
    case 'LOW':
      return 'Basse';
    case 'MEDIUM':
      return 'Moyenne';
    case 'HIGH':
      return 'Haute';
    case 'CRITICAL':
      return 'Critique';
    default:
      return name;
  }
}

export function translateIncidentSeverity(value: string): string {
  switch (value) {
    case 'LOW':
      return 'Faible';
    case 'MEDIUM':
      return 'Moyenne';
    case 'HIGH':
      return 'Haute';
    default:
      return value;
  }
}

export function translateChannel(name: string): string {
  switch (name) {
    case 'EMAIL':
      return 'Email';
    case 'PHONE':
      return 'Téléphone';
    case 'PORTAL':
      return 'Portail';
    default:
      return name;
  }
}

export function translateCiStatus(status: string): string {
  switch (status) {
    case 'IN_SERVICE':
      return 'En service';
    case 'MAINTENANCE':
      return 'Maintenance';
    case 'OUT_OF_SERVICE':
      return 'Hors service';
    default:
      return status;
  }
}
