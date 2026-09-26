import { collectPortalListingDetails } from '../lib/portal-inmobiliario-collector'

const cases = [
  {
    id:'4087925792',
    expected:'Santa María',
    url:'https://www.portalinmobiliario.com/MLC-4087925792-nueva-a-estrenar-santa-maria-de-manquehue-_JM'
  },
  {
    id:'4029202872',
    expected:'Jardín del Este',
    url:'https://www.portalinmobiliario.com/MLC-4029202872-casa-en-venta-condominio-sector-espoz-_JM'
  },
  {
    id:'2147886509',
    expected:'Sport Frances',
    url:'https://www.portalinmobiliario.com/MLC-2147886509-mediterranea-colegio-manquehue-_JM'
  }
]

async function main(){
  const result=await collectPortalListingDetails({
    datasetKind:'portal_houses',
    listingUrls:cases.map(c=>c.url),
    waitMs:150
  })
  console.log('PEDRO_COMPARE_CAPTURE='+JSON.stringify({
    rows:result.rows.map(row=>({
      id:row.source_listing_id,
      lat:row.latitude??null,
      lng:row.longitude??null,
      address:row.address??null,
      title:row.title??null,
      nearby_places:Array.isArray(row.nearby_places)?row.nearby_places:[],
    })),
    failures:result.failures,
  }))
}
main().catch(err=>{console.error(err);process.exit(1)})
