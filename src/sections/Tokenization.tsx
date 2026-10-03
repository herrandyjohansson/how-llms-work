import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Callout, Control, H3, Prose, Section, Stat, TokenChip, visibleWhitespace } from '@/components/layout'
import { sliderValue } from '@/lib/math'
import { tokenize, useTokenizer, type Tok } from '@/lib/tokenizer'

const presets: Record<string, string> = {
  English: 'The quick brown fox jumps over the lazy dog. Tokenization is surprisingly important!',
  Swedish: 'Jag skulle vilja beställa en kanelbulle och en stor kopp kaffe, tack.',
  Code: 'function fibonacci(n) {\n  return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);\n}',
  Numbers: 'In 2024, 1234567 + 89 = 1234656 and π ≈ 3.14159',
  Emoji: 'I love 🍕 and 🐈‍⬛! こんにちは世界',
  Strawberry: 'How many r letters are in the word strawberry?',
}

export function Tokenization() {
  return (
    <Section
      id="tokenization"
      number={2}
      title="Tokenization: from characters to tokens"
      kicker="A neural network can only do arithmetic on numbers. The first job is to turn text into a sequence of integers, and the way we chop the text up has surprising consequences."
    >
      <Prose>
        <p>
          There are three obvious ways to turn text into units. Each has a fatal flaw on its own, and modern LLMs use a
          compromise called <strong>subword tokenization</strong>.
        </p>
      </Prose>
      <Granularity />

      <H3>Try it: a real tokenizer</H3>
      <Prose>
        <p>
          Below is a real byte-level BPE tokenizer running in your browser (the open <code>cl100k_base</code>{' '}
          vocabulary with ~100k tokens). Claude uses its own tokenizer built on the same principles; its exact splits
          and IDs differ, but the behaviour you see here is representative. Type anything.
        </p>
      </Prose>
      <Playground />

      <H3>How the vocabulary is built: Byte Pair Encoding (BPE)</H3>
      <Prose>
        <p>
          Nobody hand-writes the ~100k tokens. They are <strong>learned from data</strong> before the model is
          trained, using a simple greedy algorithm:
        </p>
        <ol>
          <li>Start with a vocabulary of single characters (in practice: all 256 possible bytes).</li>
          <li>Count every pair of adjacent symbols in a huge training corpus.</li>
          <li>Merge the most frequent pair into one new symbol and add it to the vocabulary.</li>
          <li>Repeat until the vocabulary reaches the target size (e.g. 100,000).</li>
        </ol>
        <p>
          The result: frequent strings like <code>·the</code> or <code>ing</code> become single tokens, while rare
          words are built from smaller pieces. Drag the slider to run the algorithm on a tiny corpus.
        </p>
      </Prose>
      <BpeDemo />

      <H3>Bytes, Unicode and why emoji are expensive</H3>
      <Prose>
        <p>
          Modern tokenizers work on <strong>UTF-8 bytes</strong>, not characters. This means any text in any language,
          and even binary garbage, can be tokenized: there is never an "unknown word". The cost is that text unlike
          the tokenizer's training data gets split into many small pieces. An English word is often 1 token; the same
          idea in Japanese or a single emoji can take several, because each character is 3 to 4 bytes and fewer of those
          byte combinations were merged during BPE training.
        </p>
      </Prose>
      <ByteView />

      <Callout kind="tip" title="Lecture hook: why can't an LLM count the r's in “strawberry”?">
        The model doesn't see <code>s-t-r-a-w-b-e-r-r-y</code>; it sees opaque integers. In this tokenizer, 'strawberry' mid-sentence (with its leading space) and at the start of a line are tokenized differently: <StrawberrySplit />.
        Knowing how many r's hide inside a token requires the model to have memorised that token's spelling from
        indirect evidence during training. Spelling, counting letters,
        reversing words and some arithmetic are hard for LLMs <em>because of tokenization</em>, not because the
        model is "dumb". (Newer models handle these much better, often by reasoning step by step and spelling the
        word out, turning each letter into its own token.)
      </Callout>

      <Prose>
        <p>
          <strong>Special tokens.</strong> Besides text pieces, the vocabulary contains reserved tokens that never
          appear in normal text, for example markers for "start of a human turn", "start of the assistant's turn", or
          "end of text". When the model emits the end-of-turn token, generation stops. We'll see how a chat
          conversation is laid out with these markers in Part 10.
        </p>
        <p>
          <strong>Why it matters in practice.</strong> Everything about an LLM is measured in tokens: the context
          window (how much it can "see" at once), pricing, rate limits and speed. As a rough rule of thumb, one token
          is about ¾ of an English word, or about 3 to 4 characters. Anthropic's API has a token-counting endpoint
          if you need exact numbers for Claude.
        </p>
      </Prose>
    </Section>
  )
}

function Granularity() {
  const enc = useTokenizer()
  const text = 'Tokenization is unbelievably useful!'
  const chars = [...text]
  const words = text.split(/(?=\s)|(?<=\s)(?=\S)|(?=[!?.,])/).filter((w) => w.trim() !== '' || w === ' ')
  const subwords = enc ? tokenize(enc, text) : []

  const rows = [
    {
      v: 'char',
      label: 'Characters',
      units: chars.map((c) => ({ text: c })),
      pro: 'Tiny vocabulary (~100s). Never sees an unknown word.',
      con: 'Sequences become very long. The model must learn spelling from scratch, and attention cost grows with the square of length.',
    },
    {
      v: 'word',
      label: 'Words',
      units: words.map((w) => ({ text: w })),
      pro: 'Short sequences; each unit is meaningful.',
      con: 'Vocabulary explodes (every name, typo, inflection, compound). Unseen words become [UNKNOWN].',
    },
    {
      v: 'sub',
      label: 'Subwords (BPE)',
      units: subwords,
      pro: 'Common words are 1 token, rare words split into reusable parts. Fixed vocabulary of ~100k–200k.',
      con: 'Splits are statistical, not linguistic, which causes odd quirks (spelling, counting, numbers).',
    },
  ]
  return (
    <Tabs defaultValue="sub">
      <TabsList>
        {rows.map((r) => (
          <TabsTrigger key={r.v} value={r.v}>
            {r.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {rows.map((r) => (
        <TabsContent key={r.v} value={r.v}>
          <Card>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {r.units.map((u, i) => (
                  <TokenChip key={i} text={u.text} index={i} />
                ))}
              </div>
              <div className="font-mono text-sm text-muted-foreground">{r.units.length} units</div>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <span className="font-medium">+ </span>
                  {r.pro}
                </div>
                <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3">
                  <span className="font-medium">− </span>
                  {r.con}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  )
}

function Playground() {
  const enc = useTokenizer()
  const [text, setText] = useState(presets.English)
  const [showIds, setShowIds] = useState(true)
  const [hover, setHover] = useState<number | null>(null)
  const toks: Tok[] = useMemo(() => (enc ? tokenize(enc, text) : []), [enc, text])
  const bytes = new TextEncoder().encode(text).length
  const hovered = hover !== null ? toks[hover] : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tokenizer playground</CardTitle>
        <CardDescription>Hover a token to inspect it. · marks a space, ↵ a newline.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {Object.entries(presets).map(([k, v]) => (
            <Button key={k} size="sm" variant={text === v ? 'default' : 'outline'} onClick={() => setText(v)}>
              {k}
            </Button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Characters" value={[...text].length} />
          <Stat label="UTF-8 bytes" value={bytes} />
          <Stat label="Tokens" value={enc ? toks.length : '…'} />
          <Stat label="Chars / token" value={toks.length ? ([...text].length / toks.length).toFixed(2) : '–'} />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Switch checked={showIds} onCheckedChange={setShowIds} id="ids" />
          <label htmlFor="ids">Show token IDs</label>
        </div>
        <div className="min-h-24 rounded-lg border bg-muted/30 p-3">
          {!enc && <span className="text-sm text-muted-foreground">Loading tokenizer vocabulary…</span>}
          <div className="flex flex-wrap gap-1">
            {toks.map((t, i) => (
              <TokenChip
                key={i}
                text={t.text}
                id={showIds ? t.id : undefined}
                index={i}
                active={hover === i}
                onHover={setHover}
              />
            ))}
          </div>
        </div>
        <div className="h-10 font-mono text-sm text-muted-foreground">
          {hovered ? (
            <>
              token #{hover} → id <span className="text-foreground">{hovered.id}</span> · text "
              <span className="text-foreground">{visibleWhitespace(hovered.text)}</span>" · bytes{' '}
              {enc &&
                [...enc.decode([hovered.id]).split('')]
                  .flatMap((c) => [...new TextEncoder().encode(c)])
                  .map((b) => b.toString(16).padStart(2, '0'))
                  .join(' ')}
              {hovered.text.includes('�') && ' · (partial UTF-8 character: this token is only some bytes of a symbol)'}
            </>
          ) : (
            'Hover a token…'
          )}
        </div>
        <div className="font-mono text-xs break-all text-muted-foreground">
          IDs: [{toks.map((t) => t.id).join(', ')}]
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Toy BPE ----------

interface BpeState {
  words: { symbols: string[]; count: number }[]
  merges: string[]
  pairs: { pair: [string, string]; count: number }[]
}

function runBpe(corpus: string, maxMerges: number): BpeState[] {
  const freq = new Map<string, number>()
  for (const w of corpus.toLowerCase().split(/\s+/).filter(Boolean)) freq.set(w, (freq.get(w) ?? 0) + 1)
  let words = [...freq].map(([w, count]) => ({ symbols: [...w, '_'], count }))
  const merges: string[] = []
  const states: BpeState[] = []

  for (let step = 0; step <= maxMerges; step++) {
    const counts = new Map<string, number>()
    for (const w of words)
      for (let i = 0; i < w.symbols.length - 1; i++) {
        const k = w.symbols[i] + '\u0000' + w.symbols[i + 1]
        counts.set(k, (counts.get(k) ?? 0) + w.count)
      }
    const pairs = [...counts]
      .map(([k, count]) => ({ pair: k.split('\u0000') as [string, string], count }))
      .sort((a, b) => b.count - a.count || a.pair.join('').localeCompare(b.pair.join('')))
    states.push({ words: words.map((w) => ({ ...w, symbols: [...w.symbols] })), merges: [...merges], pairs })
    if (!pairs.length || step === maxMerges) break
    const [a, b] = pairs[0].pair
    merges.push(a + b)
    words = words.map((w) => {
      const out: string[] = []
      for (let i = 0; i < w.symbols.length; i++) {
        if (w.symbols[i] === a && w.symbols[i + 1] === b) {
          out.push(a + b)
          i++
        } else out.push(w.symbols[i])
      }
      return { ...w, symbols: out }
    })
  }
  return states
}

const BPE_CORPUS =
  'low low low low low lower lower newest newest newest newest newest newest widest widest widest new new lowest'

function BpeDemo() {
  const [corpus, setCorpus] = useState(BPE_CORPUS)
  const states = useMemo(() => runBpe(corpus, 14), [corpus])
  const [step, setStep] = useState(0)
  const s = states[Math.min(step, states.length - 1)]
  const baseChars = new Set(states[0].words.flatMap((w) => w.symbols))

  return (
    <Card>
      <CardHeader>
        <CardTitle>BPE, step by step</CardTitle>
        <CardDescription>
          "_" marks the end of a word. Each step merges the most frequent adjacent pair.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <input
          value={corpus}
          onChange={(e) => {
            setCorpus(e.target.value)
            setStep(0)
          }}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Control label="Merges performed" value={`${Math.min(step, states.length - 1)} / ${states.length - 1}`}>
          <Slider value={[step]} min={0} max={states.length - 1} step={1} onValueChange={(v) => setStep(sliderValue(v))} />
        </Control>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-medium">Corpus, as currently segmented</div>
              <div className="space-y-1.5">
                {s.words.map((w) => (
                  <div key={w.symbols.join('')} className="flex items-center gap-3">
                    <span className="w-10 text-right font-mono text-xs text-muted-foreground">×{w.count}</span>
                    <div className="flex flex-wrap gap-1">
                      {w.symbols.map((sym, i) => (
                        <span
                          key={i}
                          className={
                            'rounded px-1.5 py-0.5 font-mono text-sm ' +
                            (sym.length > 1 ? 'bg-primary/20 ring-1 ring-primary/40' : 'bg-muted')
                          }
                        >
                          {sym}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Vocabulary</div>
              <div className="flex flex-wrap gap-1">
                {[...baseChars].sort().map((c) => (
                  <Badge key={c} variant="outline" className="font-mono">
                    {c}
                  </Badge>
                ))}
                {s.merges.map((m, i) => (
                  <Badge key={m + i} className="font-mono">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">Pair counts → next merge</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pair</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.pairs.slice(0, 7).map((p, i) => (
                  <TableRow key={p.pair.join('+')} className={i === 0 ? 'bg-primary/10 font-medium' : ''}>
                    <TableCell className="font-mono">
                      {p.pair[0]} + {p.pair[1]}
                      {i === 0 && <span className="ml-2 text-primary">← merge</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono">{p.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StrawberrySplit() {
  const enc = useTokenizer()
  if (!enc) return <code>…</code>
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {[' strawberry', 'strawberry'].map((word, w) => (
        <span key={word} className="inline-flex gap-0.5">
          {w === 1 && <span className="px-1 text-muted-foreground">vs</span>}
          {tokenize(enc, word).map((t, i) => (
            <TokenChip key={i} text={t.text} id={t.id} index={i + w * 3} />
          ))}
        </span>
      ))}
    </span>
  )
}

function ByteView() {
  const enc = useTokenizer()
  const samples = ['hello', 'hej', 'ö', 'π', '世', '🍕', '🐈‍⬛']
  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Text</TableHead>
              <TableHead>Unicode code points</TableHead>
              <TableHead>UTF-8 bytes</TableHead>
              <TableHead className="text-right">Tokens (cl100k)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {samples.map((s) => (
              <TableRow key={s}>
                <TableCell className="text-lg">{s}</TableCell>
                <TableCell className="font-mono text-xs">
                  {[...s].map((c) => 'U+' + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' ')}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {[...new TextEncoder().encode(s)].map((b) => b.toString(16).padStart(2, '0')).join(' ')}
                </TableCell>
                <TableCell className="text-right font-mono">{enc ? enc.encode(s).length : '…'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
