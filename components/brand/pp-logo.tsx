type PPLogoProps = {
  className?: string
  priority?: boolean
}

export function PPLogo({ className = '', priority: _priority = false }: PPLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`.trim()} aria-label="N3uralia">
      <div
        className="flex aspect-square h-full min-h-[24px] items-center justify-center overflow-hidden rounded-sm bg-[var(--n3-black)]"
        style={{
          boxShadow: 'inset 0 0 0 1px rgba(139,169,167,0.18)',
          borderBottom: '2px solid var(--n3-teal)',
        }}
      >
        <img
          src="/brand/n3uralia-mark.jpeg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
          loading={_priority ? 'eager' : 'lazy'}
        />
      </div>
      <div className="font-display text-[11px] uppercase tracking-[0.22em] text-[var(--n3-text-light)]">
        N3uralia
      </div>
    </div>
  )
}
