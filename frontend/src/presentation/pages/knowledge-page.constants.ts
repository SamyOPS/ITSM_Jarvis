import { ArrowUpDown, Flame, History } from 'lucide-react';
import type {
  KnowledgeFormState,
  KnowledgeSortOption,
} from './knowledge-page.types';

export const KNOWLEDGE_CATEGORY_OPTIONS = [
  'Compte & accÃ¨s',
  'RÃ©seau & Internet',
  'MatÃ©riel',
  'Logiciels & applications',
  'Messagerie',
  'Impression',
  'SÃ©curitÃ©',
  'TÃ©lÃ©phonie',
  'ProcÃ©dures internes',
  'DÃ©pannage gÃ©nÃ©ral',
] as const;

export const KNOWLEDGE_PAGE_SIZE = 20;

export const EMPTY_FORM: KnowledgeFormState = {
  category: '',
  content: '',
  status: 'PUBLISHED',
  title: '',
};

export const KNOWLEDGE_SORT_OPTIONS: Array<{
  description: string;
  icon: typeof Flame;
  label: string;
  value: KnowledgeSortOption;
}> = [
  {
    value: 'POPULAR',
    label: 'Plus populaire',
    description: 'Trie par nombre de likes',
    icon: Flame,
  },
  {
    value: 'NEWEST',
    label: 'Plus recentes',
    description: 'Articles les plus recemment mis a jour',
    icon: ArrowUpDown,
  },
  {
    value: 'OLDEST',
    label: 'Plus anciennes',
    description: 'Articles les plus anciens en premier',
    icon: History,
  },
];
