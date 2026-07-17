import Image from 'next/image'

type PPLogoProps = {
  className?: string
  priority?: boolean
}

export function PPLogo({ className = '', priority = false }: PPLogoProps) {
  return (
    <Image
      src="/brand/n3uralia-wordmark.jpeg"
      alt="Property Partners"
      width={240}
      height={72}
      priority={priority}
      unoptimized
      className={className}
    />
  )
}

