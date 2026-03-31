import { IncidentSeverity } from '../../domain/ticketing/incident-severity';
import { PriorityName } from '../../domain/ticketing/priority-name';
import { resolveIncidentPriorityName } from './incident-priority';

describe('resolveIncidentPriorityName', () => {
  it('returns LOW for a low/low incident', () => {
    expect(
      resolveIncidentPriorityName(IncidentSeverity.LOW, IncidentSeverity.LOW),
    ).toBe(PriorityName.LOW);
  });

  it('returns HIGH for a high/medium incident', () => {
    expect(
      resolveIncidentPriorityName(
        IncidentSeverity.HIGH,
        IncidentSeverity.MEDIUM,
      ),
    ).toBe(PriorityName.HIGH);
  });

  it('returns CRITICAL for a high/high incident', () => {
    expect(
      resolveIncidentPriorityName(IncidentSeverity.HIGH, IncidentSeverity.HIGH),
    ).toBe(PriorityName.CRITICAL);
  });
});
