export const tableStyles = {
  root: 'overflow-hidden rounded-[var(--radius)] border border-border bg-card text-foreground',
  scroll: 'overflow-x-auto',
  header: 'bg-muted',
  column: 'h-10 bg-muted px-4 !text-center text-xs font-medium text-muted-foreground',
  row: '!rounded-none border-b border-border transition-colors last:border-b-0 even:[&>td]:!bg-muted/35 [&>td]:!rounded-none [&>th]:!rounded-none',
  cell: 'h-11 bg-card px-4 py-2 !text-center text-sm [&>div.flex]:justify-center',
  emptyCell: 'h-28 bg-card px-4 py-8 text-center text-sm text-muted-foreground',
} as const;
