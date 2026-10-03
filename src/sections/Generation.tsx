import { useEffect, useMemo, useState } from 'react'
import { Pause, Play, RotateCcw, StepForward } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Callout, Control, H3, Prose, Section, Stat, TokenChip } from '@/components/layout'
import { sliderValue } from '@/lib/math'
import { tokenize, useTokenizer } from '@/lib/tokenizer'
import { cn } from '@/lib/utils'

const USER = 'Explain gravity in one sentence.'
const ANSWER = 'Gravity is the force by which objects with mass attract one another, keeping us on the ground and the planets in orbit.'

export function Generation() {
  return (
    <Section
      id="generation"
      number={7}
      title="The loop: generating an answer token by token"
      kicker="Everything so far produces a single token. To write a full answer, the model runs again and again, each time with one more token of input. This loop explains streaming, speed, cost and much of how LLMs behave."
    >
      <LoopDemo />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Phase 1</Badge>
            <CardTitle>Prefill: reading your prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 leading-6 text-muted-foreground">
            <p>
              All prompt tokens are known up front, so the model processes them <strong className="text-foreground">in parallel</strong>,
              in one big batch of matrix multiplies. GPUs are excellent at this. Prefill determines the{' '}
              <em>time to first token</em>: a very long prompt takes noticeably longer before the answer starts.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Phase 2</Badge>
            <CardTitle>Decode: writing the answer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 leading-6 text-muted-foreground">
            <p>
              Each new token depends on the one before it, so generation is <strong className="text-foreground">strictly sequential</strong>:
              one full forward pass through every layer per token. This is why answers stream in word by word, and why
              output tokens are priced higher than input tokens.
            </p>
          </CardContent>
        </Card>
      </div>

      <H3>The KV cache</H3>
      <Prose>
        <p>
          Notice that when generating token 50, the keys and values for tokens 1 to 49 are exactly the same as they
          were in the previous step: past tokens can't see the future, so they never change. So instead of recomputing
          them, the model <strong>caches</strong> every layer's K and V vectors. Each decode step only computes Q, K, V
          for the <em>one</em> new token and attends over the cache. The cache grows with every token and, for long
          contexts, can occupy many gigabytes of GPU memory.
        </p>
        <p>
          Anthropic's <strong>prompt caching</strong> feature builds on the same idea across requests: if many calls
          share the same long prefix (a big system prompt, a document, tool definitions), the processed prefix can be
          reused, making those calls faster and cheaper.
        </p>
      </Prose>

      <Callout kind="warn" title="The model has no memory between messages">
        The model itself is stateless. In a chat, every time you send a message the <em>entire conversation so far</em>{' '}
        is sent again and processed as one long token sequence. "Memory" within a conversation is simply the earlier
        messages being part of the input. When a conversation exceeds the context window, something has to be dropped
        or summarised.
      </Callout>
    </Section>
  )
}

function LoopDemo() {
  const enc = useTokenizer()
  const { prompt, answer } = useMemo(() => {
    if (!enc) return { prompt: [], answer: [] }
    return { prompt: tokenize(enc, USER), answer: [...tokenize(enc, ANSWER), { id: -1, text: '⟨end of turn⟩' }] }
  }, [enc])
  const [step, setStep] = useState(0) // number of forward passes run; pass 1 is the prefill
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(4)
  const maxStep = answer.length

  useEffect(() => {
    if (!playing) return
    if (step >= maxStep) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 900 : 1000 / speed)
    return () => clearTimeout(t)
  }, [playing, step, speed, maxStep])

  const generated = answer.slice(0, step)
  // The newest token has been sampled but not yet fed back in, so it is not cached yet.
  const cacheLen = step === 0 ? 0 : prompt.length + generated.length - 1
  const phase = step === 0 ? 'idle' : step === 1 ? 'prefill' : step >= maxStep ? 'done' : 'decode'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Watch the loop</CardTitle>
        <CardDescription>
          Every new token requires a full forward pass. Press play, or step manually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => (step >= maxStep ? (setStep(0), setPlaying(true)) : setPlaying((p) => !p))} disabled={!enc}>
            {playing ? <Pause /> : <Play />} {playing ? 'Pause' : 'Play'}
          </Button>
          <Button variant="outline" onClick={() => setStep((s) => Math.min(maxStep, s + 1))} disabled={!enc || step >= maxStep}>
            <StepForward /> Step
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setPlaying(false)
              setStep(0)
            }}
          >
            <RotateCcw /> Reset
          </Button>
          <div className="ml-auto w-48">
            <Control label="Speed" value={`${speed} tok/s`}>
              <Slider value={[speed]} min={1} max={20} step={1} onValueChange={(v) => setSpeed(sliderValue(v))} />
            </Control>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Phase" value={<span className="text-lg">{phase}</span>} />
          <Stat label="Forward passes" value={Math.max(0, step)} />
          <Stat label="Tokens in context" value={prompt.length + generated.length} />
          <Stat label="KV cache entries" value={cacheLen} hint="per layer, per head" />
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Input to the model this step</div>
          <div className="flex flex-wrap gap-1">
            {prompt.map((t, i) => (
              <TokenChip key={'p' + i} text={t.text} index={0} className={cn(step === 1 && 'ring-2 ring-primary/60')} />
            ))}
            {generated.map((t, i) => (
              <TokenChip
                key={'g' + i}
                text={t.text}
                index={2}
                active={i === generated.length - 1}
                className="animate-in fade-in zoom-in-75"
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-orange-200 dark:bg-orange-500/40" /> your prompt</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-emerald-200 dark:bg-emerald-500/40" /> generated by the model</span>
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            KV cache (one column per token, rows = layers)
          </div>
          <div className="flex gap-px overflow-hidden rounded-md">
            {Array.from({ length: prompt.length + answer.length }, (_, i) => (
              <div key={i} className="flex flex-1 flex-col gap-px">
                {Array.from({ length: 6 }, (_, l) => (
                  <div
                    key={l}
                    className={cn(
                      'h-2.5 transition-colors duration-300',
                      i < cacheLen ? (i < prompt.length ? 'bg-orange-400/70' : 'bg-emerald-500/70') : 'bg-muted',
                      i === cacheLen - 1 && step > 1 && 'bg-primary',
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {phase === 'idle' && 'The prompt is waiting. (In reality it would be wrapped in chat-format special tokens; see Part 10.)'}
          {phase === 'prefill' && `Prefill: all ${prompt.length} prompt tokens went through the network at once, filling the cache. The output at the last position was sampled as the first answer token: "${generated[0]?.text}".`}
          {phase === 'decode' && `Decode pass #${step}: only the previous token "${generated.at(-2)?.text ?? ''}" was processed, attending to the cache; the result was sampled as "${generated.at(-1)?.text ?? ''}".`}
          {phase === 'done' && 'The model emitted its end-of-turn token, so generation stops and control returns to you.'}
        </p>
      </CardContent>
    </Card>
  )
}
