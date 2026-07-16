import Image from 'next/image'

type PPLogoProps = {
  className?: string
  priority?: boolean
}

export function PPLogo({ className = '', priority = false }: PPLogoProps) {
  return (
    <Image
      src="/n3uralia-logo.webp"
      alt="Property Partners"
      width={240}
      height={72}
      priority={priority}
      className={className}
    />
  )
}
