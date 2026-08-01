import { OperationalState } from '@/components/ui/operational-state'

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl py-8">
      <OperationalState
        kind="loading"
        title="Cargando información operativa"
        description="Estamos verificando el perfil, los permisos y las fuentes autorizadas antes de mostrar resultados. No se presentan datos parciales como definitivos."
      />
    </div>
  )
}
