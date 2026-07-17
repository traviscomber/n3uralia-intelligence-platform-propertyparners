import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { findBestDuplicateMatch, mergePropertyRecord, type PropertyLike } from '@/lib/property-dedupe'

export const runtime = 'nodejs'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}

export async function POST() {
  try {
    const supabase = getSupabaseClient()
    const { data: rows, error } = await supabase
      .from('properties')
      .select('id,address,neighborhood,property_type,price_uf,area_m2,bedrooms,bathrooms,lat,lng,source,source_url,image_url,listing_number,tags,source_listing_id,external_id')
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    const inventory = ((rows || []) as Array<PropertyLike & { id: string }>)
    const survivors: Array<PropertyLike & { id: string }> = []
    const survivorIndexById = new Map<string, number>()
    const deletes: string[] = []
    const auditTrail: Array<{
      survivor_id: string
      survivor_address: string
      incoming_id: string
      incoming_address: string
      neighborhood: string | null
      property_type: string | null
      source: string | null
      score: number
      reason: string
    }> = []
    let mergedCount = 0

    for (const row of inventory) {
      const match = findBestDuplicateMatch(survivors, row)
      if (!match?.row?.id || match.score < 90) {
        survivorIndexById.set(row.id, survivors.length)
        survivors.push(row)
        continue
      }

      const survivorIndex = survivorIndexById.get(match.row.id)
      const survivor = survivorIndex != null ? survivors[survivorIndex] : match.row
      const merged = mergePropertyRecord(survivor, row)
      const targetId = survivor.id
      const reasonParts = [
        survivor.listing_number && row.listing_number && survivor.listing_number === row.listing_number ? 'same listing_number' : null,
        survivor.source_url && row.source_url && survivor.source_url === row.source_url ? 'same source_url' : null,
        survivor.external_id && row.external_id && survivor.external_id === row.external_id ? 'same external_id' : null,
        survivor.source_listing_id && row.source_listing_id && survivor.source_listing_id === row.source_listing_id ? 'same source_listing_id' : null,
        survivor.address === row.address ? 'same address' : null,
      ].filter(Boolean) as string[]

      const { error: updateError } = await supabase
        .from('properties')
        .update({
          address: merged.address,
          neighborhood: merged.neighborhood,
          property_type: merged.property_type,
          price_uf: merged.price_uf,
          area_m2: merged.area_m2,
          bedrooms: merged.bedrooms,
          bathrooms: merged.bathrooms,
          lat: merged.lat,
          lng: merged.lng,
          source: merged.source,
          source_url: merged.source_url,
          image_url: merged.image_url,
          listing_number: merged.listing_number,
          tags: merged.tags,
          source_listing_id: merged.source_listing_id,
          external_id: merged.external_id,
        })
        .eq('id', targetId)

      if (updateError) {
        throw updateError
      }

      const updatedSurvivor = { ...survivor, ...merged, id: targetId }
      if (survivorIndex != null) {
        survivors[survivorIndex] = updatedSurvivor
      } else {
        survivorIndexById.set(targetId, survivors.length)
        survivors.push(updatedSurvivor)
      }

      deletes.push(row.id)
      mergedCount += 1
      auditTrail.push({
        survivor_id: targetId,
        survivor_address: survivor.address,
        incoming_id: row.id,
        incoming_address: row.address,
        neighborhood: merged.neighborhood,
        property_type: merged.property_type,
        source: merged.source,
        score: match.score,
        reason: reasonParts.length ? reasonParts.join(' · ') : 'match by similarity threshold',
      })
    }

    if (deletes.length > 0) {
      const { error: deleteError } = await supabase.from('properties').delete().in('id', deletes)
      if (deleteError) {
        throw deleteError
      }
    }

    return NextResponse.json({
      success: true,
      merged: mergedCount,
      removed: deletes.length,
      survivors: survivors.length,
      auditTrail: auditTrail.slice(-12).reverse(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Dedupe failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
