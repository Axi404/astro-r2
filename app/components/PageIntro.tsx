import type { ReactNode } from 'react';

interface IntroNote {
  title: string;
  body: string;
  detail?: string;
}

interface PageIntroProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  actions?: ReactNode;
  asideLabel: string;
  asideLead?: string;
  notes: IntroNote[];
}

export default function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  asideLabel,
  asideLead,
  notes,
}: PageIntroProps) {
  return (
    <section className="page-intro panel panel-light">
      <div className="page-intro-grid">
        <div className="min-w-0">
          <p className="eyebrow text-[var(--muted)]">{eyebrow}</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-copy">{description}</p>
          {actions ? <div className="page-actions">{actions}</div> : null}
        </div>

        <aside className="page-aside">
          <div className="pl-0 lg:pl-6">
            <p className="eyebrow text-[var(--muted)]">{asideLabel}</p>
            {asideLead ? (
              <p className="mt-3 max-w-md text-sm leading-7 text-[var(--ink-soft)]">{asideLead}</p>
            ) : null}
          </div>

          <div className="mt-5 lg:pl-6">
            {notes.map((note, index) => (
              <article key={`${note.title}-${index}`} className="page-note">
                <div className="flex items-start gap-4">
                  <span className="page-note-index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <h2 className="font-display text-[1.45rem] leading-tight text-[var(--ink)] sm:text-[1.65rem]">
                      {note.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{note.body}</p>
                    {note.detail ? (
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                        {note.detail}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
