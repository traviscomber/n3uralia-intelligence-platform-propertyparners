'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Factor = { id: string; status: string; friendly_name?: string }

export default function MfaPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/dashboard'
  const [factor, setFactor] = useState<Factor | null>(null)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (assurance.error) {
        setMessage('No fue posible verificar el nivel de seguridad de la sesión.')
        setBusy(false)
        return
      }
      if (assurance.data?.currentLevel === 'aal2') {
        router.replace(nextPath)
        return
      }

      const factors = await supabase.auth.mfa.listFactors()
      if (factors.error) {
        setMessage('No fue posible consultar los factores de autenticación.')
        setBusy(false)
        return
      }

      const existing = factors.data?.totp?.find((item) => item.status === 'verified') || factors.data?.totp?.[0]
      setFactor(existing ? { id: existing.id, status: existing.status, friendly_name: existing.friendly_name } : null)
      setBusy(false)
    }
    void load()
  }, [nextPath, router, supabase.auth.mfa])

  async function enroll() {
    setBusy(true); setMessage('')
    const result = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Property Partners' })
    if (result.error) {
      setMessage('No fue posible crear el segundo factor.')
    } else {
      setFactor({ id: result.data.id, status: 'unverified' })
      setQrCode(result.data.totp.qr_code)
      setSecret(result.data.totp.secret)
    }
    setBusy(false)
  }

  async function verify() {
    if (!factor || code.trim().length < 6) return
    setBusy(true); setMessage('')
    const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id })
    if (challenge.error) {
      setMessage('No fue posible iniciar la verificación.')
      setBusy(false)
      return
    }
    const result = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.data.id, code: code.trim() })
    if (result.error) {
      setMessage('Código inválido o vencido.')
      setBusy(false)
      return
    }
    router.replace(nextPath)
    router.refresh()
  }

  return <main className="min-h-screen bg-[#050707] px-4 py-12 text-white">
    <div className="mx-auto max-w-md border border-white/10 bg-[#0c1111] p-6">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Seguridad</p>
      <h1 className="mt-2 text-2xl font-semibold">Segundo factor</h1>
      <p className="mt-3 text-sm leading-6 text-white/55">Las aprobaciones, emisiones y cambios ejecutivos requieren una sesión verificada con autenticador.</p>

      {busy ? <div role="status" className="mt-6 text-sm text-white/45">Verificando…</div> : null}
      {!busy && !factor ? <button type="button" onClick={() => void enroll()} className="mt-6 min-h-11 w-full bg-[#d7332b] px-4 text-sm font-semibold">Configurar autenticador</button> : null}

      {qrCode ? <div className="mt-6 space-y-4">
        <div className="bg-white p-4"><img src={qrCode} alt="Código QR para configurar el autenticador" className="mx-auto h-48 w-48" /></div>
        <div><p className="text-xs text-white/45">Clave manual</p><code className="mt-1 block break-all border border-white/10 p-3 text-xs text-white/75">{secret}</code></div>
      </div> : null}

      {!busy && factor ? <div className="mt-6">
        <label htmlFor="mfa-code" className="text-xs text-white/55">Código de 6 dígitos</label>
        <input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-2 min-h-12 w-full border border-white/15 bg-black px-4 text-center text-xl tracking-[0.35em] outline-none focus:border-white/40" />
        <button type="button" disabled={busy || code.length !== 6} onClick={() => void verify()} className="mt-3 min-h-11 w-full bg-[#d7332b] px-4 text-sm font-semibold disabled:opacity-40">Confirmar y continuar</button>
      </div> : null}

      {message ? <p role="alert" className="mt-4 text-sm text-[#ff766f]">{message}</p> : null}
    </div>
  </main>
}
