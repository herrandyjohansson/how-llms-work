import { useEffect, useState } from 'react'
import { Tiktoken } from 'js-tiktoken/lite'

/**
 * Claude's tokenizer is not public, so the live demos use cl100k_base — an open
 * byte-level BPE vocabulary (~100k tokens). The mechanism is the same family;
 * exact splits and IDs differ from Claude's.
 */
let pending: Promise<Tiktoken> | null = null

export function loadTokenizer() {
  pending ??= import('js-tiktoken/ranks/cl100k_base').then((m) => new Tiktoken(m.default))
  return pending
}

export function useTokenizer() {
  const [enc, setEnc] = useState<Tiktoken | null>(null)
  useEffect(() => {
    let alive = true
    loadTokenizer().then((t) => alive && setEnc(t))
    return () => {
      alive = false
    }
  }, [])
  return enc
}

export interface Tok {
  id: number
  text: string
}

export function tokenize(enc: Tiktoken, text: string): Tok[] {
  return enc.encode(text, 'all').map((id) => ({ id, text: enc.decode([id]) }))
}
