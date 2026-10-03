# How LLMs Work

An interactive lecture explaining, in detail, how a large language model like Claude turns text into text:
tokenization (with a live BPE tokenizer), embeddings and positions, attention (with a fully worked numeric
example), transformer blocks, logits and sampling, the generation loop and KV cache, pretraining,
post-training (RLHF, Constitutional AI) and how Claude's API features map onto the mechanism.

**Live site:** https://herrandyjohansson.github.io/how-llms-work/

Use **Lecture mode** (top right) to present it: ← / → move between the 11 parts.

## Stack

- [Vite](https://vite.dev) + React + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com) (Base UI primitives)
- [KaTeX](https://katex.org) for formulas
- [js-tiktoken](https://github.com/dqbd/tiktoken) running the open `cl100k_base` vocabulary in the browser as a
  stand-in for Claude's unpublished tokenizer

No backend: everything runs client-side.

## Development

```bash
npm install
npm run dev      # http://localhost:5173/how-llms-work/
npm run build
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.

## Accuracy notes

Anthropic has not published Claude's architecture details, parameter count or tokenizer. The site explains the
transformer architecture that all frontier LLMs share, labels illustrative numbers as such, and cites Anthropic's
public research and documentation for Claude-specific material.
