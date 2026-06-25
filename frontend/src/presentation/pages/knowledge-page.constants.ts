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
    description: 'Appliquer ce tri',
    icon: Flame,
  },
  {
    value: 'NEWEST',
    label: "Plus récents d'abord",
    description: 'Appliquer ce tri',
    icon: ArrowUpDown,
  },
  {
    value: 'OLDEST',
    label: "Plus anciens d'abord",
    description: 'Appliquer ce tri',
    icon: History,
  },
];
