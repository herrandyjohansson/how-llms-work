import type { ReactNode } from 'react'
import { Info, Lightbulb, TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function Section({
  id,
  number,
  title,
  kicker,
  children,
}: {
  id: string
  number: number
  title: string
  kicker: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} data-section className="scroll-mt-16 border-b py-16 last:border-b-0 md:py-24">
      <header className="mb-10">
        <Badge variant="outline" className="font-mono text-xs tracking-wider uppercase">
          Part {String(number).padStart(2, '0')}
        </Badge>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance md:text-5xl">{title}</h2>
        <p className="mt-4 max-w-3xl text-lg text-pretty text-muted-foreground md:text-xl">{kicker}</p>
      </header>
      <div className="space-y-10">{children}</div>
    </section>
  )
}

export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'max-w-3xl space-y-4 text-base leading-7 text-pretty text-foreground/90 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_em]:text-foreground [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="text-xl font-semibold tracking-tight md:text-2xl">{children}</h3>
}

const calloutIcons = { tip: Lightbulb, note: Info, warn: TriangleAlert }

export function Callout({
  kind = 'note',
  title,
  children,
}: {
  kind?: keyof typeof calloutIcons
  title: string
  children: ReactNode
}) {
  const Icon = calloutIcons[kind]
  return (
    <Alert
      className={cn(
        'max-w-3xl',
        kind === 'tip' && 'border-primary/40 bg-primary/5',
        kind === 'warn' && 'border-amber-500/40 bg-amber-500/5',
      )}
    >
      <Icon className={cn(kind === 'tip' && 'text-primary', kind === 'warn' && 'text-amber-600 dark:text-amber-400')} />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="text-foreground/80">{children}</AlertDescription>
    </Alert>
  )
}

/** Labelled control row used by the interactive demos. */
export function Control({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="font-medium">{label}</span>
        {value !== undefined && <span className="font-mono text-muted-foreground tabular-nums">{value}</span>}
      </div>
      {children}
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-xs tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

/** Colour palette for token chips; index by token position. */
export const tokenColors = [
  'bg-orange-200/70 dark:bg-orange-500/25',
  'bg-sky-200/70 dark:bg-sky-500/25',
  'bg-emerald-200/70 dark:bg-emerald-500/25',
  'bg-violet-200/70 dark:bg-violet-500/25',
  'bg-amber-200/70 dark:bg-amber-500/25',
  'bg-rose-200/70 dark:bg-rose-500/25',
  'bg-teal-200/70 dark:bg-teal-500/25',
  'bg-fuchsia-200/70 dark:bg-fuchsia-500/25',
]

export function visibleWhitespace(s: string) {
  return s.replace(/ /g, '·').replace(/\n/g, '↵').replace(/\t/g, '→')
}

export function TokenChip({
  text,
  index,
  id,
  active,
  dim,
  onHover,
  className,
}: {
  text: string
  index: number
  id?: number | string
  active?: boolean
  dim?: boolean
  onHover?: (i: number | null) => void
  className?: string
}) {
  return (
    <span
      onMouseEnter={() => onHover?.(index)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        'inline-flex flex-col items-center rounded-md px-1.5 py-1 font-mono text-sm leading-tight transition-all',
        tokenColors[index % tokenColors.length],
        active && 'ring-2 ring-primary',
        dim && 'opacity-40',
        className,
      )}
    >
      <span className="whitespace-pre">{visibleWhitespace(text)}</span>
      {id !== undefined && <span className="text-[10px] text-muted-foreground tabular-nums">{id}</span>}
    </span>
  )
}

/** Thin colour strip visualising a vector: orange = positive, blue = negative. */
export function VectorStrip({ values, className, cell = 'h-6 w-3' }: { values: number[]; className?: string; cell?: string }) {
  return (
    <div className={cn('flex overflow-hidden rounded-sm', className)}>
      {values.map((v, i) => (
        <div
          key={i}
          className={cell}
          title={v.toFixed(3)}
          style={{
            backgroundColor:
              v >= 0 ? `color-mix(in oklch, var(--chart-1) ${Math.round(Math.min(1, v) * 100)}%, transparent)`
                : `color-mix(in oklch, var(--chart-2) ${Math.round(Math.min(1, -v) * 100)}%, transparent)`,
          }}
        />
      ))}
    </div>
  )
}
