import type { ReactNode } from 'react';

export function renderMarkdown(content: string): ReactNode {
  const lines = content.split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith('- ')) {
      const items: string[] = [];
      let j = i;

      while (j < lines.length && lines[j].startsWith('- ')) {
        items.push(lines[j].slice(2));
        j += 1;
      }

      nodes.push(
        <ul key={`ul-${i}`}>
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{inlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
      i = j;
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      let j = i;

      while (j < lines.length && /^\d+\.\s/.test(lines[j])) {
        items.push(lines[j].replace(/^\d+\.\s/, ''));
        j += 1;
      }

      nodes.push(
        <ol key={`ol-${i}`}>
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{inlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
      i = j;
      continue;
    }

    if (line.startsWith('### ')) {
      nodes.push(<h3 key={`h3-${i}`}>{inlineMarkdown(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      nodes.push(<h2 key={`h2-${i}`}>{inlineMarkdown(line.slice(3))}</h2>);
    } else if (line.startsWith('# ')) {
      nodes.push(<h1 key={`h1-${i}`}>{inlineMarkdown(line.slice(2))}</h1>);
    } else {
      nodes.push(<p key={`p-${i}`}>{inlineMarkdown(line)}</p>);
    }

    i += 1;
  }

  return nodes.length > 0 ? nodes : <p>{content}</p>;
}

function inlineMarkdown(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
    }

    return part;
  });
}

export function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR').format(date);
}
