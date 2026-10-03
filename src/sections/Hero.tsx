import { ArrowDown, Presentation } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const stages = ['Text', 'Tokens', 'IDs', 'Embeddings', 'Transformer ×N', 'Logits', 'Probabilities', 'Next token']

export function Hero({ onStartLecture }: { onStartLecture: () => void }) {
  return (
    <section id="top" data-section className="relative scroll-mt-16 overflow-hidden border-b py-20 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background:radial-gradient(60%_50%_at_70%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)]"
      />
      <Badge variant="secondary" className="mb-6">
        A lecture in 11 parts · interactive
      </Badge>
      <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance md:text-7xl">
        How a language model like Claude turns <span className="text-primary">your words</span> into its words
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-pretty text-muted-foreground md:text-xl">
        From the moment you press Enter to the moment the first word appears: text is cut into tokens, tokens
        become vectors, vectors flow through dozens of transformer layers, and out comes a probability for every
        possible next token. Then it does it all again. One token at a time.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-2 font-mono text-xs md:text-sm">
        {stages.map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span className="rounded-md border bg-card px-2.5 py-1.5 shadow-xs">{s}</span>
            {i < stages.length - 1 && <span className="text-muted-foreground">→</span>}
          </span>
        ))}
        <span className="text-primary">↺ repeat</span>
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button size="lg" nativeButton={false} render={<a href="#pipeline" />}>
          Start reading <ArrowDown />
        </Button>
        <Button size="lg" variant="outline" onClick={onStartLecture}>
          <Presentation /> Lecture mode
        </Button>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        In lecture mode, use <kbd className="rounded border px-1 font-mono">←</kbd>{' '}
        <kbd className="rounded border px-1 font-mono">→</kbd> to move between parts.
      </p>
    </section>
  )
}
