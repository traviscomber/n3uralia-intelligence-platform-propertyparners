'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowRight, Network, RotateCcw } from 'lucide-react'
import { buildExecutiveCases } from '@/lib/executive-cases'
import {
  buildEvidenceTimeline,
  type ExecutiveDecisionGraph,
  type ExecutiveDecision