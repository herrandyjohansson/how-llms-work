import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Callout, Control, H3, Prose, Section, VectorStrip, visibleWhitespace } from '@/components/layout'
import { Tex } from '@/components/tex'
import { dot, fakeVector, sliderValue } from '@/lib/math'
import { tokenize, useTokenizer } from '@/lib/tokenizer'
import { cn } from '@/lib/utils'

const DIMS = ['royalty', 'gender (♂+ / ♀−)', 'animal', 'youth', 'food'] as const
const WORDS: Record<string, number[]> = {
  king: [0.95, 0.9, 0, 0.1, 0],
  queen: [0.95, -0.9, 0, 0.1, 0],
  prince: [0.85, 0.85, 0, 0.75, 0],
  princess: [0.85, -0.85, 0, 0.75, 0],
  man: [0.05, 0.9, 0.08, 0.12, 0],
  woman: [0.05, -0.9, 0.08, 0.12, 0],
  boy: [0.05, 0.85, 0.08, 0.85, 0],
  girl: [0.05, -0.85, 0.08, 0.85, 0],
  cat: [0, 0.02, 0.95, 0.15, 0.02],
  kitten: [0, 0.02, 0.95, 0.9, 0.02],
  dog: [0, 0.08, 0.95, 0.15, 0.02],
  puppy: [0, 0.08, 0.95, 0.9, 0.02],
  apple: [0, 0, 0.02, 0.05, 0.95],
  pizza: [0.02, 0, 0, 0.02, 0.92],
}

const norm = (v: number[]) => Math.sqrt(dot(v, v))
const cosine = (a: number[], b: number[]) => dot(a, b) / (norm(a) * norm(b) || 1)

const ANALOGIES: [string, string, string][] = [
  ['king', 'man', 'woman'],
  ['prince', 'boy', 'girl'],
  ['kitten', 'cat', 'dog'],
  ['queen', 'woman', 'girl'],
]

export function Embeddings() {
  return (
    <Section
      id="embeddings"
      number={3}
      title="Embeddings: giving tokens meaning (and position)"
      kicker="A token ID is just an arbitrary number. The model replaces it with a long vector of numbers, a point in a high-dimensional space where similar meanings end up close together."
    >
      <Prose>
        <p>
          The first layer of the model is a giant lookup table called the <strong>embedding matrix</strong>. It has
          one row per vocabulary entry and one column per model dimension (<Tex>{'d_{\\text{model}}'}</Tex>, typically
          several thousand in frontier models). Turning token IDs into vectors is literally "fetch row number{' '}
          <em>id</em>":
        </p>
      </Prose>
      <Tex block>{'x_i = E[\\,\\text{id}_i\\,] \\in \\mathbb{R}^{d_{\\text{model}}}, \\qquad E \\in \\mathbb{R}^{|V| \\times d_{\\text{model}}}'}</Tex>
      <EmbeddingLookup />

      <Prose>
        <p>
          These numbers are <strong>not designed by anyone</strong>. They start out random and are adjusted during
          training (Part 8) so that the model gets better at predicting the next token. A remarkable side effect is
          that the space becomes organised by meaning: words used in similar contexts end up with similar vectors,
          and <em>directions</em> in the space come to represent concepts.
        </p>
      </Prose>

      <H3>A toy meaning space</H3>
      <Prose>
        <p>
          To build intuition, here is a hand-made 5-dimensional embedding where each dimension has a clear meaning.
          Pick two axes to project onto, and try the famous vector-arithmetic analogies.
        </p>
      </Prose>
      <SemanticSpace />

      <Callout kind="warn" title="Real embeddings are messier">
        In a real model the individual dimensions are not neatly labelled "royalty" or "gender". Concepts are spread
        across many dimensions at once, and a model packs far more concepts than it has dimensions by using
        nearly-orthogonal directions, a phenomenon Anthropic's interpretability team calls{' '}
        <strong>superposition</strong>. The geometric intuition (meaning ≈ direction, similarity ≈ angle) still holds.
      </Callout>

      <H3>Where am I? Positional information</H3>
      <Prose>
        <p>
          There is a subtle problem. The attention mechanism we'll meet next treats its input as an unordered{' '}
          <em>set</em>: without extra help, "dog bites man" and "man bites dog" would look identical. So the model must
          be told where each token sits.
        </p>
        <p>
          The original 2017 transformer added a fixed pattern of sine waves to each embedding. Most modern open LLMs
          (Llama, Mistral, Qwen and others) instead use <strong>Rotary Position Embeddings (RoPE)</strong>: the query
          and key vectors are split into pairs of numbers, and each pair is <em>rotated</em> by an angle proportional
          to the token's position, with each pair spinning at a different frequency, like the hands of a clock.
          Anthropic hasn't published which scheme Claude uses, but the goal is the same.
        </p>
      </Prose>
      <Tex block>{'\\begin{pmatrix} q\'_{2k} \\\\ q\'_{2k+1} \\end{pmatrix} = \\begin{pmatrix} \\cos m\\theta_k & -\\sin m\\theta_k \\\\ \\sin m\\theta_k & \\cos m\\theta_k \\end{pmatrix} \\begin{pmatrix} q_{2k} \\\\ q_{2k+1} \\end{pmatrix}, \\qquad \\theta_k = 10000^{-2k/d}'}</Tex>
      <RopeDemo />
    </Section>
  )
}

function EmbeddingLookup() {
  const enc = useTokenizer()
  const tokens = (enc ? tokenize(enc, 'The cat sat on the') : [{ text: 'The', id: 791 }]).map((t) => ({
    t: visibleWhitespace(t.text),
    id: t.id,
  }))
  const [selected, setSel] = useState(1)
  const sel = Math.min(selected, tokens.length - 1)
  const rowsShown = 9
  const cols = 32
  return (
    <Card>
      <CardHeader>
        <CardTitle>Embedding lookup</CardTitle>
        <CardDescription>Click a token to fetch its row. (Values shown are illustrative.)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {tokens.map((t, i) => (
            <Button key={t.t} size="sm" variant={sel === i ? 'default' : 'outline'} onClick={() => setSel(i)} className="font-mono">
              {t.t} <span className="opacity-60">#{t.id}</span>
            </Button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[520px] space-y-1 font-mono text-xs">
            {Array.from({ length: rowsShown }, (_, r) => {
              const id = tokens[sel].id - 4 + r
              const active = r === 4
              return (
                <div key={r} className={cn('flex items-center gap-2 transition-opacity', !active && 'opacity-35')}>
                  <span className={cn('w-16 text-right', active && 'font-bold text-primary')}>row {id}</span>
                  <VectorStrip values={fakeVector('row' + id, cols)} cell={cn('flex-1', active ? 'h-6' : 'h-3')} className={cn('flex-1', active && 'ring-2 ring-primary')} />
                </div>
              )
            })}
            <div className="pt-1 text-center text-muted-foreground">⋮ ~100,000 rows total × thousands of columns</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SemanticSpace() {
  const [ax, setAx] = useState(1)
  const [ay, setAy] = useState(0)
  const [analogy, setAnalogy] = useState<[string, string, string] | null>(ANALOGIES[0])

  const result = useMemo(() => {
    if (!analogy) return null
    const [a, b, c] = analogy.map((w) => WORDS[w])
    const v = a.map((x, i) => x - b[i] + c[i])
    const ranked = Object.entries(WORDS)
      .filter(([w]) => !analogy.includes(w))
      .map(([w, vec]) => ({ w, sim: cosine(v, vec) }))
      .sort((p, q) => q.sim - p.sim)
    return { v, ranked }
  }, [analogy])

  const W = 460
  const H = 340
  const pad = 36
  const sx = (x: number) => pad + ((x + 1) / 2) * (W - 2 * pad)
  const sy = (y: number) => H - pad - ((y + 1) / 2) * (H - 2 * pad)
  const P = (v: number[]) => [sx(v[ax]), sy(v[ay])] as const

  return (
    <Card>
      <CardContent className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">X axis:</span>
            {DIMS.map((d, i) => (
              <Button key={d} size="xs" variant={ax === i ? 'default' : 'outline'} onClick={() => setAx(i)}>
                {d}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Y axis:</span>
            {DIMS.map((d, i) => (
              <Button key={d} size="xs" variant={ay === i ? 'default' : 'outline'} onClick={() => setAy(i)}>
                {d}
              </Button>
            ))}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border bg-muted/20">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" />
              </marker>
            </defs>
            <line x1={sx(-1)} x2={sx(1)} y1={sy(0)} y2={sy(0)} stroke="currentColor" opacity={0.15} />
            <line x1={sx(0)} x2={sx(0)} y1={sy(-1)} y2={sy(1)} stroke="currentColor" opacity={0.15} />
            <text x={W - pad} y={sy(0) - 6} textAnchor="end" className="fill-muted-foreground text-[11px]">
              {DIMS[ax]} →
            </text>
            <text x={sx(0) + 6} y={pad - 12} className="fill-muted-foreground text-[11px]">
              ↑ {DIMS[ay]}
            </text>
            {analogy && result && (
              <>
                <line
                  x1={P(WORDS[analogy[1]])[0]}
                  y1={P(WORDS[analogy[1]])[1]}
                  x2={P(WORDS[analogy[0]])[0]}
                  y2={P(WORDS[analogy[0]])[1]}
                  stroke="var(--primary)"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  markerEnd="url(#arrow)"
                />
                <line
                  x1={P(WORDS[analogy[2]])[0]}
                  y1={P(WORDS[analogy[2]])[1]}
                  x2={P(result.v)[0]}
                  y2={P(result.v)[1]}
                  stroke="var(--primary)"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  markerEnd="url(#arrow)"
                />
                <circle cx={P(result.v)[0]} cy={P(result.v)[1]} r={9} fill="none" stroke="var(--primary)" strokeWidth={2} />
              </>
            )}
            {Object.entries(WORDS).map(([w, v]) => {
              const [x, y] = P(v)
              // Stack labels of points that land on (nearly) the same spot so they stay readable.
              const near = Object.entries(WORDS).filter(([, u]) => Math.hypot(P(u)[0] - x, P(u)[1] - y) < 12)
              const slot = near.findIndex(([n]) => n === w)
              const ly = y + 4 + (slot - (near.length - 1) / 2) * 13
              const hl = analogy?.includes(w) || result?.ranked[0].w === w
              return (
                <g key={w}>
                  <circle cx={x} cy={y} r={4} fill={hl ? 'var(--primary)' : 'currentColor'} opacity={hl ? 1 : 0.55} />
                  <text x={x + 7} y={ly} className={cn('text-[12px]', hl ? 'fill-foreground font-semibold' : 'fill-muted-foreground')}>
                    {w}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
        <div className="space-y-4">
          <div className="text-sm font-medium">Vector arithmetic</div>
          <div className="flex flex-col gap-2">
            {ANALOGIES.map((a) => (
              <Button
                key={a.join()}
                variant={analogy === a ? 'default' : 'outline'}
                size="sm"
                className="justify-start font-mono"
                onClick={() => setAnalogy(a)}
              >
                {a[0]} − {a[1]} + {a[2]}
              </Button>
            ))}
          </div>
          {result && (
            <div className="space-y-2">
              <VectorStrip values={result.v} cell="h-6 flex-1" />
              <div className="text-xs text-muted-foreground">Nearest words by cosine similarity:</div>
              {result.ranked.slice(0, 4).map((r, i) => (
                <div key={r.w} className="flex items-center gap-2 font-mono text-sm">
                  <span className={cn('w-20', i === 0 && 'font-bold text-primary')}>{r.w}</span>
                  <div className="h-2 rounded-full bg-primary/70" style={{ width: `${Math.max(0, r.sim) * 120}px` }} />
                  <span className="text-muted-foreground">{r.sim.toFixed(3)}</span>
                </div>
              ))}
            </div>
          )}
          <Tex block>{'\\cos(a,b) = \\frac{a \\cdot b}{\\lVert a \\rVert\\, \\lVert b \\rVert}'}</Tex>
        </div>
      </CardContent>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>word</TableHead>
              {DIMS.map((d) => (
                <TableHead key={d} className="text-right">
                  {d}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(WORDS)
              .slice(0, 6)
              .map(([w, v]) => (
                <TableRow key={w}>
                  <TableCell className="font-mono">{w}</TableCell>
                  {v.map((x, i) => (
                    <TableCell key={i} className="text-right font-mono tabular-nums">
                      {x.toFixed(2)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function RopeDemo() {
  const [pos, setPos] = useState(3)
  const freqs = [1, 0.3, 0.1, 0.03]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rotary positions: clocks spinning at different speeds</CardTitle>
        <CardDescription>
          Each dial is one pair of dimensions. Fast dials distinguish neighbouring positions; slow dials track
          long-range position. Because both query and key are rotated, their dot product depends only on the{' '}
          <em>distance</em> between them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Control label="Token position m" value={pos}>
          <Slider value={[pos]} min={0} max={64} step={1} onValueChange={(v) => setPos(sliderValue(v))} />
        </Control>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {freqs.map((f, k) => {
            const ang = pos * f
            const x = 50 + 36 * Math.cos(ang)
            const y = 50 - 36 * Math.sin(ang)
            return (
              <div key={k} className="flex flex-col items-center gap-1">
                <svg viewBox="0 0 100 100" className="size-28">
                  <circle cx={50} cy={50} r={42} fill="none" stroke="currentColor" opacity={0.15} strokeWidth={2} />
                  <line x1={50} y1={50} x2={86} y2={50} stroke="currentColor" opacity={0.2} strokeDasharray="3 3" />
                  <line x1={50} y1={50} x2={x} y2={y} stroke="var(--primary)" strokeWidth={4} strokeLinecap="round" />
                  <circle cx={50} cy={50} r={3} fill="var(--primary)" />
                </svg>
                <div className="font-mono text-xs text-muted-foreground">
                  pair {k} · θ={f} · {(((((ang * 180) / Math.PI) % 360) + 360) % 360).toFixed(0)}°
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
