export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--n-bg)' }}>
      <div className="n-card p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--n-danger-muted)' }}>
          <svg width="24" height="24" fill="none" stroke="var(--n-danger)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 className="font-semibold mb-2" style={{ color: 'var(--n-fg)' }}>Error de autenticación</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--n-fg-muted)' }}>El enlace expiró o no es válido.</p>
        <a href="/auth/login" className="inline-block text-sm px-4 py-2 rounded font-medium" style={{ background: 'var(--n-primary)', color: 'white' }}>Volver al login</a>
      </div>
    </div>
  )
}
