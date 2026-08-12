export type DefaultTicketSortPreference =
  | 'CREATED_AT_ASC'
  | 'CREATED_AT_DESC'
  | 'OPERATIONAL_PRIORITY';

export type DefaultKnowledgeSortPreference = 'NEWEST' | 'OLDEST' | 'POPULAR';

const DEFAULT_TICKET_SORT: DefaultTicketSortPreference = 'OPERATIONAL_PRIORITY';
const DEFAULT_KNOWLEDGE_SORT: DefaultKnowledgeSortPreference = 'NEWEST';
const PREFERENCES_EVENT_NAME = 'vision:default-sort-preferences-changed';

function getPreferenceKey(userId: string, preference: string): string {
  return `vision.user-preferences.${userId}.${preference}`;
}

function readPreference<T extends string>(
  key: string,
  fallback: T,
  allowedValues: readonly T[],
): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const storedValue = window.localStorage.getItem(key);

  return allowedValues.includes(storedValue as T)
    ? (storedValue as T)
    : fallback;
}

function writePreference<T extends string>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, value);
}

export function getDefaultTicketSortPreference(
  userId: string,
): DefaultTicketSortPreference {
  return readPreference(
    getPreferenceKey(userId, 'default-ticket-sort'),
    DEFAULT_TICKET_SORT,
    ['OPERATIONAL_PRIORITY', 'CREATED_AT_DESC', 'CREATED_AT_ASC'],
  );
}

export function getDefaultKnowledgeSortPreference(
  userId: string,
): DefaultKnowledgeSortPreference {
  return readPreference(
    getPreferenceKey(userId, 'default-knowledge-sort'),
    DEFAULT_KNOWLEDGE_SORT,
    ['NEWEST', 'OLDEST', 'POPULAR'],
  );
}

export function setDefaultTicketSortPreference(
  userId: string,
  value: DefaultTicketSortPreference,
): void {
  writePreference(getPreferenceKey(userId, 'default-ticket-sort'), value);
  dispatchDefaultSortPreferencesChanged(userId);
}

export function setDefaultKnowledgeSortPreference(
  userId: string,
  value: DefaultKnowledgeSortPreference,
): void {
  writePreference(getPreferenceKey(userId, 'default-knowledge-sort'), value);
  dispatchDefaultSortPreferencesChanged(userId);
}

function dispatchDefaultSortPreferencesChanged(userId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(PREFERENCES_EVENT_NAME, {
      detail: { userId },
    }),
  );
}

export function subscribeToDefaultSortPreferences(
  userId: string,
  callback: () => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  function handlePreferencesChanged(event: Event): void {
    if (
      event instanceof CustomEvent &&
      (!event.detail || event.detail.userId === userId)
    ) {
      callback();
    }
  }

  window.addEventListener(PREFERENCES_EVENT_NAME, handlePreferencesChanged);

  return () => {
    window.removeEventListener(
      PREFERENCES_EVENT_NAME,
      handlePreferencesChanged,
    );
  };
}
