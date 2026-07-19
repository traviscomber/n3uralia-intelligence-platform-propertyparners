#!/usr/bin/env node
/**
 * Vitacura scraper coordinator CLI.
 *
 * Usage:
 *   node scripts/run-scrapers.mjs                          # portal + datainmobiliaria, all kinds
 *   node scripts/run-scrapers.mjs --kind=houses             # only casas
 *   node scripts/run-scrapers.mjs --kind=departments        # only departamentos
 *   node scripts/run-scrapers.mjs --source=portal           # only portal route
 *   node scripts/run-scrapers.mjs --source=datainmobiliaria # only Data Inmobiliaria route
 *
 * Required env:
 *   NEXT_PUBLIC_APP_URL
 *   APP_PASSWORD or NEXT_PUBLIC_APP_PASSWORD
 */

import { createClient } from '@supabase/supabase-js'
import { argv, env, exit } from 'process'

function getArg(name) {
  const flag = argv.find((entry) => entry.startsWith(`--${name}=`))
  return flag ? flag.split('=').slice(1).join('=') : null
}

const SOURCE_ARG = getArg('source') || 'all'
const KIND_ARG = getArg('kind') || 'all'
const LIMIT = Number.parseInt(getArg('limit') || getArg('pages') || '60', 10)
const OPERATION = getArg('operation') || 'venta'
const BASE_URL = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const INTERNAL_KEY = env.APP_PASSWORD || env.NEXT_PUBLIC_APP_PASSWORD || env.SCRAPER_INTERNAL_KEY || ''

if (OPERATION !== 'venta') {
  console.error('[scrapers] This pack is Vitacura sales-only. Use --operation=venta.')
  exit(1)
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[scrapers] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

const SOURCES = SOURCE_ARG === 'all'
  ? [{ name: 'vitacura', route: 'vitacura' }]
  : SOURCE_ARG === 'portal'
    ? [{ name: 'portal_inmobiliario', route: 'portal-inmobiliario' }]
    : SOURCE_ARG === 'datainmobiliaria'
      ? [{ name: 'datainmobiliaria', route: 'datainmobiliaria' }]
      : [{ name: SOURCE_ARG, route: SOURCE_ARG }]

async function callScrapeRoute(target) {
  const url = `${BASE_URL}/api/scrape/${target.route}`
  const body = target.route === 'vitacura'
    ? { source: SOURCE_ARG, kind: KIND_ARG, limit: LIMIT }
    : target.route === 'portal-inmobiliario'
      ? { source: KIND_ARG === 'all' ? 'all' : KIND_ARG, limit: LIMIT }
      : { source: 'vitacura', kind: KIND_ARG, limit: LIMIT }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(INTERNAL_KEY ? { 'x-internal-key': INTERNAL_KEY } : {}),
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let payload
  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    payload = { raw: text }
  }

  if (!response.ok) {
    const detail = typeof payload === 'object' && payload && 'error' in payload ? payload.error : text.slice(0, 200)
    throw new Error(`${target.name} returned ${response.status}: ${detail}`)
  }

  return payload
}

function printSummary(results) {
  console.log('\nSCRAPE SUMMARY')
  console.log('==============')
  let totalFound = 0
  let totalInserted = 0
  let totalUpdated = 0
  let totalErrors = 0

  for (const result of results) {
    const errors = Array.isArray(result.errors) ? result.errors.length : 0
    totalFound += Number(result.scraped ?? result.found ?? 0)
    totalInserted += Number(result.inserted ?? 0)
    totalUpdated += Number(result.updated ?? 0)
    totalErrors += errors
    console.log(`${String(result.source).padEnd(22)} found=${result.scraped ?? result.found ?? 0} inserted=${result.inserted ?? 0} updated=${result.updated ?? 0} errors=${errors}`)
  }

  console.log('--------------')
  console.log(`TOTAL found=${totalFound} inserted=${totalInserted} updated=${totalUpdated} errors=${totalErrors}`)
}

async function main() {
  console.log(`[scrapers] vitacura coordinator | source=${SOURCE_ARG} kind=${KIND_ARG} limit=${LIMIT}`)

  const results = []

  for (const source of SOURCES) {
    try {
      const payload = await callScrapeRoute(source)
      results.push({
        source: source.name,
        scraped: payload.scraped ?? payload.found ?? 0,
        inserted: payload.inserted ?? 0,
        updated: payload.updated ?? 0,
        errors: payload.errors ?? [],
      })
      console.log(`[scrapers] ${source.name} done`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.push({ source: source.name, scraped: 0, inserted: 0, updated: 0, errors: [message] })
      console.error(`[scrapers] ${source.name} failed: ${message}`)
    }
  }

  printSummary(results)

  const { count, error } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })

  if (!error) {
    console.log(`[scrapers] total vitacura properties=${count ?? 'unknown'}`)
  }
}

main().catch((error) => {
  console.error('[scrapers] fatal:', error)
  exit(1)
})
