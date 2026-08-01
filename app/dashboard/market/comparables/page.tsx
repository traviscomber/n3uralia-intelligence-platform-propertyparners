import { MarketComparableConnector } from '@/components/market/market-comparable-connector'
import { IntelligenceHeader, IntelligencePage, MethodologyNote } from '@/components/intelligence/design-system'
import { requireAnyPageCapability } from '@/lib/access-guards'

export default async function MarketComparablesPage(){
  await requireAnyPageCapability(['valuations.self.create','valuations.office.review','valuations.global.approve'])
  return <IntelligencePage>
    <IntelligenceHeader eyebrow="Integración contractual" title="Mercado → comparable → valorización" description="Conecta publicaciones persistidas del Módulo I con expedientes de valorización en borrador, conservando referencia, precio y fecha observada."/>
    <MethodologyNote>La publicación se incorpora como candidato. Debe ser aceptada, excluida o ajustada dentro del expediente. Una publicación no se presenta como venta confirmada.</MethodologyNote>
    <MarketComparableConnector/>
  </IntelligencePage>
}
