import { collectPortalListingDetails } from '../lib/portal-inmobiliario-collector'

const listingUrls = [
  'https://www.portalinmobiliario.com/MLC-4510794978-bradford-casa-bien-emplazada-remodelada-_JM',
  'https://www.portalinmobiliario.com/MLC-4491449182-precioso-jardin-casa-amplia-con-gran-potencial-bradford-_JM',
  'https://www.portalinmobiliario.com/MLC-4328823446-para-remodelar-solida-frente-a-plaza-_JM',
]

async function main() {
  const result=await collectPortalListingDetails({datasetKind:'portal_houses',listingUrls,waitMs:150})
  console.log('PORTAL_LAZY_GEO_RESULT='+JSON.stringify({
    rows:result.rows.map(row=>({id:row.source_listing_id,lat:row.latitude??null,lng:row.longitude??null,nearby:Array.isArray(row.nearby_places)?row.nearby_places.length:0})),
    failures:result.failures,
  }))
}
main().catch((error)=>{console.error(error);process.exit(1)})
