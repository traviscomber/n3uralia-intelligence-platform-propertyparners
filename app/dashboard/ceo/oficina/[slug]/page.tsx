import { CeoOfficeDetail } from '@/components/management/ceo-office-detail'

export default async function CeoOfficePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  return <CeoOfficeDetail slug={slug}/>
}
