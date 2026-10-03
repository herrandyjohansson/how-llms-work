import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Callout, H3, Prose, Section } from '@/components/layout'
import { Tex } from '@/components/tex'
import { dot, softmax } from '@/lib/math'
import { cn } from '@/lib/utils'

export function Attention() {
  return (
    <Section
      id="attention"
      number={4}
      title="Attention: how tokens talk to each other"
      kicker="Embeddings give each token a meaning in isolation. But “bank” means something different in “river bank” and “bank account”. Attention is the mechanism that lets every token look at the tokens before it and pull in the context it needs."
    >
      <Prose>
        <p>
          Consider the sentence <em>"The animal didn’t cross the street because it was too tired."</em> What does{' '}
          <strong>it</strong> refer to? You know instantly it’s the animal. Now change one word:{' '}
          <em>"…because it was too wide."</em> Now <strong>it</strong> is the street. To process "it" correctly, the
          model must look back and decide which earlier words are relevant. That’s exactly what an{' '}
          <strong>attention head</strong> does.
        </p>
      </Prose>
      <AttentionPatterns />

      <H3>Query, Key, Value</H3>
      <Prose>
        <p>
          Attention is often explained with a library analogy. From each token’s current vector{' '}
          <Tex>{'x_i'}</Tex>, the model computes three new vectors using three learned weight matrices:
        </p>
      </Prose>
      <div className="grid max-w-4xl gap-4 md:grid-cols-3">
        {[
          { k: 'Query', f: 'q_i = x_i W_Q', d: '“What am I looking for?” For “it”: something like “a noun this pronoun could refer to”.' },
          { k: 'Key', f: 'k_j = x_j W_K', d: '“What do I contain / offer?” For “animal”: “I’m an animate noun, a possible referent”.' },
          { k: 'Value', f: 'v_j = x_j W_V', d: '“If you pick me, here’s the information I hand over.” The content that gets copied.' },
        ].map((c) => (
          <Card key={c.k} size="sm">
            <CardHeader>
              <CardTitle>{c.k}</CardTitle>
              <Tex>{c.f}</Tex>
            </CardHeader>
            <CardContent className="text-muted-foreground">{c.d}</CardContent>
          </Card>
        ))}
      </div>
      <Prose>
        <p>
          Each token’s query is compared (dot product) with every earlier token’s key. A high score means "this is
          relevant to me". The scores are turned into weights with softmax, and the token’s output is the weighted
          average of the values. In one formula, the core of every transformer:
        </p>
      </Prose>
      <Tex block className="text-lg">{'\\text{Attention}(Q,K,V) = \\operatorname{softmax}\\!\\left(\\frac{QK^{\\top}}{\\sqrt{d_k}} + M\\right) V'}</Tex>
      <Prose>
        <p>
          <Tex>{'\\sqrt{d_k}'}</Tex> keeps the scores in a reasonable range as vectors get longer, and{' '}
          <Tex>{'M'}</Tex> is the <strong>causal mask</strong>: <Tex>{'-\\infty'}</Tex> for every future position, so
          after softmax a token can never peek at what comes after it. Step through the calculation with real numbers:
        </p>
      </Prose>
      <WorkedExample />

      <H3>Many heads, many layers</H3>
      <Prose>
        <p>
          One attention head can only learn one kind of "looking". So each layer runs many heads{' '}
          <strong>in parallel</strong> (often 32 to 128), each with its own <Tex>{'W_Q, W_K, W_V'}</Tex>. Some heads track
          grammar, some track coreference, some copy previous text, some find matching brackets in code. Their outputs
          are concatenated and mixed by one more matrix:
        </p>
      </Prose>
      <Tex block>{'\\text{MultiHead}(X) = \\operatorname{Concat}(\\text{head}_1, \\ldots, \\text{head}_h)\\, W_O'}</Tex>
      <Prose>
        <p>
          Interpretability research has found specific, reusable circuits. A famous one is the{' '}
          <strong>induction head</strong> (described by Anthropic researchers in 2022): when the text contains "…Harry
          Potter … Harry", one head finds the earlier "Harry", looks at what came right after it, and boosts "Potter"
          as the next token. This simple copy-the-pattern trick is a big part of how models learn from examples in
          their prompt (<em>in-context learning</em>).
        </p>
      </Prose>

      <Callout kind="note" title="Why long context is expensive">
        Every token attends to every earlier token, so the work grows with the <em>square</em> of the sequence
        length: 2× more tokens means roughly 4× more attention computation. Supporting context windows of hundreds of
        thousands of tokens, as Claude does, requires heavy engineering (efficient attention kernels, caching, and
        other techniques that labs mostly don’t publish).
      </Callout>
    </Section>
  )
}

// ---------- Attention patterns on a real sentence ----------

const words = (end: string) =>
  ['The', 'animal', "didn’t", 'cross', 'the', 'street', 'because', 'it', 'was', 'too', end].map((w) => w)

type Head = { name: string; desc: string; score: (i: number, j: number, tired: boolean) => number }

const HEADS: Head[] = [
  {
    name: 'Coreference head',
    desc: 'Links pronouns and adjectives back to the noun they describe. Watch the row for “it”, then flip the last word.',
    score: (i, j, tired) => {
      if (i === 7) return j === (tired ? 1 : 5) ? 6 : j === (tired ? 5 : 1) ? 2.5 : 0
      if (i === 10) return j === 7 ? 4 : j === (tired ? 1 : 5) ? 4.5 : 0
      if (i === 8 || i === 9) return j === 7 ? 3 : 0
      return j === i ? 1.5 : 0
    },
  },
  {
    name: 'Previous-token head',
    desc: 'Almost every token attends to the token right before it. Simple, but a key building block for other circuits.',
    score: (i, j) => (j === i - 1 ? 5 : j === i ? 1.5 : 0),
  },
  {
    name: 'Broad / “sink” head',
    desc: 'Spreads attention widely and dumps leftover attention on the first token. Real models have many heads like this, a kind of “no-op” default.',
    score: (_i, j) => (j === 0 ? 3 : 0.6),
  },
]

function AttentionPatterns() {
  const [tired, setTired] = useState(true)
  const [head, setHead] = useState('0')
  const [query, setQuery] = useState(7)
  const ws = words(tired ? 'tired' : 'wide')
  const n = ws.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attention patterns (illustrative)</CardTitle>
        <CardDescription>
          Rows = the token doing the looking (query). Columns = tokens being looked at (keys). Each row sums to 100%.
          Grey triangle = masked future. Click a row.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Tabs value={head} onValueChange={(v) => setHead(String(v))}>
            <TabsList>
              {HEADS.map((h, i) => (
                <TabsTrigger key={h.name} value={String(i)}>
                  {h.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <label className="flex items-center gap-2 text-sm">
            <span className={cn(!tired && 'font-semibold text-primary')}>wide</span>
            <Switch checked={tired} onCheckedChange={setTired} />
            <span className={cn(tired && 'font-semibold text-primary')}>tired</span>
          </label>
        </div>
        <p className="text-sm text-muted-foreground">{HEADS[Number(head)].desc}</p>
        {(() => {
          const h = HEADS[Number(head)]
          const W = ws.map((_, i) =>
            softmax(ws.map((_, j) => (j <= i ? h.score(i, j, tired) : -Infinity))),
          )
          return (
            <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
              <div className="overflow-x-auto">
                <table className="border-separate border-spacing-0.5 font-mono text-xs">
                  <thead>
                    <tr>
                      <th />
                      {ws.map((w, j) => (
                        <th key={j} className="h-20 align-bottom">
                          <div className="w-7 origin-bottom-left translate-x-3.5 -rotate-60 text-left font-normal whitespace-nowrap text-muted-foreground">
                            {w}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ws.map((w, i) => (
                      <tr key={i} onClick={() => setQuery(i)} className="cursor-pointer">
                        <td className={cn('pr-2 text-right', query === i && 'font-bold text-primary')}>{w}</td>
                        {ws.map((_, j) => (
                          <td
                            key={j}
                            title={j <= i ? `${(W[i][j] * 100).toFixed(1)}%` : 'masked'}
                            className={cn('size-7 rounded-[3px]', j > i && 'bg-muted', query === i && 'ring-1 ring-primary/60')}
                            style={j <= i ? { backgroundColor: `color-mix(in oklch, var(--primary) ${Math.round(W[i][j] * 100)}%, transparent)` } : undefined}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3">
                <div className="text-sm">
                  Where does <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono font-semibold">{ws[query]}</span> look?
                </div>
                <div className="flex flex-wrap gap-x-1 gap-y-2 text-lg leading-loose">
                  {ws.map((w, j) => (
                    <span
                      key={j}
                      className={cn('rounded px-1', j === query && 'underline decoration-primary decoration-2 underline-offset-4', j > query && 'opacity-25')}
                      style={j <= query ? { backgroundColor: `color-mix(in oklch, var(--primary) ${Math.round(W[query][j] * 85)}%, transparent)` } : undefined}
                    >
                      {w}
                    </span>
                  ))}
                </div>
                <div className="space-y-1">
                  {W[query]
                    .map((p, j) => ({ p, j }))
                    .filter((x) => x.j <= query)
                    .sort((a, b) => b.p - a.p)
                    .slice(0, 4)
                    .map(({ p, j }) => (
                      <div key={j} className="flex items-center gap-2 font-mono text-sm">
                        <span className="w-16 text-right">{ws[j]}</span>
                        <div className="h-2.5 rounded-full bg-primary" style={{ width: `${p * 200}px` }} />
                        <span className="text-muted-foreground">{(p * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: n }, (_, i) => (
                    <Button key={i} size="xs" variant={i === query ? 'default' : 'ghost'} onClick={() => setQuery(i)}>
                      {ws[i]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}

// ---------- Worked numeric example ----------

const EX_TOKENS = ['I', 'love', 'cute', 'cats']
// Pretend these are already the result of x·W_Q, x·W_K, x·W_V (d_k = 4).
const Q = [
  [1.0, 0.0, 0.5, 0.2],
  [0.3, 1.2, 0.0, 0.4],
  [0.2, 0.1, 1.1, 0.3],
  [0.9, 0.4, 1.3, 0.1],
]
const K = [
  [1.1, 0.2, 0.0, 0.1],
  [0.0, 1.0, 0.3, 0.6],
  [0.4, 0.0, 1.2, 0.2],
  [0.6, 0.3, 1.0, 0.0],
]
const V = [
  [1.0, 0.0, 0.0, 0.2],
  [0.0, 1.0, 0.0, 0.5],
  [0.0, 0.0, 1.0, 0.1],
  [0.5, 0.2, 0.8, 0.9],
]

function Matrix({
  data,
  rows,
  cols,
  heat,
  digits = 2,
  highlight,
}: {
  data: number[][]
  rows: string[]
  cols: string[]
  heat?: boolean
  digits?: number
  highlight?: number
}) {
  const finite = data.flat().filter(Number.isFinite)
  const max = Math.max(...finite.map(Math.abs), 1e-9)
  return (
    <table className="border-separate border-spacing-1 font-mono text-xs md:text-sm">
      <thead>
        <tr>
          <th />
          {cols.map((c) => (
            <th key={c} className="px-1 font-normal text-muted-foreground">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((r, i) => (
          <tr key={i} className={cn(highlight !== undefined && highlight !== i && 'opacity-40')}>
            <td className="pr-1 text-right text-muted-foreground">{rows[i]}</td>
            {r.map((v, j) => (
              <td
                key={j}
                className={cn('min-w-12 rounded px-1.5 py-1 text-right tabular-nums', !Number.isFinite(v) ? 'bg-muted text-muted-foreground' : 'bg-muted/40')}
                style={heat && Number.isFinite(v) ? { backgroundColor: `color-mix(in oklch, var(--primary) ${Math.round((Math.abs(v) / max) * 70)}%, transparent)` } : undefined}
              >
                {Number.isFinite(v) ? v.toFixed(digits) : '−∞'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function WorkedExample() {
  const [row, setRow] = useState(3)
  const calc = useMemo(() => {
    const dk = Q[0].length
    const scores = Q.map((q) => K.map((k) => dot(q, k)))
    const scaled = scores.map((r) => r.map((s) => s / Math.sqrt(dk)))
    const masked = scaled.map((r, i) => r.map((s, j) => (j <= i ? s : -Infinity)))
    const weights = masked.map((r) => softmax(r))
    const out = weights.map((w) => V[0].map((_, d) => w.reduce((s, wj, j) => s + wj * V[j][d], 0)))
    return { scores, scaled, masked, weights, out, dk }
  }, [])
  const dims = ['d1', 'd2', 'd3', 'd4']
  const t = EX_TOKENS

  const steps = [
    {
      v: '0',
      label: '0 · Q, K, V',
      tex: 'Q = XW_Q,\\; K = XW_K,\\; V = XW_V',
      body: (
        <div className="flex flex-wrap gap-6">
          <div><div className="mb-1 text-sm font-medium">Q</div><Matrix data={Q} rows={t} cols={dims} /></div>
          <div><div className="mb-1 text-sm font-medium">K</div><Matrix data={K} rows={t} cols={dims} /></div>
          <div><div className="mb-1 text-sm font-medium">V</div><Matrix data={V} rows={t} cols={dims} /></div>
        </div>
      ),
      note: 'Four tokens, each already projected into a 4-dimensional query, key and value. (Real heads use 64–128 dimensions.)',
    },
    {
      v: '1',
      label: '1 · Scores',
      tex: 'S = QK^{\\top}',
      body: <Matrix data={calc.scores} rows={t} cols={t} heat highlight={row} />,
      note: `Row "${t[row]}": dot product of its query with each key. Bigger = more relevant.`,
    },
    {
      v: '2',
      label: '2 · Scale',
      tex: `S' = S / \\sqrt{d_k} = S / \\sqrt{${calc.dk}}`,
      body: <Matrix data={calc.scaled} rows={t} cols={t} heat highlight={row} />,
      note: 'Divide by √d_k so that large vectors don’t produce huge scores that make softmax saturate.',
    },
    {
      v: '3',
      label: '3 · Mask',
      tex: "S'' = S' + M,\\quad M_{ij} = \\begin{cases} 0 & j \\le i \\\\ -\\infty & j > i \\end{cases}",
      body: <Matrix data={calc.masked} rows={t} cols={t} heat highlight={row} />,
      note: 'The causal mask: a token may only look at itself and the past. Future positions become −∞.',
    },
    {
      v: '4',
      label: '4 · Softmax',
      tex: "A_{ij} = \\frac{e^{S''_{ij}}}{\\sum_{j'} e^{S''_{ij'}}}",
      body: <Matrix data={calc.weights} rows={t} cols={t} heat highlight={row} />,
      note: `Each row becomes a probability distribution. "${t[row]}" spends ${calc.weights[row].map((w, j) => `${(w * 100).toFixed(0)}% on "${t[j]}"`).filter((_, j) => j <= row).join(', ')}.`,
    },
    {
      v: '5',
      label: '5 · Mix values',
      tex: 'O = AV',
      body: (
        <div className="flex flex-wrap items-center gap-4">
          <Matrix data={calc.weights} rows={t} cols={t} heat highlight={row} />
          <span className="text-2xl text-muted-foreground">×</span>
          <Matrix data={V} rows={t} cols={dims} />
          <span className="text-2xl text-muted-foreground">=</span>
          <Matrix data={calc.out} rows={t} cols={dims} heat highlight={row} />
        </div>
      ),
      note: `"${t[row]}"'s new vector is a blend of the value vectors, weighted by attention. This output is added back into the token’s representation.`,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Worked example: one attention head, computed live</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          Focus on row:
          {t.map((w, i) => (
            <Button key={w} size="xs" variant={row === i ? 'default' : 'outline'} onClick={() => setRow(i)}>
              {w}
            </Button>
          ))}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="0">
          <TabsList className="h-auto! flex-wrap">
            {steps.map((s) => (
              <TabsTrigger key={s.v} value={s.v}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {steps.map((s) => (
            <TabsContent key={s.v} value={s.v} className="space-y-4 pt-4">
              <Tex block>{s.tex}</Tex>
              <div className="overflow-x-auto">{s.body}</div>
              <p className="text-sm text-muted-foreground">{s.note}</p>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
