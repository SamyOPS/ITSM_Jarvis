import type { ReactNode } from 'react';

type TicketDetailSectionPanelProps = {
  children: ReactNode;
  count?: number;
  icon: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  title: string;
};

export function TicketDetailSectionPanel({
  children,
  count,
  icon,
  isOpen,
  onToggle,
  title,
}: TicketDetailSectionPanelProps) {
  return (
    <section className="tdp-section-panel">
      <button
        aria-expanded={isOpen}
        className="tdp-section-toggle"
        onClick={onToggle}
        type="button"
      >
        <span className="tdp-section-title">
          <span className="tdp-section-icon">{icon}</span>
          <span>{title}</span>
        </span>
        {typeof count === 'number' ? (
          <span className="tdp-tab-count">{count}</span>
        ) : null}
        <span className="tdp-section-chevron">{isOpen ? '-' : '+'}</span>
      </button>

      <div
        className={
          isOpen ? 'tdp-section-collapse is-open' : 'tdp-section-collapse'
        }
      >
        <div className="tdp-section-body">{children}</div>
      </div>
    </section>
  );
}
