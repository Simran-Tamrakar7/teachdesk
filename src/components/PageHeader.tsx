export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl tracking-tight text-ink md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface px-5 py-10 text-center">
      <div className="font-semibold">{title}</div>
      <p className="mt-1 text-sm text-ink-muted">{body}</p>
    </div>
  );
}
