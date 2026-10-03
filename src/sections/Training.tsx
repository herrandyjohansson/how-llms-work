import { useState } from 'react'
import { Check, ThumbsUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Callout, Control, H3, Prose, Section } from '@/components/layout'
import { Tex } from '@/components/tex'
import { sliderValue } from '@/lib/math'
import { cn } from '@/lib/utils'

export function Pretraining() {
  return (
    <Section
      id="pretraining"
      number={8}
      title="Pretraining: learning from trillions of tokens"
      kicker="Where do all those weights come from? They start as random noise. Then the model plays one game, billions of times: guess the next token. Every wrong guess nudges every weight slightly in a better direction."
    >
      <Prose>
        <p>
          The training data is an enormous corpus of text: public web pages, books, code, scientific papers and
          more, totalling trillions of tokens. The task is self-supervised: no human labels are needed, because the
          "right answer" for each position is simply the token that actually came next in the text.
        </p>
        <p>
          The model is scored with <strong>cross-entropy loss</strong>: the negative log of the probability it
          assigned to the correct token. Confident and right: loss near 0. Confident and wrong: loss is huge.
        </p>
      </Prose>
      <Tex block className="text-lg">{'\\mathcal{L}(\\theta) = -\\frac{1}{N}\\sum_{t=1}^{N} \\log p_\\theta\\big(x_t \\mid x_{<t}\\big)'}</Tex>
      <LossDemo />

      <H3>One training step</H3>
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { n: '1', t: 'Forward pass', d: 'Feed a batch of text sequences through the model. Thanks to the causal mask, a 4,000-token sequence yields 4,000 next-token predictions at once.' },
          { n: '2', t: 'Compute loss', d: 'Compare every prediction with the actual next token. Average the cross-entropy over millions of positions in the batch.' },
          { n: '3', t: 'Backpropagation', d: 'Calculus (the chain rule) computes, for every one of the billions of weights, how the loss would change if that weight were nudged: the gradient.' },
          { n: '4', t: 'Update', d: 'Move every weight a tiny step against its gradient (via an optimiser like Adam). Repeat for hundreds of thousands of steps.' },
        ].map((s) => (
          <Card key={s.n} size="sm">
            <CardHeader>
              <span className="flex size-8 items-center justify-center rounded-full bg-primary font-mono text-primary-foreground">{s.n}</span>
              <CardTitle className="pt-1">{s.t}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">{s.d}</CardContent>
          </Card>
        ))}
      </div>
      <Tex block>{'\\theta \\leftarrow \\theta - \\eta \\, \\nabla_\\theta \\mathcal{L}(\\theta)'}</Tex>

      <H3>Watching a model learn</H3>
      <TrainingProgress />

      <Prose>
        <p>
          <strong>Why does next-token prediction produce something that seems to understand?</strong> Because
          predicting text <em>well</em> is extremely demanding. To predict the next word of a physics textbook you
          benefit from knowing physics; to predict the next line of a program you benefit from understanding what the
          program does; to predict what a character in a novel says next you benefit from modelling their goals. The
          simple objective forces the model to build rich internal representations of the world described by text.
        </p>
        <p>
          <strong>Scaling laws.</strong> Research since 2020 has shown that the loss falls smoothly and predictably as a
          power law as you increase parameters, data and compute together. This predictability is why labs invest in
          ever-larger training runs, which today use tens of thousands of accelerator chips for months.
        </p>
      </Prose>
    </Section>
  )
}

function LossDemo() {
  const [p, setP] = useState(0.25)
  const loss = -Math.log(p)
  const W = 420
  const H = 200
  const pad = 30
  const xs = Array.from({ length: 100 }, (_, i) => 0.01 + (i / 99) * 0.99)
  const sx = (x: number) => pad + x * (W - 2 * pad)
  const sy = (y: number) => H - pad - (Math.min(y, 4.6) / 4.6) * (H - 2 * pad)
  return (
    <Card>
      <CardHeader>
        <CardTitle>The loss for a single prediction</CardTitle>
        <CardDescription>
          Context "The capital of France is" → correct next token " Paris". How much probability did the model put on it?
        </CardDescription>
      </CardHeader>
      <CardContent className="grid items-center gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <Control label="p(“·Paris”)" value={p.toFixed(2)}>
            <Slider value={[p]} min={0.01} max={1} step={0.01} onValueChange={(v) => setP(sliderValue(v))} />
          </Control>
          <div className="font-mono text-3xl">
            loss = −ln({p.toFixed(2)}) = <span className="text-primary">{loss.toFixed(3)}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            A random guess among 100,000 tokens gives loss ≈ ln(100000) ≈ 11.5. Well-trained models average around
            1.5–2 on typical text: that is, roughly as uncertain as choosing among 5–7 equally likely tokens.
          </p>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="currentColor" opacity={0.2} />
          <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="currentColor" opacity={0.2} />
          <polyline
            fill="none"
            stroke="var(--chart-2)"
            strokeWidth={2.5}
            points={xs.map((x) => `${sx(x)},${sy(-Math.log(x))}`).join(' ')}
          />
          <circle cx={sx(p)} cy={sy(loss)} r={7} fill="var(--primary)" />
          <text x={W - pad} y={H - 8} textAnchor="end" className="fill-muted-foreground text-[11px]">p(correct) →</text>
          <text x={pad + 4} y={pad - 8} className="fill-muted-foreground text-[11px]">loss</text>
        </svg>
      </CardContent>
    </Card>
  )
}

const SAMPLES: { at: number; label: string; text: string }[] = [
  { at: 0, label: 'Step 0 (random weights)', text: 'ylkS zp!!Fq 3Wv]cat xxm7 oluQ ;; hrr tB' },
  { at: 8, label: 'Very early', text: 'the the of and to a the is in the, the of a and' },
  { at: 25, label: 'Early', text: 'The cat was a very good and the house of the city was not in the first time.' },
  { at: 55, label: 'Mid-training', text: 'The cat sat on the windowsill, watching the birds in the garden below. It had been raining all morning.' },
  { at: 85, label: 'Late', text: 'The cat sat on the windowsill, its tail flicking as it tracked a sparrow hopping between the wet branches of the apple tree.' },
]

function TrainingProgress() {
  const [t, setT] = useState(55)
  const sample = [...SAMPLES].reverse().find((s) => t >= s.at)!
  const W = 600
  const H = 180
  const pad = 24
  const curve = (x: number) => 1.8 + 9.5 * Math.exp(-x / 6) + 1.2 * Math.exp(-x / 40)
  const pts = Array.from({ length: 101 }, (_, i) => i)
  const sx = (x: number) => pad + (x / 100) * (W - 2 * pad)
  const sy = (y: number) => H - pad - ((y - 1.5) / 10.5) * (H - 2 * pad)
  return (
    <Card>
      <CardHeader>
        <CardDescription>Drag through training. Samples are illustrative of how model output typically evolves.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <polyline fill="none" stroke="var(--chart-2)" strokeWidth={2.5} points={pts.map((x) => `${sx(x)},${sy(curve(x))}`).join(' ')} />
          <line x1={sx(t)} x2={sx(t)} y1={pad} y2={H - pad} stroke="var(--primary)" strokeDasharray="4 3" />
          <circle cx={sx(t)} cy={sy(curve(t))} r={6} fill="var(--primary)" />
          <text x={pad} y={pad - 6} className="fill-muted-foreground text-[11px]">training loss</text>
          <text x={W - pad} y={H - 6} textAnchor="end" className="fill-muted-foreground text-[11px]">training steps →</text>
        </svg>
        <Control label="Training progress" value={`${t}% · loss ≈ ${curve(t).toFixed(2)}`}>
          <Slider value={[t]} min={0} max={100} step={1} onValueChange={(v) => setT(sliderValue(v))} />
        </Control>
        <div className="rounded-lg border bg-muted/30 p-4">
          <Badge variant="outline" className="mb-2">{sample.label}</Badge>
          <p className="font-mono text-base">
            <span className="text-muted-foreground">The cat</span> {sample.text.replace(/^The cat /, '')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------- Post-training ----------------

const PAIRS = [
  {
    prompt: 'My code throws "TypeError: undefined is not a function". What should I check?',
    a: 'That error means you called something that isn\'t a function. Check: (1) the spelling of the method name, (2) whether the object is the type you expect (log it), (3) whether an import is missing or is a default vs named export mismatch. If you paste the line, I can be more specific.',
    b: 'There could be many reasons for this error. JavaScript is a complex language and debugging can be difficult. You should look at your code carefully and try to find the problem.',
    better: 'a',
  },
  {
    prompt: 'Is it safe to mix bleach and ammonia for a stronger cleaner?',
    a: 'Sure! Combining cleaners makes them more powerful. Use equal parts for best results.',
    b: 'No, please don\'t. Mixing bleach and ammonia releases toxic chloramine gas, which can cause serious respiratory harm. Use one product at a time, rinse between them, and keep the area ventilated.',
    better: 'b',
  },
]

export function PostTraining() {
  return (
    <Section
      id="posttraining"
      number={9}
      title="Post-training: from text predictor to Claude"
      kicker="A pretrained “base model” knows a lot, but it isn't an assistant. It just continues text. Post-training turns it into a helpful, honest and harmless conversational partner with a consistent character."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">Base model</Badge>
            <CardTitle className="font-mono text-base font-normal">What is the capital of France?</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-sm text-muted-foreground">
            What is the capital of Germany?<br />What is the capital of Italy?<br />What is the capital of Spain?<br />
            <span className="mt-2 block font-sans not-italic">↑ Plausible continuation of a quiz worksheet, not an answer.</span>
          </CardContent>
        </Card>
        <Card className="ring-primary/40">
          <CardHeader>
            <Badge className="w-fit">Post-trained assistant</Badge>
            <CardTitle className="font-mono text-base font-normal">What is the capital of France?</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-sm">
            The capital of France is Paris.
            <span className="mt-2 block font-sans text-muted-foreground">↑ Same network, same mechanism; different learned behaviour.</span>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sft">
        <TabsList className="h-auto! flex-wrap">
          <TabsTrigger value="sft">1 · Supervised fine-tuning</TabsTrigger>
          <TabsTrigger value="rlhf">2 · RLHF</TabsTrigger>
          <TabsTrigger value="cai">3 · Constitutional AI</TabsTrigger>
          <TabsTrigger value="rl">4 · RL for reasoning</TabsTrigger>
        </TabsList>
        <TabsContent value="sft">
          <Prose className="pt-3">
            <p>
              Continue training on a smaller, curated set of example conversations showing the desired behaviour:
              a user message followed by an ideal assistant response. The objective is the same next-token prediction,
              just on different data. The model learns the format of a conversation and the style of a good
              assistant.
            </p>
          </Prose>
        </TabsContent>
        <TabsContent value="rlhf">
          <Prose className="pt-3">
            <p>
              <strong>Reinforcement Learning from Human Feedback.</strong> It's easier for people to <em>compare</em>{' '}
              two answers than to write a perfect one. So:
            </p>
            <ol>
              <li>The model generates several responses to a prompt.</li>
              <li>Human raters pick which response is better.</li>
              <li>A separate <strong>reward model</strong> is trained to predict those preferences.</li>
              <li>The assistant is optimised with reinforcement learning to produce responses the reward model scores highly (while staying close to its original behaviour).</li>
            </ol>
            <p>Try being the human rater below.</p>
          </Prose>
        </TabsContent>
        <TabsContent value="cai">
          <Prose className="pt-3">
            <p>
              <strong>Constitutional AI</strong> is Anthropic's technique (published 2022). Instead of relying only on
              human labels for harmlessness, the model is given a written set of principles, a{' '}
              <em>constitution</em>, and uses it to improve itself:
            </p>
            <ol>
              <li><strong>Critique & revise:</strong> the model drafts a response, critiques it against a principle ("Is this harmful? Is it honest?"), and rewrites it. The revised responses become fine-tuning data.</li>
              <li><strong>RL from AI Feedback (RLAIF):</strong> the model itself compares pairs of responses according to the constitution, and those AI judgements train the preference model used for RL.</li>
            </ol>
            <p>
              This makes the values being trained more transparent (they're written down) and scales better than
              human labelling. Anthropic publishes the constitution that guides Claude's character and values.
            </p>
          </Prose>
        </TabsContent>
        <TabsContent value="rl">
          <Prose className="pt-3">
            <p>
              Modern models are also trained with reinforcement learning on tasks with checkable answers: math
              problems, coding tasks with test suites, multi-step agentic tasks. The model is rewarded when it reaches
              a correct result, which teaches it to reason step by step, check its work and recover from mistakes.
              This is closely tied to <strong>extended thinking</strong> (Part 10).
            </p>
          </Prose>
        </TabsContent>
      </Tabs>

      <PreferenceDemo />

      <Callout kind="note" title="Weights are frozen at deployment">
        All learning happens before release. When you chat with Claude, the weights don't change: the model is not
        learning from your conversation in real time. What it "knows" comes from training data up to its{' '}
        <strong>knowledge cutoff</strong>, plus whatever you put in the context window.
      </Callout>
    </Section>
  )
}

function PreferenceDemo() {
  const [picks, setPicks] = useState<Record<number, 'a' | 'b'>>({})
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ThumbsUp className="size-5 text-primary" /> You are the rater
        </CardTitle>
        <CardDescription>Choose the better response. Each choice becomes one data point for the reward model.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {PAIRS.map((pair, i) => (
          <div key={i} className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <span className="font-medium">User:</span> {pair.prompt}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {(['a', 'b'] as const).map((k) => {
                const chosen = picks[i] === k
                const revealed = picks[i] !== undefined
                return (
                  <button
                    key={k}
                    onClick={() => setPicks((p) => ({ ...p, [i]: k }))}
                    className={cn(
                      'rounded-lg border-2 p-3 text-left text-sm leading-6 transition-all hover:border-primary/50',
                      chosen && 'border-primary bg-primary/5',
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between font-mono text-xs text-muted-foreground">
                      Response {k.toUpperCase()}
                      {revealed && pair.better === k && <Check className="size-4 text-emerald-600" />}
                    </div>
                    {pair[k]}
                  </button>
                )
              })}
            </div>
            {picks[i] && (
              <p className="text-sm text-muted-foreground">
                {picks[i] === pair.better
                  ? 'Most raters agree. The reward model learns: specific, accurate, safe answers score higher.'
                  : 'Interesting! Disagreements between raters are real; the reward model learns from the aggregate of many judgements.'}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
