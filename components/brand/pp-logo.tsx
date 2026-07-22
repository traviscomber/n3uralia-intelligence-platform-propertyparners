type PPLogoProps = {
  className?: string
  priority?: boolean
}

export function PPLogo({ className = '', priority: _priority = false }: PPLogoProps) {
  return (
    <div className={`inline-flex items-center ${className}`.trim()} aria-label="Property Partners Vitacura">
      <img src="/brand/property-partners-vitacura.png" alt="Property Partners Vitacura" className="h-auto w-full object-contain" loading={_priority ? 'eager' : 'lazy'} />
    </div>
  )
}
