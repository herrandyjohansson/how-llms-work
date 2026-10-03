import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Callout, Prose, Section, TokenChip, VectorStrip } from '@/components/layout'
import { fakeVector } from '@/lib/math'
import { tokenize, useTokenizer } from '@/lib/tokenizer'
import { cn } from '@/lib/utils'

const PROMPT = 'The cat sat on the'
const NEXT = [
  { t: ' mat', p: 0.41 },
  { t: ' floor', p: 0.17 },
  { t: ' couch', p: 0.09 },
  { t: ' bed', p: 0.07 },
  { t: ' edge', p: 0.05 },
  { t: ' windows', p: 0.03 },
]

const steps = [
  {
    title: 'Raw text',
    blurb: 'You type a message. To the computer this is just a sequence of characters (Unicode code points, stored as UTF-8 bytes).',
  },
  {
    title: 'Tokenization',
    blurb: 'A tokenizer chops the text into tokens: frequent chunks of characters. Common words are one token; rare words split into several pieces. Note the leading spaces: " cat" (with a space) and "cat" are different tokens.',
  },
  {
    title: 'Token IDs',
    blurb: 'Each token is replaced by its row number in a fixed vocabulary of around 100,000+ entries. From here on the model never sees letters, only integers.',
  },
  {
    title: 'Embeddings',
    blurb: 'Each ID looks up a learned vector: a list of thousands of numbers. This vector is the model\'s initial "meaning" for the token. (Strips below show 48 of the dimensions; orange = positive, blue = negative.)',
  },
  {
    title: 'Transformer layers',
    blurb: 'The vectors flow through a deep stack of identical blocks. In each block, attention lets every token gather information from earlier tokens, and an MLP processes each token on its own. The vectors are gradually rewritten from "what word is this?" to "what should come next?".',
  },
  {
    title: 'Logits',
    blurb: 'The final vector at the last position is compared against every token in the vocabulary (a big matrix multiply). That gives one raw score, a logit, for each of the ~100k possible next tokens.',
  },
  {
    title: 'Softmax → probabilities',
    blurb: 'Softmax turns the scores into a probability distribution that sums to 1. Most of the probability lands on a handful of plausible continuations.',
  },
  {
    title: 'Sample & repeat',
    blurb: 'One token is picked (sampled) from the distribution, appended to the text, and the whole process runs again to get the next token. Claude\'s entire answer is produced this way, one token at a time.',
  },
]

export function Pipeline() {
  const [step, setStep] = useState(0)
  const enc = useTokenizer()
  const toks = enc ? tokenize(enc, PROMPT) : PROMPT.split(/(?= )/).map((text, i) => ({ id: i, text }))

  return (
    <Section
      id="pipeline"
      number={1}
      title="The whole journey, in eight steps"
      kicker="Before diving into each piece, here is the full path one prompt takes. Step through it; every later part of this lecture zooms into one of these boxes."
    >
      <Card>
        <CardHeader>
          <CardDescription className="font-mono">
            Step {step + 1} / {steps.length}
          </CardDescription>
          <CardTitle className="text-2xl">{steps[step].title}</CardTitle>
          <Progress value={((step + 1) / steps.length) * 100} className="mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="max-w-3xl text-base leading-7 text-pretty">{steps[step].blurb}</p>

          <div className="min-h-56 rounded-lg border bg-muted/30 p-4 md:p-6">
            {step === 0 && (
              <div className="space-y-4">
                <div className="font-mono text-2xl md:text-3xl">"{PROMPT}"</div>
                <div className="flex flex-wrap gap-1 font-mono text-xs text-muted-foreground">
                  {[...new TextEncoder().encode(PROMPT)].map((b, i) => (
                    <span key={i} className="rounded border bg-background px-1 py-0.5">
                      {b.toString(16).padStart(2, '0')}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">↑ The same text as UTF-8 bytes (hex). That is all the computer actually has.</p>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-wrap gap-2">
                {toks.map((t, i) => (
                  <TokenChip key={i} text={t.text} index={i} className="text-xl" />
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-wrap gap-2">
                {toks.map((t, i) => (
                  <TokenChip key={i} text={t.text} index={i} id={t.id} className="text-xl" />
                ))}
                <div className="mt-4 w-full font-mono text-lg">[{toks.map((t) => t.id).join(', ')}]</div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2">
                {toks.map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <TokenChip text={t.text} index={i} className="w-20 shrink-0" />
                    <VectorStrip values={fakeVector(t.text, 48)} className="flex-1" cell="h-6 flex-1" />
                  </div>
                ))}
              </div>
            )}

            {step === 4 && <LayerStack tokens={toks.map((t) => t.text)} />}

            {step === 5 && (
              <div className="space-y-2 font-mono text-sm">
                {[...NEXT.map((n, i) => ({ t: n.t, l: 9.8 - i * 0.85 })), { t: ' …100k more', l: NaN }].map((n, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-right">{n.t.replace(/^ /, '·')}</span>
                    {Number.isNaN(n.l) ? (
                      <span className="text-muted-foreground">mostly large negative scores</span>
                    ) : (
                      <>
                        <div className="h-4 rounded-sm bg-chart-2" style={{ width: `${n.l * 4}%` }} />
                        <span className="text-muted-foreground">{n.l.toFixed(1)}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {step === 6 && (
              <div className="space-y-2 font-mono text-sm">
                {NEXT.map((n) => (
                  <div key={n.t} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-right">{n.t.replace(/^ /, '·')}</span>
                    <div className="h-4 rounded-sm bg-primary" style={{ width: `${n.p * 140}%` }} />
                    <span className="text-muted-foreground">{(n.p * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}

            {step === 7 && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {toks.map((t, i) => (
                    <TokenChip key={i} text={t.text} index={i} className="text-xl" />
                  ))}
                  <TokenChip text=" mat" index={toks.length} active className="animate-in text-xl fade-in zoom-in-50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  "The cat sat on the mat" is now the input, and the model runs again to predict the token after " mat".
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ChevronLeft /> Previous
            </Button>
            <div className="hidden gap-1.5 md:flex">
              {steps.map((s, i) => (
                <button
                  key={s.title}
                  aria-label={s.title}
                  onClick={() => setStep(i)}
                  className={cn('size-2.5 rounded-full bg-muted-foreground/30 transition-all', i === step && 'w-6 bg-primary')}
                />
              ))}
            </div>
            <Button onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} disabled={step === steps.length - 1}>
              Next <ChevronRight />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Prose>
        <p>
          <strong>The single most important idea in this lecture:</strong> a model like Claude is a function that takes
          a sequence of tokens and returns a probability distribution over the next token. That is all it does.
          Writing essays, code, poems, and long reasoning chains all emerge from calling that one function over and
          over, feeding each output back in as input. This is called <em>autoregressive</em> generation.
        </p>
      </Prose>

      <Callout kind="note" title="What is public and what isn't">
        Anthropic has not published Claude's exact architecture, parameter count, layer count, or tokenizer
        vocabulary. Everything in this lecture describes the <strong>transformer architecture</strong> that Claude
        and all other frontier LLMs are built on, using published research and open models for concrete numbers.
        Where we show Claude-specific details, they come from Anthropic's public documentation and research.
      </Callout>
    </Section>
  )
}

function LayerStack({ tokens }: { tokens: string[] }) {
  const layers = ['Layer 1', 'Layer 2', 'Layer 3', '⋮', 'Layer N']
  return (
    <div className="flex flex-col-reverse gap-2">
      {layers.map((l, li) => (
        <div key={l} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-right font-mono text-xs text-muted-foreground">{l}</span>
          {l === '⋮' ? (
            <div className="flex-1 text-center text-muted-foreground">dozens more layers</div>
          ) : (
            <div className="grid flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${tokens.length}, minmax(0, 1fr))` }}>
              {tokens.map((t, ti) => (
                <VectorStrip key={ti} values={fakeVector(t + li, 12)} cell="h-5 flex-1" />
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="flex items-center gap-3">
        <span className="w-16 shrink-0" />
        <div className="grid flex-1 gap-1.5 font-mono text-xs" style={{ gridTemplateColumns: `repeat(${tokens.length}, minmax(0, 1fr))` }}>
          {tokens.map((t, i) => (
            <span key={i} className="truncate text-center">
              {t.replace(/^ /, '·')}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
