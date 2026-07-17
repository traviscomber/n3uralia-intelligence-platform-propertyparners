export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full text-center shadow-sm" style={{ border: '1px solid #e5e7eb' }}>
        <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#fef3f2' }}>
          <svg width="24" height="24" fill="none" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 className="font-semibold mb-2 text-gray-900">Error de autenticación</h2>
        <p className="text-sm mb-4 text-gray-600">El enlace expiró o no es válido.</p>
        <a href="/auth/login" className="inline-block text-sm px-4 py-2 rounded font-medium text-white hover:opacity-90 transition-colors" style={{ background: '#d61f2c' }}>Volver al ingreso</a>
      </div>
    </div>
  )
}

