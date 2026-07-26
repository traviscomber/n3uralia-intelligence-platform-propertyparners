'use client'

import { useEffect, useState } from 'react'
import { CEOAIAssistantWidget } from './ceo-ai-assistant-widget'

export function CEOAssistantSession({
  userRole,
}: {
  userRole: string
}) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (userRole === 'ceo') {
      setActive(true)
    }
  }, [userRole])

  if (!active) return null

  return <CEOAIAssistantWidget />
}
