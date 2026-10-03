import { useState } from 'react'
import { Brain, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Callout, H3, Prose, Section } from '@/components/layout'
import { cn } from '@/lib/utils'

const REQUEST = `POST /v1/messages
{
  "model": "claude-…",
  "max_tokens": 1024,
  "system": "You are a friendly physics tutor.",
  "messages": [
    { "role": "user",      "content": "Why is the sky blue?" },
    { "role": "assistant", "content": "Because of Rayleigh scattering…" },
    { "role": "user",      "content": "And why are sunsets red?" }
  ]
}`

type Seg = { kind: 'special' | 'system' | 'user' | 'assistant' | 'gen'; text: string }
const SEQUENCE: Seg[] = [
  { kind: 'special', text: '⟨system⟩' },
  { kind: 'system', text: 'You are a friendly physics tutor.' },
  { kind: 'special', text: '⟨human⟩' },
  { kind: 'user', text: 'Why is the sky blue?' },
  { kind: 'special', text: '⟨assistant⟩' },
  { kind: 'assistant', text: 'Because of Rayleigh scattering…' },
  { kind: 'special', text: '⟨human⟩' },
  { kind: 'user', text: 'And why are sunsets red?' },
  { kind: 'special', text: '⟨assistant⟩' },
  { kind: 'gen', text: 'At sunset, sunlight travels through much more air, so…' },
]

const segClass: Record<Seg['kind'], string> = {
  special: 'bg-foreground text-background',
  system: 'bg-violet-200/70 dark:bg-violet-500/25',
  user: 'bg-sky-200/70 dark:bg-sky-500/25',
  assistant: 'bg-emerald-200/70 dark:bg-emerald-500/25',
  gen: 'bg-primary/20 ring-1 ring-primary border-dashed',
}

const TOOL_STEPS = [
  { who: 'You', t: 'Send the user message plus tool definitions (name, description, JSON schema). The definitions are turned into tokens in the context like everything else.', code: `"tools": [{ "name": "get_weather",\n  "input_schema": { "city": "string" } }]\nuser: "Should I bring an umbrella in Oslo?"` },
  { who: 'Claude', t: 'The model predicts tokens as usual, but the most likely continuation is a structured tool call. Generation stops with stop_reason "tool_use".', code: `{ "type": "tool_use", "name": "get_weather",\n  "input": { "city": "Oslo" } }` },
  { who: 'You', t: 'Your code actually runs the function (the model can\'t execute anything itself) and sends back the result.', code: `{ "type": "tool_result",\n  "content": "Rain, 9°C, 90% chance of showers" }` },
  { who: 'Claude', t: 'With the result now in its context, the model continues generating, token by token, a normal answer.', code: `"Yes, bring an umbrella: Oslo expects rain\n with a 90% chance of showers today."` },
]

export function ClaudeInPractice() {
  return (
    <Section
      id="claude"
      number={10}
      title="Claude in practice: messages, tools and thinking"
      kicker="Everything Claude does, from multi-turn chat to calling tools to reasoning before answering, is built from the same primitive: one long sequence of tokens, extended one token at a time."
    >
      <H3>From an API call to a token sequence</H3>
      <Prose>
        <p>
          When you use Claude through an app or the API, your conversation is structured as messages with roles. Before
          the model sees it, the whole conversation is <strong>rendered into one flat token sequence</strong> with
          special tokens marking where each turn starts. The model is then asked to continue after the final
          "assistant" marker.
        </p>
      </Prose>
      <Tabs defaultValue="api">
        <TabsList>
          <TabsTrigger value="api">What you send</TabsTrigger>
          <TabsTrigger value="model">What the model sees</TabsTrigger>
        </TabsList>
        <TabsContent value="api">
          <Card>
            <CardContent>
              <pre className="overflow-x-auto rounded-lg bg-muted/50 p-4 text-sm leading-6">{REQUEST}</pre>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="model">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5 font-mono text-sm leading-7">
                {SEQUENCE.map((s, i) => (
                  <span key={i} className={cn('rounded-md px-2 py-0.5', segClass[s.kind])}>
                    {s.text}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                The ⟨markers⟩ here are illustrative: Claude's exact internal format isn't public. (Anthropic's original
                text-completion API used literal <code>\n\nHuman:</code> and <code>\n\nAssistant:</code> prefixes.)
                The dashed part is what the model generates; it stops when it predicts its end-of-turn token.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Prose>
        <p>
          The <strong>system prompt</strong> is just text at the start of the sequence. Through post-training, the model
          has learned to give it special weight, but mechanically it's tokens in the context like everything else.
        </p>
      </Prose>

      <H3>Tool use: the model asks, your code acts</H3>
      <ToolUse />

      <H3>Extended thinking: more tokens, more computation</H3>
      <Card>
        <CardContent className="grid gap-6 md:grid-cols-[1fr_1fr]">
          <div className="space-y-3 leading-7">
            <p>
              Each token gets a fixed amount of computation: one pass through the layers. A hard problem may need more
              computation than one forward pass can provide. The solution: let the model <strong>write out its
              reasoning</strong> before answering.
            </p>
            <p>
              With extended thinking, Claude first generates a (possibly long) stream of thinking tokens: exploring
              approaches, doing calculations, checking work. Every one of those tokens is another forward pass, and
              its result becomes context for the next. The final answer is then conditioned on all that work.
              Same mechanism, just more tokens: this is why reasoning improves accuracy on math, coding and complex
              analysis, at the cost of time and tokens.
            </p>
          </div>
          <div className="space-y-2 font-mono text-sm">
            <div className="rounded-md bg-sky-200/70 px-3 py-2 dark:bg-sky-500/25">user: What is 17 × 24?</div>
            <div className="rounded-md border border-dashed px-3 py-2 text-muted-foreground">
              <Brain className="mr-1.5 inline size-4" />
              thinking: 17 × 24 = 17 × 20 + 17 × 4 = 340 + 68 = 408. Check: 24 × 17 = 240 + 168 = 408 ✓
            </div>
            <div className="rounded-md bg-emerald-200/70 px-3 py-2 dark:bg-emerald-500/25">assistant: 408</div>
          </div>
        </CardContent>
      </Card>

      <H3>The context window</H3>
      <ContextWindow />

      <Callout kind="warn" title="Why models sometimes “hallucinate”">
        The model always produces a probability distribution over next tokens, and it always produces <em>some</em>{' '}
        continuation. If it lacks a fact, the most plausible-sounding continuation may still be fluent and confident,
        but wrong. Post-training teaches Claude to recognise uncertainty and say "I don't know" or "I'm not sure", and
        Anthropic's interpretability work has found internal "known entity" circuits that help decide whether to
        answer or decline. Giving the model sources in its context (documents, search results via tools) is the most
        reliable way to ground its answers.
      </Callout>
    </Section>
  )
}

function ToolUse() {
  const [i, setI] = useState(0)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="size-5 text-primary" /> The tool-use loop
        </CardTitle>
        <CardDescription>The model never runs code itself. It writes a request in a structured format; your application executes it.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-4 gap-2">
          {TOOL_STEPS.map((s, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              className={cn(
                'rounded-lg border-2 p-2 text-left text-xs transition-all md:p-3 md:text-sm',
                k === i ? 'border-primary bg-primary/5' : 'opacity-60 hover:opacity-100',
              )}
            >
              <div className="font-mono text-muted-foreground">{k + 1}</div>
              <Badge variant={s.who === 'Claude' ? 'default' : 'secondary'}>{s.who}</Badge>
            </button>
          ))}
        </div>
        <p className="leading-7">{TOOL_STEPS[i].t}</p>
        <pre className="overflow-x-auto rounded-lg bg-muted/50 p-4 text-sm leading-6">{TOOL_STEPS[i].code}</pre>
        <div className="flex justify-between">
          <Button variant="outline" size="sm" disabled={i === 0} onClick={() => setI(i - 1)}>Back</Button>
          <Button size="sm" disabled={i === TOOL_STEPS.length - 1} onClick={() => setI(i + 1)}>Next</Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Agents (like Claude Code) are this loop running many times: the model decides on an action, the harness
          executes it, the result is appended to the context, and the model decides on the next action.
        </p>
      </CardContent>
    </Card>
  )
}

function ContextWindow() {
  const items = [
    { label: 'This sentence', tokens: 6 },
    { label: 'A long email', tokens: 600 },
    { label: 'A 20-page report', tokens: 12_000 },
    { label: 'A full novel (~90k words)', tokens: 120_000 },
    { label: 'A mid-sized codebase', tokens: 500_000 },
  ]
  const windows = [
    { label: '200K', tokens: 200_000 },
    { label: '1M', tokens: 1_000_000 },
  ]
  const max = 1_000_000
  return (
    <Card>
      <CardHeader>
        <CardDescription>
          The context window is the maximum number of tokens (prompt + response) the model can attend to at once.
          Claude models have offered 200K-token windows, with some supporting up to 1M; check Anthropic's docs for
          current limits. Log scale:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((it) => {
          const pct = (Math.log10(it.tokens) / Math.log10(max)) * 100
          return (
            <div key={it.label} className="grid grid-cols-[150px_1fr_80px] items-center gap-3 text-sm md:grid-cols-[220px_1fr_90px]">
              <span>{it.label}</span>
              <div className="relative h-4 rounded-sm bg-muted/50">
                <div className="absolute inset-y-0 left-0 rounded-sm bg-primary" style={{ width: `${pct}%` }} />
                {windows.map((w) => (
                  <div
                    key={w.label}
                    className="absolute -inset-y-1 w-0.5 bg-foreground/60"
                    style={{ left: `${(Math.log10(w.tokens) / Math.log10(max)) * 100}%` }}
                  />
                ))}
              </div>
              <span className="text-right font-mono text-muted-foreground">~{it.tokens.toLocaleString()}</span>
            </div>
          )
        })}
        <div className="grid grid-cols-[150px_1fr_80px] gap-3 text-xs text-muted-foreground md:grid-cols-[220px_1fr_90px]">
          <span />
          <div className="relative h-4">
            {windows.map((w) => (
              <span key={w.label} className="absolute -translate-x-full pr-1" style={{ left: `${(Math.log10(w.tokens) / Math.log10(max)) * 100}%` }}>
                {w.label} window
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
