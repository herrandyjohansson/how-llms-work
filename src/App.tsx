import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Moon, Presentation, Sun, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Attention } from '@/sections/Attention'
import { ClaudeInPractice } from '@/sections/Claude'
import { Embeddings } from '@/sections/Embeddings'
import { Generation } from '@/sections/Generation'
import { Hero } from '@/sections/Hero'
import { Pipeline } from '@/sections/Pipeline'
import { Recap } from '@/sections/Recap'
import { Sampling } from '@/sections/Sampling'
import { Tokenization } from '@/sections/Tokenization'
import { PostTraining, Pretraining } from '@/sections/Training'
import { Transformer } from '@/sections/Transformer'
import { cn } from '@/lib/utils'

const NAV = [
  { id: 'top', label: 'Introduction' },
  { id: 'pipeline', label: 'The whole journey' },
  { id: 'tokenization', label: 'Tokenization' },
  { id: 'embeddings', label: 'Embeddings & position' },
  { id: 'attention', label: 'Attention' },
  { id: 'transformer', label: 'Transformer blocks' },
  { id: 'sampling', label: 'Logits & sampling' },
  { id: 'generation', label: 'The generation loop' },
  { id: 'pretraining', label: 'Pretraining' },
  { id: 'posttraining', label: 'Post-training' },
  { id: 'claude', label: 'Claude in practice' },
  { id: 'recap', label: 'Recap & FAQ' },
]

function useStoredState<T extends string>(key: string, initial: () => T) {
  const [v, setV] = useState<T>(() => {
    try {
      return (localStorage.getItem(key) as T) || initial()
    } catch {
      return initial()
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, v)
    } catch {
      /* storage unavailable */
    }
  }, [key, v])
  return [v, setV] as const
}

export default function App() {
  const [theme, setTheme] = useStoredState<'light' | 'dark'>('theme', () =>
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  )
  const [lecture, setLecture] = useState(false)
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  useEffect(() => {
    document.documentElement.classList.toggle('lecture', lecture)
  }, [lecture])

  // Track which section is on screen and how far through the page we are.
  useEffect(() => {
    const onScroll = () => {
      const els = NAV.map((n) => document.getElementById(n.id))
      let idx = 0
      els.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.35) idx = i
      })
      setActive(idx)
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? window.scrollY / max : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goTo = useCallback((i: number) => {
    const n = NAV[Math.max(0, Math.min(NAV.length - 1, i))]
    document.getElementById(n.id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!lecture) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [role="slider"], [role="tab"]')) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        goTo(active + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        goTo(active - 1)
      } else if (e.key === 'Escape') setLecture(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lecture, active, goTo])

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 md:px-6">
          <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary font-mono text-sm text-primary-foreground">
              t→
            </span>
            <span className="hidden sm:inline">How LLMs Work</span>
          </a>
          <span className="truncate text-sm text-muted-foreground">
            <span className="mx-2 hidden sm:inline">/</span>
            {NAV[active].label}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button variant={lecture ? 'default' : 'ghost'} size="sm" onClick={() => setLecture((l) => !l)}>
              <Presentation /> <span className="hidden sm:inline">Lecture mode</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun /> : <Moon />}
            </Button>
          </div>
        </div>
        <div className="h-0.5 bg-primary transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
      </header>

      <div className="mx-auto flex max-w-7xl gap-10 px-4 md:px-6">
        <aside className={cn('sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto py-10 xl:block', lecture && 'xl:hidden')}>
          <nav className="space-y-0.5 text-sm">
            {NAV.map((n, i) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  i === active && 'bg-muted font-medium text-foreground',
                )}
              >
                <span className={cn('w-5 font-mono text-xs', i === active && 'text-primary')}>
                  {i === 0 ? '—' : String(i).padStart(2, '0')}
                </span>
                {n.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-24">
          <Hero onStartLecture={() => setLecture(true)} />
          <Pipeline />
          <Tokenization />
          <Embeddings />
          <Attention />
          <Transformer />
          <Sampling />
          <Generation />
          <Pretraining />
          <PostTraining />
          <ClaudeInPractice />
          <Recap />
          <footer className="border-t py-10 text-sm text-muted-foreground">
            An interactive explainer of transformer language models. Not affiliated with Anthropic. Illustrative
            numbers are labelled as such; the live tokenizer uses the open cl100k_base vocabulary as a stand-in for
            Claude's unpublished tokenizer.
          </footer>
        </main>
      </div>

      {lecture && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background/90 px-2 py-1.5 shadow-lg backdrop-blur-md">
          <Button variant="ghost" size="icon" aria-label="Previous part" onClick={() => goTo(active - 1)} disabled={active === 0}>
            <ChevronLeft />
          </Button>
          <span className="min-w-44 text-center text-sm">
            <span className="font-mono text-muted-foreground">
              {active}/{NAV.length - 1}
            </span>{' '}
            {NAV[active].label}
          </span>
          <Button variant="ghost" size="icon" aria-label="Next part" onClick={() => goTo(active + 1)} disabled={active === NAV.length - 1}>
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Exit lecture mode" onClick={() => setLecture(false)}>
            <X />
          </Button>
        </div>
      )}
    </TooltipProvider>
  )
}
