import { ExternalLink } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { H3, Section } from '@/components/layout'

const RECAP = [
  ['Tokenize', 'Text → subword tokens → integer IDs, using a BPE vocabulary learned from data.'],
  ['Embed', 'Each ID looks up a learned vector. Meaning lives in directions of this space; position is added via schemes like RoPE.'],
  ['Attend', 'In every layer, attention heads let each token pull information from earlier tokens (Q·K decides where to look, V is what gets moved).'],
  ['Transform', 'MLPs process each token, recalling facts and computing features. Results are added to the residual stream. Repeat for dozens of layers.'],
  ['Predict', 'The final vector is projected onto the vocabulary → logits → softmax → a probability for every possible next token.'],
  ['Sample', 'Pick one token (temperature, top-p). Append it. Run again. Stop at the end-of-turn token.'],
  ['Learned', 'All weights come from pretraining on trillions of tokens (next-token prediction), then post-training (SFT, RLHF, Constitutional AI, RL) to make a helpful, honest, harmless assistant.'],
]

const FAQ = [
  {
    q: 'Is it “just autocomplete”?',
    a: 'Mechanically, yes: it predicts the next token. But that framing undersells it. Predicting text very well requires building internal models of grammar, facts, reasoning and the intentions of the writer. Interpretability research shows genuine intermediate reasoning steps and planning inside the network. “Next-token prediction” describes the interface, not the limits of what’s computed behind it.',
  },
  {
    q: 'Does Claude look things up in a database?',
    a: 'No. Knowledge is stored implicitly and diffusely in the weights, a compressed, lossy imprint of the training data. There is no table of facts to query. To give it access to current or private information, you put that information in the context (documents, or results from search and other tools).',
  },
  {
    q: 'Does it learn from my conversation?',
    a: 'Not during the conversation: the weights are frozen. It “remembers” earlier messages only because they’re re-sent as part of the input each turn. Whether conversations are ever used for future training is governed by Anthropic’s data policies and your settings, not by the model.',
  },
  {
    q: 'Why does the same prompt give different answers?',
    a: 'Sampling. Each token is drawn from a probability distribution, and each choice changes the input for everything that follows. Lower temperature makes outputs more consistent.',
  },
  {
    q: 'Why does “thinking” make it smarter?',
    a: 'Each token gets a fixed budget of computation (one forward pass). Writing out intermediate steps gives the model more forward passes and lets later steps read the results of earlier ones from the context, like using scratch paper.',
  },
  {
    q: 'Why is it bad at counting letters or some arithmetic?',
    a: 'Tokenization. The model sees “strawberry” as a few opaque token IDs, not ten letters, and numbers are split into chunks that don’t align with place value. Reasoning step by step (spelling the word out, doing column arithmetic) or using a code tool fixes most of these failures.',
  },
  {
    q: 'How big is Claude?',
    a: 'Anthropic does not publish parameter counts, layer counts or training-data sizes for Claude models. Comparable frontier models are generally believed to have hundreds of billions of parameters or more, often using techniques like mixture-of-experts, where only part of the network is active for each token.',
  },
]

const GLOSSARY: [string, string][] = [
  ['Token', 'A chunk of text (often a word or word-piece) that the model treats as one unit.'],
  ['Vocabulary', 'The fixed set of all tokens the model knows, typically 100k–200k+.'],
  ['Embedding', 'The learned vector representing a token; also any internal vector representation.'],
  ['d_model', 'The width of the model: the length of each token vector in the residual stream.'],
  ['Attention head', 'One Q/K/V mechanism that moves information between token positions.'],
  ['Causal mask', 'Prevents tokens from attending to future positions.'],
  ['MLP / feed-forward', 'Per-token neural network inside each block; most parameters live here.'],
  ['Residual stream', 'The running vector for each token that every layer reads from and adds to.'],
  ['Logits', 'Raw scores for every vocabulary token, before softmax.'],
  ['Temperature', 'Scales logits before softmax; controls randomness.'],
  ['Context window', 'Maximum number of tokens the model can process at once.'],
  ['KV cache', 'Stored keys and values of past tokens, reused during generation.'],
  ['Pretraining', 'Learning next-token prediction on a massive text corpus.'],
  ['RLHF / RLAIF', 'Reinforcement learning from human (or AI) preference feedback.'],
  ['Constitutional AI', 'Anthropic’s method of training with a written set of principles and AI feedback.'],
  ['Hallucination', 'Fluent but false output, produced because the model always generates a plausible continuation.'],
]

const READING = [
  { t: 'Attention Is All You Need (Vaswani et al., 2017)', u: 'https://arxiv.org/abs/1706.03762', d: 'The paper that introduced the transformer.' },
  { t: 'Transformer Circuits Thread (Anthropic)', u: 'https://transformer-circuits.pub/', d: 'Anthropic’s interpretability research, including induction heads, superposition and circuit tracing.' },
  { t: 'Scaling Monosemanticity (Anthropic, 2024)', u: 'https://transformer-circuits.pub/2024/scaling-monosemanticity/', d: 'Extracting interpretable features from Claude 3 Sonnet.' },
  { t: 'On the Biology of a Large Language Model (Anthropic, 2025)', u: 'https://transformer-circuits.pub/2025/attribution-graphs/biology.html', d: 'Tracing multi-step reasoning, planning and multilingual circuits inside Claude 3.5 Haiku.' },
  { t: 'Constitutional AI (Bai et al., 2022)', u: 'https://arxiv.org/abs/2212.08073', d: 'Anthropic’s method for training harmless assistants with AI feedback.' },
  { t: 'Claude documentation', u: 'https://docs.claude.com/', d: 'Tokens, context windows, tool use, extended thinking and prompt caching in practice.' },
  { t: '3Blue1Brown: Neural networks & transformers', u: 'https://www.3blue1brown.com/topics/neural-networks', d: 'Beautiful visual explanations of attention and MLPs.' },
]

export function Recap() {
  return (
    <Section
      id="recap"
      number={11}
      title="Recap, questions and further reading"
      kicker="The entire lecture on one screen, the questions audiences always ask, and where to go deeper."
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {RECAP.map(([t, d], i) => (
          <Card key={t} size="sm">
            <CardContent className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-sm text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <div className="font-semibold">{t}</div>
                <div className="mt-1 leading-6 text-muted-foreground">{d}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <H3>Frequently asked questions</H3>
      <Accordion className="max-w-3xl">
        {FAQ.map((f) => (
          <AccordionItem key={f.q} value={f.q}>
            <AccordionTrigger className="text-base">{f.q}</AccordionTrigger>
            <AccordionContent className="text-base leading-7 text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <H3>Glossary</H3>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Term</TableHead>
                <TableHead>Meaning</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {GLOSSARY.map(([t, d]) => (
                <TableRow key={t}>
                  <TableCell className="font-medium">{t}</TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">{d}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <H3>Further reading</H3>
      <div className="grid gap-3 md:grid-cols-2">
        {READING.map((r) => (
          <a key={r.u} href={r.u} target="_blank" rel="noreferrer" className="group">
            <Card size="sm" className="h-full transition-colors group-hover:ring-primary/50">
              <CardContent>
                <div className="flex items-start justify-between gap-2 font-medium">
                  {r.t} <ExternalLink className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="mt-1 text-muted-foreground">{r.d}</div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </Section>
  )
}
