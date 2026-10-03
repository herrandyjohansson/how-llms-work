import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Callout, Control, H3, Prose, Section, Stat } from '@/components/layout'
import { Tex } from '@/components/tex'
import { sliderValue } from '@/lib/math'
import { cn } from '@/lib/utils'

type Part = 'stream' | 'norm1' | 'attn' | 'add1' | 'norm2' | 'mlp' | 'add2'

const PARTS: Record<Part, { title: string; tex?: string; body: string }> = {
  stream: {
    title: 'The residual stream',
    tex: 'x^{(\\ell+1)} = x^{(\\ell)} + \\text{Attn}(\\cdot) + \\text{MLP}(\\cdot)',
    body: 'The vertical line is the most important part of the design. Each token has one vector that flows straight up through all the layers. Layers never replace it; they only read from it and add their contribution back. Think of it as a shared whiteboard that each layer reads, scribbles a note on, and passes along. This also makes very deep networks trainable, because the signal (and the gradient) has a direct path through.',
  },
  norm1: {
    title: 'Normalisation (LayerNorm / RMSNorm)',
    tex: '\\text{RMSNorm}(x) = \\frac{x}{\\sqrt{\\tfrac{1}{d}\\sum_i x_i^2 + \\epsilon}} \\odot g',
    body: 'Before each sub-layer reads the stream, the vector is rescaled to a standard size. This keeps numbers from exploding or vanishing as they pass through dozens of layers, which makes training stable.',
  },
  attn: {
    title: 'Multi-head attention',
    tex: '\\operatorname{softmax}\\!\\left(\\tfrac{QK^\\top}{\\sqrt{d_k}} + M\\right)V',
    body: 'The only place where tokens exchange information (Part 4). Each head moves information from earlier positions into the current one: “it” pulls in information about “animal”, a closing bracket finds its opening bracket.',
  },
  add1: {
    title: 'Add (residual connection)',
    body: 'The attention output is added to the stream, not substituted. The token keeps everything it knew and gains new context.',
  },
  norm2: {
    title: 'Normalisation',
    body: 'Same as before: rescale the stream before the MLP reads it.',
  },
  mlp: {
    title: 'MLP (feed-forward network)',
    tex: '\\text{MLP}(x) = W_2\\, \\sigma(W_1 x),\\quad W_1 \\in \\mathbb{R}^{4d \\times d}',
    body: 'Works on each token separately: expand the vector to ~4× its width, apply a non-linearity (GELU or SwiGLU), and project back down. About two thirds of the model\'s parameters live here. Research suggests MLPs act like a huge key–value memory: they recognise patterns in the stream (“Eiffel Tower … located in”) and write associated facts back (“Paris”).',
  },
  add2: {
    title: 'Add (residual connection)',
    body: 'The MLP output is added to the stream. The updated vector is the input to the next block. Repeat for every layer.',
  },
}

export function Transformer() {
  return (
    <Section
      id="transformer"
      number={5}
      title="The transformer block, stacked many times"
      kicker="Attention is one half of a transformer block. Add a small neural network, some normalisation and the crucial “residual stream”, then stack that block dozens of times. That's the whole model."
    >
      <BlockDiagram />

      <H3>What happens as you go deeper?</H3>
      <Prose>
        <p>
          Researchers can peek at the residual stream at any layer and ask "if the model had to predict right now,
          what would it say?" (a technique called the <em>logit lens</em>). A typical picture emerges: early layers
          deal with surface features of the current token, middle layers build up concepts and relationships, late
          layers turn that into a concrete prediction. Drag through the layers for the prompt below.
        </p>
      </Prose>
      <LogitLens />

      <H3>Where do the billions of parameters come from?</H3>
      <Prose>
        <p>
          Almost all of a model's parameters are entries in weight matrices: four attention matrices (
          <Tex>{'W_Q, W_K, W_V, W_O'}</Tex>, each <Tex>{'d \\times d'}</Tex>) and two MLP matrices (each{' '}
          <Tex>{'d \\times 4d'}</Tex>) per layer, plus the embedding table. That gives a handy approximation:
        </p>
      </Prose>
      <Tex block>{'N_{\\text{params}} \\approx \\underbrace{12 \\cdot L \\cdot d^2}_{\\text{transformer blocks}} + \\underbrace{|V| \\cdot d}_{\\text{embeddings}}'}</Tex>
      <ParamCalc />

      <H3>Looking inside Claude: interpretability</H3>
      <Prose>
        <p>
          Anthropic invests heavily in <strong>mechanistic interpretability</strong>: reverse-engineering what the
          billions of numbers actually compute. Some public highlights:
        </p>
      </Prose>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            t: 'Features & “Golden Gate Claude”',
            y: '2024 · Scaling Monosemanticity',
            d: 'Using sparse autoencoders (dictionary learning), researchers extracted millions of interpretable “features” from Claude 3 Sonnet\'s residual stream: directions for concepts like the Golden Gate Bridge, code bugs, sycophancy, or deception. Artificially amplifying the Golden Gate Bridge feature produced a model that steered every conversation to the bridge, showing the features are causal, not just correlations.',
          },
          {
            t: 'Multi-step reasoning inside one forward pass',
            y: '2025 · On the Biology of a LLM',
            d: 'Asked “the capital of the state containing Dallas”, Claude 3.5 Haiku internally activates a “Texas” representation and then uses it to reach “Austin”: a genuine intermediate step, computed inside the layers without writing it out.',
          },
          {
            t: 'Planning ahead',
            y: '2025 · Circuit tracing',
            d: 'When writing rhyming poetry, the model picks candidate rhyme words before it starts writing the line, then writes a line that lands on that word. So even though output is produced one token at a time, the internal computation can plan several tokens ahead.',
          },
          {
            t: 'Shared concepts across languages',
            y: '2025 · Circuit tracing',
            d: 'The concept of “small” or “opposite” uses largely the same internal features whether the prompt is in English, French or Chinese, with language-specific circuitry mainly at the input and output ends. This helps explain why knowledge learned in one language transfers to others.',
          },
        ].map((c) => (
          <Card key={c.t}>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">
                {c.y}
              </Badge>
              <CardTitle className="text-lg">{c.t}</CardTitle>
            </CardHeader>
            <CardContent className="leading-6 text-muted-foreground">{c.d}</CardContent>
          </Card>
        ))}
      </div>
    </Section>
  )
}

function BlockDiagram() {
  const [sel, setSel] = useState<Part>('stream')
  const Box = ({ id, label, className }: { id: Part; label: string; className?: string }) => (
    <button
      onClick={() => setSel(id)}
      className={cn(
        'relative z-10 w-full rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all hover:scale-[1.02]',
        sel === id ? 'border-primary bg-primary text-primary-foreground shadow-md' : 'bg-card',
        className,
      )}
    >
      {label}
    </button>
  )
  const Add = ({ id }: { id: Part }) => (
    <button
      onClick={() => setSel(id)}
      className={cn(
        'relative z-10 mx-auto flex size-9 items-center justify-center rounded-full border-2 text-lg font-bold transition-all',
        sel === id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
      )}
    >
      +
    </button>
  )
  const p = PARTS[sel]
  return (
    <Card>
      <CardHeader>
        <CardTitle>Anatomy of one block</CardTitle>
        <CardDescription>Click any part of the diagram. Data flows bottom → top.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8 md:grid-cols-[minmax(240px,320px)_1fr]">
        <div className="relative flex flex-col-reverse items-stretch gap-3 rounded-xl border border-dashed p-4">
          <button
            aria-label="Residual stream"
            onClick={() => setSel('stream')}
            className={cn(
              'absolute top-2 bottom-2 left-1/2 w-2 -translate-x-1/2 rounded-full transition-colors',
              sel === 'stream' ? 'bg-primary' : 'bg-muted-foreground/25 hover:bg-primary/50',
            )}
          />
          <div className="relative z-10 text-center font-mono text-xs text-muted-foreground">from layer ℓ (or embeddings)</div>
          <Box id="norm1" label="Norm" className="w-2/3 self-end" />
          <Box id="attn" label="Multi-head attention" className="w-2/3 self-end" />
          <Add id="add1" />
          <Box id="norm2" label="Norm" className="w-2/3 self-end" />
          <Box id="mlp" label="MLP" className="w-2/3 self-end" />
          <Add id="add2" />
          <div className="relative z-10 text-center font-mono text-xs text-muted-foreground">to layer ℓ+1</div>
        </div>
        <div className="space-y-4">
          <h4 className="text-xl font-semibold">{p.title}</h4>
          {p.tex && <Tex block>{p.tex}</Tex>}
          <p className="max-w-prose leading-7 text-foreground/85">{p.body}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {(Object.keys(PARTS) as Part[]).map((k) => (
              <Button key={k} size="xs" variant={sel === k ? 'secondary' : 'ghost'} onClick={() => setSel(k)}>
                {PARTS[k].title.split(' (')[0]}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const LENS: { upTo: number; preds: [string, number][]; note: string }[] = [
  { upTo: 10, preds: [[' the', 0.08], [' a', 0.05], [' of', 0.04], [' and', 0.03]], note: 'Early layers: generic guesses based on the last token ("of" is usually followed by "the").' },
  { upTo: 30, preds: [[' the', 0.06], [' France', 0.05], [' Europe', 0.04], [' Paris', 0.03]], note: 'Lower-middle layers: the topic (Eiffel Tower → France, Europe) starts to appear.' },
  { upTo: 60, preds: [[' Paris', 0.31], [' France', 0.09], [' Lyon', 0.02], [' the', 0.02]], note: 'Middle layers: attention has moved “Eiffel Tower” information to the last position; MLPs recall the fact.' },
  { upTo: 85, preds: [[' Paris', 0.82], [' France', 0.03], [' PARIS', 0.01], [' Par', 0.01]], note: 'Late layers: confident and formatted correctly (leading space, capital letter).' },
  { upTo: 100, preds: [[' Paris', 0.94], [' France', 0.01], [' the', 0.005], [' Lyon', 0.003]], note: 'Final layer: the prediction is sharpened into the output distribution.' },
]

function LogitLens() {
  const [depth, setDepth] = useState(70)
  const stage = LENS.find((l) => depth <= l.upTo) ?? LENS[LENS.length - 1]
  return (
    <Card>
      <CardHeader>
        <CardDescription className="font-mono text-base text-foreground">
          "The Eiffel Tower is located in the city of ___"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Control label="Depth through the network" value={`${depth}%`}>
          <Slider value={[depth]} min={1} max={100} step={1} onValueChange={(v) => setDepth(sliderValue(v))} />
        </Control>
        <div className="space-y-2">
          {stage.preds.map(([t, p]) => (
            <div key={t} className="flex items-center gap-3 font-mono text-sm">
              <span className="w-20 text-right">{t.replace(/^ /, '·')}</span>
              <div className="h-4 rounded-sm bg-primary transition-all duration-300" style={{ width: `${Math.max(p * 70, 0.5)}%` }} />
              <span className="text-muted-foreground">{(p * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{stage.note} (Illustrative numbers.)</p>
      </CardContent>
    </Card>
  )
}

const PRESETS = [
  { name: 'GPT-2 small (2019)', d: 768, L: 12, V: 50257, real: '124M' },
  { name: 'GPT-3 (2020)', d: 12288, L: 96, V: 50257, real: '175B' },
  { name: 'Llama 3 70B (2024)', d: 8192, L: 80, V: 128256, real: '~70B' },
]

function human(n: number) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M'
  return n.toFixed(0)
}

function ParamCalc() {
  const [d, setD] = useState(12288)
  const [L, setL] = useState(96)
  const [V, setV] = useState(50257)
  const blocks = 12 * L * d * d
  const emb = V * d
  return (
    <Card>
      <CardHeader>
        <CardTitle>Parameter calculator</CardTitle>
        <CardDescription>
          Claude's sizes are not public. These presets are published open/older models.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.name}
              size="sm"
              variant={p.d === d && p.L === L && p.V === V ? 'default' : 'outline'}
              onClick={() => {
                setD(p.d)
                setL(p.L)
                setV(p.V)
              }}
            >
              {p.name} <span className="opacity-60">{p.real}</span>
            </Button>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Control label="Model width d" value={d.toLocaleString()}>
            <Slider value={[d]} min={256} max={20480} step={256} onValueChange={(v) => setD(sliderValue(v))} />
          </Control>
          <Control label="Layers L" value={L}>
            <Slider value={[L]} min={2} max={160} step={1} onValueChange={(v) => setL(sliderValue(v))} />
          </Control>
          <Control label="Vocabulary |V|" value={V.toLocaleString()}>
            <Slider value={[V]} min={1000} max={262144} step={1000} onValueChange={(v) => setV(sliderValue(v))} />
          </Control>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Transformer blocks" value={human(blocks)} hint="12·L·d²" />
          <Stat label="Embeddings" value={human(emb)} hint="|V|·d" />
          <Stat label="Total ≈" value={human(blocks + emb)} hint={`≈ ${Math.max(1, Math.round(((blocks + emb) * 2) / 1e9))} GB of weights at 16-bit`} />
        </div>
      </CardContent>
      <CardContent>
        <Callout kind="note" title="The forward pass is just arithmetic">
          Generating <em>one</em> token requires roughly 2 floating-point operations per parameter. A 100B-parameter
          model therefore does about 200 billion multiply-adds for every single token it writes. That's why LLMs run
          on GPUs/TPUs, chips built for massive parallel matrix multiplication.
        </Callout>
      </CardContent>
    </Card>
  )
}
