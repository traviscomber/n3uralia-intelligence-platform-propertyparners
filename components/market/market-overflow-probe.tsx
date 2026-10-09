'use client'

import { useEffect, useState } from 'react'

type BoxInfo = {
  name: string
  className: string
  left: number
  right: number
  width: number
  scroll: number
  client: number
  overflowX: string
  overflowY: string
}

function takeBox(el: Element, name: string): BoxInfo {
  const rect = el.getBoundingClientRect()
  const style = window.getComputedStyle(el)
  return {
    name,
    className: typeof el.className === 'string' ? el.className.slice(0, 120) : '',
    left: Math.round(rect.left),
    right: Math.round(rect.right),
    width: Math.round(rect.width),
    scroll: (el as HTMLElement).scrollWidth ?? 0,
    client: (el as HTMLElement).clientWidth ?? 0,
    overflowX: style.overflowX,
    overflowY: style.overflowY,
  }
}

export function MarketOverflowProbe() {
  const [details, setDetails] = useState<string | null>(null)
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('_market_diag')) return
    const raf = window.requestAnimationFrame(() => {
      const selectors = [
        'html', 'body', '.dashboard-shell', '.dashboard-content',
        '.market-responsive-shell', '.market-responsive-shell nav',
        '.market-responsive-shell > div', '.dashboard-content main',
      ]
      const roots = selectors.flatMap((selector) => {
        const el = document.querySelector(selector)
        return el ? [takeBox(el, selector)] : []
      })
      const viewportWidth = document.documentElement.clientWidth
      const offenders = [...document.querySelectorAll('body *')]
        .map((el) => takeBox(el, el.tagName.toLowerCase()))
        .filter((item) => (
          (item.right > viewportWidth + 2 && item.left < viewportWidth + 2)
          || (item.scroll > item.client + 3 && item.client > 0)
          || item.left < -2
        ))
        .sort((a, b) => (
          (b.right - viewportWidth) + (b.scroll - b.client)
        ) - ((a.right - viewportWidth) + (a.scroll - a.client)))
        .slice(0, 25)
      setDetails(JSON.stringify({
        viewport: { innerWidth: window.innerWidth, clientWidth: viewportWidth },
        roots, offenders,
      }))
    })
    return () => window.cancelAnimationFrame(raf)
  }, [])

  return details
    ? <output data-testid="market-overflow-diagnostics" className="mb-4 block min-w-0 max-w-full break-all border border-[var(--n3-line)] p-2 text-[10px] leading-4 text-[var(--n3-text-light)]">
      <strong>QA LAYOUT DIAGNOSTICS</strong>
      <span className="block">{details}</span>
    </output>
    : null
}
