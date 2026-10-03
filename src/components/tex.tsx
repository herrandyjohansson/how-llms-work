import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

/** Renders a LaTeX formula with KaTeX. */
export function Tex({ children, block, className }: { children: string; block?: boolean; className?: string }) {
  const html = useMemo(
    () => katex.renderToString(children, { displayMode: !!block, throwOnError: false }),
    [children, block],
  )
  if (block)
    return <div className={cn('overflow-x-auto py-2', className)} dangerouslySetInnerHTML={{ __html: html }} />
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
