'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, CircleDot, Filter, Network, RotateCcw } from 'lucide-react'
import type {
  ExecutiveDecisionGraph,
  ExecutiveDecisionGraphEdgeType,
} from '@/lib/executive-decision-graph'

type GraphFilter = 'all' | ExecutiveDecisionGraphEdgeType

type Props = {