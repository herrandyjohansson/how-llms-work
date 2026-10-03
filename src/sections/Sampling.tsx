import { useMemo, useState } from 'react'
import { Dices, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Callout, Control, Prose, Section } from '@/components/layout'
import { Tex } from '@/components/tex'
import { sliderValue, softmax } from '@/lib/math'
import { cn } from '@/lib/utils'

const PROMPT = 'Once upon a time, there was a little'
const CANDIDATES: [string, number][] = [
  [' girl', 7.2],
  [' boy', 6.8],
  [' princess', 5.9],
  [' dragon', 5.4],
  [' old', 5.0],
  [' house', 4.6],
  [' mouse', 4.4],
  [' bird', 4.1],
  [' robot', 3.3],
  [' spaceship', 2.2],
  [' potato', 1.4],
  [' quantum', 0.2],
]

function distribution(temp: number, topK: number, topP: number) {
  const logits = CANDIDATES.map((c) => c[1])
  const greedy = temp === 0
  const base = softmax(logits, greedy ? 1 : temp)
  const order = base.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p)
  const keep = new Set<number>()
  let cum = 0
  for (const [rank, { p, i }] of order.entries()) {
    if (greedy && rank > 0) break
    if (rank >= topK) break
    if (rank > 0 && cum >= topP) break
    keep.add(i)
    cum += p
  }
  const kept = base.map((p, i) => (keep.has(i) ? p : 0))
  const z = kept.reduce((a, b) => a + b, 0)
  return { base, final: kept.map((p) => p / z), keep }
}

function sample(probs: number[]) {
  let r = Math.random()
  for (let i = 0; i < probs.length; i++) {
    r -= probs[i]
    if (r <= 0) return i
  }
  return probs.length - 1
}

export function Sampling() {
  return (
    <Section
      id="sampling"
      number={6}
      title="From vectors to the next token: logits, softmax, sampling"
      kicker="After the last layer, the model has one rich vector at the final position. Now it has to commit to an actual token. This last step is where randomness, creativity and settings like temperature come in."
    >
      <Prose>
        <p>
          The final vector <Tex>{'h'}</Tex> is multiplied by an <strong>unembedding matrix</strong> with one column
          per vocabulary token. Each result is a <strong>logit</strong>: a raw, unbounded score saying how well that
          token fits next. Softmax turns logits into probabilities:
        </p>
      </Prose>
      <Tex block>{'z = h\\,W_U \\in \\mathbb{R}^{|V|}, \\qquad p_i = \\frac{e^{z_i / T}}{\\sum_{j} e^{z_j / T}}'}</Tex>
      <Prose>
        <p>
          <Tex>{'T'}</Tex> is the <strong>temperature</strong>. Then the model doesn't simply take the top token: it{' '}
          <strong>samples</strong>, rolling weighted dice. Play with the knobs below and watch how the distribution
          changes.
        </p>
      </Prose>
      <SamplerDemo />

      <Tabs defaultValue="t">
        <TabsList>
          <TabsTrigger value="t">Temperature</TabsTrigger>
          <TabsTrigger value="k">Top-k</TabsTrigger>
          <TabsTrigger value="p">Top-p (nucleus)</TabsTrigger>
          <TabsTrigger value="g">Greedy</TabsTrigger>
        </TabsList>
        <TabsContent value="t">
          <Prose className="pt-2">
            <p>
              Dividing logits by <Tex>{'T'}</Tex> before softmax. <Tex>{'T<1'}</Tex> exaggerates differences (the
              favourite gets even more likely: focused, predictable output). <Tex>{'T>1'}</Tex> flattens them (more
              surprising, creative, and more error-prone). <Tex>{'T \\to 0'}</Tex> is equivalent to always picking the
              top token.
            </p>
          </Prose>
        </TabsContent>
        <TabsContent value="k">
          <Prose className="pt-2">
            <p>
              Keep only the <Tex>{'k'}</Tex> most likely tokens, renormalise, sample among them. This cuts off the
              long tail of individually-unlikely tokens that collectively can carry a lot of probability.
            </p>
          </Prose>
        </TabsContent>
        <TabsContent value="p">
          <Prose className="pt-2">
            <p>
              Sort tokens by probability and keep the smallest set whose probabilities add up to <Tex>{'p'}</Tex>{' '}
              (e.g. 0.9). Unlike top-k it adapts: when the model is confident, the nucleus is just 1–2 tokens; when
              many continuations are plausible, it's wider.
            </p>
          </Prose>
        </TabsContent>
        <TabsContent value="g">
          <Prose className="pt-2">
            <p>
              Always pick the most likely token. Deterministic, but over long texts it tends to produce repetitive,
              bland output, because the most likely <em>individual</em> token at each step does not add up to the
              most natural <em>text</em>.
            </p>
          </Prose>
        </TabsContent>
      </Tabs>

      <Callout kind="tip" title="Why the same question gives different answers">
        Because the next token is sampled, asking Claude the same thing twice can produce different wording. Each
        token choice changes the input for all later tokens, so small early differences snowball into different
        answers. Anthropic's API exposes <code>temperature</code> (default 1.0), <code>top_p</code> and{' '}
        <code>top_k</code>; lower temperature is better for analytical or multiple-choice tasks, higher for creative
        ones.
      </Callout>
    </Section>
  )
}

function SamplerDemo() {
  const [temp, setTemp] = useState(1)
  const [topK, setTopK] = useState(12)
  const [topP, setTopP] = useState(1)
  const [history, setHistory] = useState<number[]>([])
  const { base, final } = useMemo(() => distribution(temp, topK, topP), [temp, topK, topP])
  const counts = CANDIDATES.map((_, i) => history.filter((h) => h === i).length)
  const last = history.at(-1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-lg font-normal">
          "{PROMPT}<span className="font-semibold text-primary">{last !== undefined ? CANDIDATES[last][0] : ' ___'}</span>"
        </CardTitle>
        <CardDescription>Illustrative logits for 12 candidates (a real model scores every token in its vocabulary).</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-[300px_1fr]">
        <div className="space-y-6">
          <Control label="Temperature T" value={temp === 0 ? '0 (greedy)' : temp.toFixed(2)}>
            <Slider value={[temp]} min={0} max={2} step={0.05} onValueChange={(v) => setTemp(sliderValue(v))} />
          </Control>
          <Control label="Top-k" value={topK}>
            <Slider value={[topK]} min={1} max={12} step={1} onValueChange={(v) => setTopK(sliderValue(v))} />
          </Control>
          <Control label="Top-p" value={topP.toFixed(2)}>
            <Slider value={[topP]} min={0.05} max={1} step={0.05} onValueChange={(v) => setTopP(sliderValue(v))} />
          </Control>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setHistory((h) => [...h, sample(final)])}>
              <Dices /> Sample once
            </Button>
            <Button variant="outline" onClick={() => setHistory((h) => [...h, ...Array.from({ length: 100 }, () => sample(final))])}>
              ×100
            </Button>
            <Button variant="ghost" size="icon" aria-label="Reset" onClick={() => setHistory([])}>
              <RotateCcw />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">{history.length} samples drawn</div>
        </div>
        <div className="space-y-1.5">
          <div className="grid grid-cols-[90px_1fr_56px_56px] gap-2 text-xs text-muted-foreground">
            <span className="text-right">token</span>
            <span>probability (faint = before filtering)</span>
            <span className="text-right">logit</span>
            <span className="text-right">drawn</span>
          </div>
          {CANDIDATES.map(([t, logit], i) => (
            <div
              key={t}
              className={cn('grid grid-cols-[90px_1fr_56px_56px] items-center gap-2 font-mono text-sm transition-opacity', final[i] === 0 && 'opacity-35')}
            >
              <span className={cn('text-right', last === i && 'font-bold text-primary')}>{t.replace(/^ /, '·')}</span>
              <div className="relative h-5 rounded-sm bg-muted/50">
                <div className="absolute inset-y-0 left-0 rounded-sm bg-primary/20" style={{ width: `${base[i] * 100}%` }} />
                <div className="absolute inset-y-0 left-0 rounded-sm bg-primary transition-all duration-300" style={{ width: `${final[i] * 100}%` }} />
                <span className="absolute inset-y-0 right-1 flex items-center text-xs text-muted-foreground">
                  {(final[i] * 100).toFixed(1)}%
                </span>
              </div>
              <span className="text-right text-muted-foreground">{logit.toFixed(1)}</span>
              <span className="text-right tabular-nums">{counts[i] || ''}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
