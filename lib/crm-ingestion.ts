import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

export type CrmManifestSheet = {
  name: string
  cellDigest: string
}

export type CrmManifestWorkbook = {
  path: string
  sha256: string
  size: number
  modifiedAt: string
  ingestedAt: string
  dataset: string
  period: string | null
  sourceRole: string
  sheets: CrmManifest