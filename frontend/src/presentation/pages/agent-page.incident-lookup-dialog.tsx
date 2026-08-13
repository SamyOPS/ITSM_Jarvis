import { X } from 'lucide-react';
import type { MouseEvent } from 'react';

import type { AdminUserSummary } from '../../domain/auth/admin-user-summary';
import type {
  ReferentialCi,
  ReferentialCiType,
  ReferentialGroup,
} from '../../domain/referentials/referential-catalog';
import { AppPagination } from '../components/app-pagination';
import type {
  IncidentLookupKind,
  IncidentLookupSearchField,
} from './agent-page.types';

type IncidentLookupDialogProps = {
  ciTypesById: Map<string, ReferentialCiType>;
  formatKnownUserName: (user: AdminUserSummary, fallback: string) => string;
  incidentLookupKind: IncidentLookupKind;
  incidentLookupPage: number;
  incidentLookupResultCount: number;
  incidentLookupSearch: string;
  incidentLookupSearchField: IncidentLookupSearchField;
  incidentLookupTotalPages: number;
  onClose: () => void;
  onEquipmentSelect: (ci: ReferentialCi) => void;
  onGroupSelect: (group: ReferentialGroup) => void;
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  onSearchFieldChange: (value: IncidentLookupSearchField) => void;
  onUserSelect: (user: AdminUserSummary) => void;
  paginatedEquipment: ReferentialCi[];
  paginatedGroups: ReferentialGroup[];
  paginatedUsers: AdminUserSummary[];
  selectedEquipmentId: string;
  selectedGroupId: string;
  selectedUserId: string;
};

function getDialogTitle(kind: IncidentLookupKind): string {
  if (kind === 'ASSIGNMENT_GROUP') {
    return 'Selectionner un groupe';
  }

  if (kind === 'INCIDENT_EQUIPMENT') {
    return 'Selectionner un equipement';
  }

  if (kind === 'ASSIGNEE') {
    return 'Selectionner un technicien';
  }

  return 'Selectionner un demandeur';
}

function getTableClassName(kind: IncidentLookupKind): string {
  if (kind === 'ASSIGNMENT_GROUP' || kind === 'INCIDENT_EQUIPMENT') {
    return 'incident-lookup-table';
  }

  if (kind === 'ASSIGNEE') {
    return 'incident-lookup-table incident-lookup-table--assignee';
  }

  return 'incident-lookup-table incident-lookup-table--users';
}

export function IncidentLookupDialog({
  ciTypesById,
  formatKnownUserName,
  incidentLookupKind,
  incidentLookupPage,
  incidentLookupResultCount,
  incidentLookupSearch,
  incidentLookupSearchField,
  incidentLookupTotalPages,
  onClose,
  onEquipmentSelect,
  onGroupSelect,
  onPageChange,
  onSearchChange,
  onSearchFieldChange,
  onUserSelect,
  paginatedEquipment,
  paginatedGroups,
  paginatedUsers,
  selectedEquipmentId,
  selectedGroupId,
  selectedUserId,
}: IncidentLookupDialogProps) {
  function handleOverlayMouseDown(event: MouseEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      aria-modal="true"
      className="incident-lookup-overlay"
      onMouseDown={handleOverlayMouseDown}
      role="dialog"
    >
      <section className="incident-lookup-dialog">
        <header className="incident-lookup-header">
          <div>
            <h3>{getDialogTitle(incidentLookupKind)}</h3>
          </div>

          <button
            aria-label="Fermer la selection"
            className="incident-lookup-close"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        <label className="incident-lookup-search">
          <select
            aria-label="Categorie de recherche"
            onChange={(event) =>
              onSearchFieldChange(
                event.target.value as IncidentLookupSearchField,
              )
            }
            value={incidentLookupSearchField}
          >
            <option value="IDENTIFIER">Identifiant</option>
            {incidentLookupKind === 'ASSIGNMENT_GROUP' ? (
              <option value="NAME">Nom</option>
            ) : incidentLookupKind === 'INCIDENT_EQUIPMENT' ? (
              <>
                <option value="NAME">Nom</option>
                <option value="TYPE">Type</option>
                <option value="STATUS">Statut</option>
                <option value="SERIAL_NUMBER">Numero de serie</option>
              </>
            ) : (
              <>
                <option value="FIRST_NAME">Prenom</option>
                <option value="LAST_NAME">Nom</option>
              </>
            )}
          </select>
          <div className="incident-lookup-search-input">
            <input
              autoFocus
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Rechercher"
              value={incidentLookupSearch}
            />
          </div>
        </label>

        <div className="incident-lookup-table-scroll">
          <table className={getTableClassName(incidentLookupKind)}>
            <thead>
              {incidentLookupKind === 'ASSIGNMENT_GROUP' ? (
                <tr>
                  <th>Identifiant</th>
                  <th>Nom</th>
                  <th>Description</th>
                </tr>
              ) : incidentLookupKind === 'INCIDENT_EQUIPMENT' ? (
                <tr>
                  <th>Identifiant</th>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Modele</th>
                  <th>Statut</th>
                  <th>Numero de serie</th>
                </tr>
              ) : (
                <tr>
                  <th>Identifiant</th>
                  <th>Prenom</th>
                  <th>Nom</th>
                </tr>
              )}
            </thead>

            <tbody>
              {incidentLookupKind === 'ASSIGNMENT_GROUP' ? (
                paginatedGroups.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      Aucun groupe ne correspond a la recherche.
                    </td>
                  </tr>
                ) : (
                  paginatedGroups.map((group) => (
                    <tr
                      aria-selected={group.id === selectedGroupId}
                      className={
                        group.id === selectedGroupId
                          ? 'incident-lookup-row is-selected'
                          : 'incident-lookup-row'
                      }
                      key={group.id}
                      onClick={() => onGroupSelect(group)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onGroupSelect(group);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td className="incident-lookup-identity">{group.name}</td>
                      <td>{group.name}</td>
                      <td>{group.description ?? '-'}</td>
                    </tr>
                  ))
                )
              ) : incidentLookupKind === 'INCIDENT_EQUIPMENT' ? (
                paginatedEquipment.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      Aucun equipement disponible dans le parc informatique pour
                      le moment.
                    </td>
                  </tr>
                ) : (
                  paginatedEquipment.map((ci) => {
                    const ciType = ciTypesById.get(ci.ciTypeId);

                    return (
                      <tr
                        aria-selected={ci.id === selectedEquipmentId}
                        className={
                          ci.id === selectedEquipmentId
                            ? 'incident-lookup-row is-selected'
                            : 'incident-lookup-row'
                        }
                        key={ci.id}
                        onClick={() => onEquipmentSelect(ci)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onEquipmentSelect(ci);
                          }
                        }}
                        tabIndex={0}
                      >
                        <td className="incident-lookup-identity">{ci.name}</td>
                        <td>{ci.name}</td>
                        <td>{ciType?.name ?? 'Type inconnu'}</td>
                        <td>{ci.model ?? '-'}</td>
                        <td>{ci.status}</td>
                        <td>{ci.serialNumber ?? '-'}</td>
                      </tr>
                    );
                  })
                )
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    Aucun utilisateur ne correspond a la recherche.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr
                    aria-selected={user.id === selectedUserId}
                    className={
                      user.id === selectedUserId
                        ? 'incident-lookup-row is-selected'
                        : 'incident-lookup-row'
                    }
                    key={user.id}
                    onClick={() => onUserSelect(user)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onUserSelect(user);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="incident-lookup-identity">
                      {formatKnownUserName(user, user.id)}
                    </td>
                    <td>{user.firstName ?? 'Non renseigne'}</td>
                    <td>{user.lastName ?? 'Non renseigne'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <AppPagination
          onPageChange={onPageChange}
          page={incidentLookupPage}
          summary={`Page ${incidentLookupPage} sur ${incidentLookupTotalPages} - ${incidentLookupResultCount} resultat${incidentLookupResultCount > 1 ? 's' : ''}`}
          totalPages={incidentLookupTotalPages}
        />
      </section>
    </div>
  );
}
