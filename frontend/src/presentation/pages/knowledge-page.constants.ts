import { ArrowUpDown, Flame, History } from 'lucide-react';
import type {
  KnowledgeFormState,
  KnowledgeSortOption,
} from './knowledge-page.types';

export const KNOWLEDGE_CATEGORY_OPTIONS = [
  'Compte & accès',
  'Réseau & Internet',
  'Matériel',
  'Logiciels & applications',
  'Messagerie',
  'Impression',
  'Sécurité',
  'Téléphonie',
  'Procédures internes',
  'Dépannage général',
] as const;

export const KNOWLEDGE_PAGE_SIZE = 20;

export const EMPTY_FORM: KnowledgeFormState = {
  attachments: [],
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
    label: 'Plus récentes',
    description: 'Articles les plus récemment mis à jour',
    icon: ArrowUpDown,
  },
  {
    value: 'OLDEST',
    label: "Plus anciens d'abord",
    description: 'Appliquer ce tri',
    icon: History,
  },
];