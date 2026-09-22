import { OperationalState } from '@/components/ui/operational-state'

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl py-8">
      <OperationalState
        kind="loading"
        title="Cargando información operativa"
        description="Verificando perfil, permisos y fuentes autorizadas."
      />
    </div>
  )
}
