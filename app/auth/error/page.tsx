export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--n3-black)]">
      <div className="w-full max-w-sm rounded-lg border border-[var(--n3-line)] bg-[var(--n3-dark-surface)] p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(139,169,167,0.08)' }}>
          <svg width="24" height="24" fill="none" stroke="var(--n3-teal)" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="mb-2 font-semibold text-[var(--n3-text-light)]">Error de autenticacion</h2>
        <p className="mb-4 text-sm" style={{ color: 'var(--n3-text-muted)' }}>El enlace expiro o no es valido.</p>
        <a href="/auth/login" className="inline-block rounded px-4 py-2 text-sm font-medium transition-colors hover:opacity-90" style={{ background: 'var(--n3-teal)', color: 'var(--n3-black)' }}>Volver al ingreso</a>
      </div>
    </div>
  )
}
