'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState, type ComponentType, type ReactNode, type RefObject } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  CircleDot,
  Crosshair,
  Database,
  FileText,
  Mail,
  Monitor,
  Phone,
  Plus,
  Workflow,
} from 'lucide-react'

type NavLink = {
  label: string
  href: string
}

type FocusStyle = {
  opacity: number
  scale: number
  blur: number
  translate: number
}

type SiteShellProps = {
  children: ReactNode
  footerVariant?: 'dark' | 'light'
}

const navLinks: NavLink[] = [
  { label: 'Expertise', href: '/es/soluciones' },
  { label: 'Projects', href: '/es/proyectos' },
  { label: 'Products', href: '/es/productos' },
  { label: 'Diagnosis', href: '/es/diagnostico' },
  { label: 'About', href: '/es/about' },
]

const footerLinks: NavLink[] = [
  { label: 'Expertise', href: '/es/soluciones' },
  { label: 'Projects', href: '/es/proyectos' },
  { label: 'Products', href: '/es/productos' },
  { label: 'Diagnosis', href: '/es/diagnostico' },
  { label: 'About', href: '/es/about' },
  { label: 'Contact', href: '/es/diagnostico#contacto' },
]

const landingModules = [
  {
    id: 'operational-intelligence',
    number: '01',
    title: 'Operational Intelligence',
    body: 'Unify data and context across the business to reveal what matters and act with clarity.',
    href: '/es/soluciones#operational-intelligence',
    graphic: '/assets/graphics/operational-intelligence-stack.svg',
    telemetry: [
      'LAYER STACK 01',
      'D1 - DATA',
      'D2 - CONTEXT',
      'D3 - INSIGHT',
      'D4 - ACTION',
      '',
      'NODES',
      '00 - ACTIVE',
      '01 - LINK',
      '02 - SYNCED',
    ],
  },
  {
    id: 'workflow-automation',
    number: '02',
    title: 'Workflow Automation',
    body: 'Design, automate, and govern workflows that scale with precision and stay adaptable.',
    href: '/es/soluciones#workflow-automation',
    graphic: '/assets/graphics/workflow-automation-core.svg',
    telemetry: [
      'FLOW ARCHITECTURE',
      'SYS. 18',
      'STATUS',
      '01 - ACTIVE',
      '02 - STAGED',
      '',
      'TASKS',
      '101 - DETECTING',
      '102 - ROUTING',
      '103 - VALID',
      '104 - COMPLETE',
    ],
  },
  {
    id: 'production-ai-systems',
    number: '03',
    title: 'Production AI Systems',
    body: 'Build secure, observable AI systems that deliver real impact in production.',
    href: '/es/soluciones#production-ai-systems',
    graphic: '/assets/graphics/production-ai-system-core.svg',
    telemetry: [
      'AI STACK',
      'CORE 2.3',
      '',
      'NODES',
      '80.234K',
      'V2.1.8',
      '',
      'THROUGHPUT',
      '256 ms -> 7%',
      '',
      'LATENCY',
      '< 11 ms',
    ],
  },
]

const projectPreviews = [
  {
    number: '01',
    name: 'Motil',
    industry: 'Railroad',
    description: 'AI-powered operations platform for transport asset reliability, maintenance, risk, and efficiency.',
  },
  {
    number: '02',
    name: 'DocuFleet / LABBE',
    industry: 'Transportation',
    description: 'Digital document and compliance management for heavy equipment fleets and site operations.',
  },
  {
    number: '03',
    name: 'SegurIA',
    industry: 'Security',
    description: 'AI-driven security monitoring and incident detection across critical infrastructure.',
  },
]

const productPreviews = [
  {
    name: 'Clarity',
    summary: 'Unified visibility across data, teams, and activities. Real-time insights built on live context.',
  },
  {
    name: 'MermasApp',
    summary: 'Workflow automation platform for approvals, routing, and operational processes.',
  },
  {
    name: 'N3 Document Intelligence',
    summary: 'Extract, classify, and understand documents at scale with enterprise-grade accuracy.',
  },
  {
    name: 'N3 AI Agents Layer',
    summary: 'Deploy intelligent agents that collaborate, execute, and adapt within your operations.',
  },
]

const methodSteps = [
  { number: '01', title: 'Diagnose', body: 'We uncover complexity and define what matters.' },
  { number: '02', title: 'Architect', body: 'We design intelligent systems and operating models.' },
  { number: '03', title: 'Build', body: 'We develop, test, and validate with precision.' },
  { number: '04', title: 'Integrate', body: 'We connect systems, data, and people.' },
  { number: '05', title: 'Improve', body: 'We learn, adapt, and continuously optimize.' },
]

const diagnosisItems = [
  {
    number: '01',
    title: 'Systems Assessment',
    body: 'We examine your systems, data, and workflows end to end.',
    icon: Monitor,
  },
  {
    number: '02',
    title: 'Opportunity Analysis',
    body: 'We identify high-impact use cases AI and automation can unlock with real leverage.',
    icon: Database,
  },
  {
    number: '03',
    title: 'Solution Roadmap',
    body: 'We design the right path forward with a phased, practical plan.',
    icon: Workflow,
  },
  {
    number: '04',
    title: 'ROI Estimate',
    body: 'We quantify value, time savings, effort, and impact to guide confident decisions.',
    icon: FileText,
  },
]

const solutionsSections = [
  {
    id: 'operational-intelligence',
    title: 'Operational Intelligence',
    body: 'Unify fragmented data, documents, and decisions into one operational layer.',
    points: ['Data models aligned to the business', 'Operational context captured in one place', 'Decision support for complex workflows'],
  },
  {
    id: 'workflow-automation',
    title: 'Workflow Automation',
    body: 'Design flow rules, approvals, and escalation paths that keep work moving.',
    points: ['Approval chains', 'Task routing', 'Auditability and traceability'],
  },
  {
    id: 'production-ai-systems',
    title: 'Production AI Systems',
    body: 'Build AI systems that are observable, governed, and ready for real teams.',
    points: ['Safe deployment patterns', 'Usage and quality monitoring', 'Human-in-the-loop oversight'],
  },
  {
    id: 'ai-agents',
    title: 'AI Agents and Copilots',
    body: 'Add focused assistants that support operators, analysts, and leadership.',
    points: ['Context-aware actions', 'Tool and data access', 'Role-specific prompts'],
  },
  {
    id: 'full-stack-platforms',
    title: 'Full-stack Operational Platforms',
    body: 'Connect front-end portals, back-office logic, and decision systems.',
    points: ['Product UX', 'Back-end services', 'Workflow engines'],
  },
  {
    id: 'dashboards',
    title: 'Dashboards and Command Centers',
    body: 'Surface the right operational signal at the right level of detail.',
    points: ['Executive views', 'Operational monitors', 'Actionable exceptions'],
  },
  {
    id: 'internal-portals',
    title: 'Internal Portals',
    body: 'Internal interfaces for teams that need clarity, access, and control.',
    points: ['Role-based views', 'Centralized task surfaces', 'Operational handoff'],
  },
  {
    id: 'document-intelligence',
    title: 'Document Intelligence',
    body: 'Classify, extract, and structure documents with traceable logic.',
    points: ['Extraction pipelines', 'Validation flows', 'Searchable records'],
  },
  {
    id: 'data-integrations',
    title: 'Data Integrations and APIs',
    body: 'Connect internal systems, external sources, and operating data.',
    points: ['Stable API contracts', 'ETL / ELT integration', 'Reusable connectors'],
  },
  {
    id: 'governance',
    title: 'Governance, Traceability and Permissions',
    body: 'Keep the system safe, auditable, and aligned with business rules.',
    points: ['Access control', 'Change history', 'Operational traceability'],
  },
  {
    id: 'human-in-the-loop',
    title: 'Human-in-the-loop Workflows',
    body: 'Let people validate, override, and guide automation when it matters.',
    points: ['Review queues', 'Escalation paths', 'Quality checkpoints'],
  },
  {
    id: 'deployment-monitoring',
    title: 'Deployment, Monitoring and Continuous Improvement',
    body: 'Ship responsibly, observe behavior, and improve over time.',
    points: ['Environment discipline', 'Runtime observability', 'Iteration loops'],
  },
]

const projectsSections = [
  {
    id: 'motil',
    name: 'Motil',
    industry: 'Railroad',
    problem: 'Operational visibility was fragmented across maintenance, risk, and transport assets.',
    built: 'An AI-powered operations platform with asset tracking, reliability signals, and escalation views.',
    value: 'A single command surface for teams that manage operational reliability and planning.',
    tags: ['operations', 'asset intelligence', 'maintenance'],
  },
  {
    id: 'docufleet-labbe',
    name: 'DocuFleet / LABBE',
    industry: 'Transportation',
    problem: 'Compliance documents and fleet records were scattered across manual processes.',
    built: 'A document and compliance system with structured records, review queues, and traceable status.',
    value: 'Reduced friction for teams that need current documents and reliable operational control.',
    tags: ['documents', 'compliance', 'fleet'],
  },
  {
    id: 'seguria',
    name: 'SegurIA',
    industry: 'Security',
    problem: 'Security signals needed faster detection, clearer monitoring, and consistent response.',
    built: 'An AI-supported security monitoring layer with incident detection and control panels.',
    value: 'Better visibility for operations that cannot afford delayed attention.',
    tags: ['security', 'monitoring', 'incident detection'],
  },
  {
    id: 'sur-realista',
    name: 'Sur-Realista',
    industry: 'Geo intelligence',
    problem: 'Spatial analysis required a better way to combine layers, context, and action.',
    built: 'A geospatial analysis interface with layered controls and readable system views.',
    value: 'A cleaner way to work with complex spatial systems and environmental signals.',
    tags: ['gis', 'analytics', 'infrastructure'],
  },
  {
    id: 'ecosuelolab',
    name: 'Ecosuelolab',
    industry: 'Agriculture',
    problem: 'Soil intelligence needed a clearer operational interface and measured observation.',
    built: 'A soil-health platform with metrics, recommendation panels, and trend awareness.',
    value: 'Practical visibility for teams managing land health and precision agriculture.',
    tags: ['soil intelligence', 'agriculture', 'monitoring'],
  },
  {
    id: 'despega-tu-carrera',
    name: 'Despega Tu Carrera',
    industry: 'Education',
    problem: 'Career guidance needed structured content and a more operational learning flow.',
    built: 'A guided system for program structure, content visibility, and user progress.',
    value: 'A more focused experience for people moving through career planning decisions.',
    tags: ['education', 'guidance', 'workflow'],
  },
  {
    id: 'blackswan-facility-core',
    name: 'Blackswan Facility Core',
    industry: 'Critical facilities',
    problem: 'Facilities operations needed a central hub for alerts, systems, and control.',
    built: 'An operations core for facility health, status, and internal control surfaces.',
    value: 'A single interface for teams responsible for essential infrastructure.',
    tags: ['facilities', 'control', 'alerts'],
  },
]

const productSections = [
  {
    id: 'clarity',
    name: 'Clarity',
    what: 'Unified visibility across data, teams, and activities.',
    who: 'For leaders and teams that need one place to see what is happening.',
    modules: ['Operational overview', 'Signals and priorities', 'Traceable activity'],
    status: 'Active product direction',
  },
  {
    id: 'mermasapp',
    name: 'MermasApp',
    what: 'Workflow automation for approvals, routing, and operational processes.',
    who: 'For teams that need structured flow and less manual follow-up.',
    modules: ['Approvals', 'Routing', 'Operational records'],
    status: 'Productized workflow system',
  },
  {
    id: 'motil',
    name: 'Motil Platform',
    what: 'An operations platform for transport asset intelligence and reliability.',
    who: 'For transport and infrastructure teams managing complex assets.',
    modules: ['Assets', 'Risk', 'Maintenance'],
    status: 'Operational platform',
  },
  {
    id: 'docufleet',
    name: 'DocuFleet',
    what: 'Document and compliance intelligence for operational fleets.',
    who: 'For teams handling documents, renewals, and status control.',
    modules: ['Documents', 'Status', 'Review queues'],
    status: 'In use / evolving',
  },
  {
    id: 'seguria',
    name: 'SegurIA',
    what: 'Security intelligence with detection and monitoring surfaces.',
    who: 'For critical monitoring and response teams.',
    modules: ['Monitoring', 'Detection', 'Alerts'],
    status: 'Specialized solution',
  },
  {
    id: 'sur-realista',
    name: 'Sur-Realista',
    what: 'Geospatial intelligence for layered operational analysis.',
    who: 'For organizations working with spatial systems and environmental context.',
    modules: ['GIS layers', 'Overlay controls', 'Readable analytics'],
    status: 'Specialized solution',
  },
  {
    id: 'command-center',
    name: 'N3 Command Center',
    what: 'A control surface for operational leaders and teams.',
    who: 'For organizations that need one command layer for many activities.',
    modules: ['Overview', 'Exceptions', 'Action routing'],
    status: 'Product framework',
  },
  {
    id: 'document-intelligence',
    name: 'N3 Document Intelligence Layer',
    what: 'Document extraction and understanding across operational records.',
    who: 'For teams that need reliable document processing at scale.',
    modules: ['Extraction', 'Classification', 'Validation'],
    status: 'Reusable layer',
  },
  {
    id: 'ai-agents-layer',
    name: 'N3 AI Agents Layer',
    what: 'Agent orchestration for operational support and task execution.',
    who: 'For workflows that benefit from focused assistants and tool access.',
    modules: ['Agents', 'Tools', 'Governance'],
    status: 'Reusable layer',
  },
  {
    id: 'workflow-orchestrator',
    name: 'N3 Workflow Orchestrator',
    what: 'A workflow backbone for rules, approvals, and controlled execution.',
    who: 'For structured operations that need deterministic flow and traceability.',
    modules: ['Rules', 'Routing', 'Escalation'],
    status: 'Reusable layer',
  },
]

function useScrollActivity<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [activity, setActivity] = useState(0.24)

  useEffect(() => {
    let raf = 0

    const update = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const viewportCenter = window.innerHeight * 0.5
      const elementCenter = rect.top + rect.height * 0.5
      const maxDistance = Math.max(window.innerHeight * 0.7, rect.height * 0.65)
      const distance = Math.abs(elementCenter - viewportCenter)
      const next = Math.max(0, Math.min(1, 1 - distance / maxDistance))
      setActivity(next)
    }

    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ref])

  return activity
}

function focusStyle(activity: number): FocusStyle {
  return {
    opacity: 0.26 + activity * 0.74,
    scale: 0.9 + activity * 0.16,
    blur: 1.2 - activity * 1.2,
    translate: (1 - activity) * 18,
  }
}

function SiteShell({ children, footerVariant = 'dark' }: SiteShellProps) {
  return (
    <div className="min-h-screen bg-[var(--n3-black)] text-[var(--n3-text-light)]">
      <header className="sticky top-0 z-50 border-b border-[var(--n3-line)] bg-[rgba(3,6,6,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-4 py-3 md:px-8">
          <Link href="/es" className="shrink-0">
            <BrandLockup />
          </Link>
          <nav className="ml-auto hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[11px] uppercase tracking-[0.22em] text-[var(--n3-text-muted)] transition-colors duration-200 hover:text-[var(--n3-teal-soft)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <RetroButton href="/es/diagnostico" variant="primary" className="ml-auto lg:ml-0">
            Book a Diagnosis
          </RetroButton>
        </div>
      </header>

      {children}
      <SiteFooter variant={footerVariant} />
    </div>
  )
}

function SiteFooter({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const dark = variant === 'dark'
  return (
    <footer className={dark ? 'border-t border-[var(--n3-line)] bg-[var(--n3-black)]' : 'border-t border-[var(--n3-border-light)] bg-[var(--n3-light-bg)] text-[var(--n3-light-text)]'}>
        <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-14 md:grid-cols-[1.1fr_1fr_1fr_1fr_1fr_1.1fr] md:px-8">
          <div className="space-y-5">
            <BrandLockup dark={dark} />
            <Image
              src="/brand/n3uralia-mark.jpeg"
              alt="N3uralia"
              width={52}
              height={52}
              unoptimized
              className={dark ? 'h-12 w-12 object-contain' : 'h-12 w-12 object-contain mix-blend-multiply'}
            />
            <p className={dark ? 'max-w-sm text-sm leading-7 text-[var(--n3-text-muted)]' : 'max-w-sm text-sm leading-7 text-[var(--n3-light-muted)]'}>
              We build AI systems and intelligent workflows that help organizations operate with more clarity, speed, and control.
            </p>
          </div>

        <FooterColumn title="N3uralia" links={footerLinks.slice(0, 2)} dark={dark} />
        <FooterColumn title="Projects" links={[footerLinks[1], footerLinks[5]]} dark={dark} />
        <FooterColumn title="Products" links={[footerLinks[2]]} dark={dark} />
        <FooterColumn title="Company" links={[footerLinks[4], footerLinks[3]]} dark={dark} />

        <div className="space-y-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--n3-teal-soft)]">Contact</div>
          <div className={dark ? 'space-y-3 text-sm text-[var(--n3-text-light)]' : 'space-y-3 text-sm text-[var(--n3-light-text)]'}>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-[var(--n3-teal-soft)]" />
              <a href="mailto:juan@n3uralia.com">juan@n3uralia.com</a>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-[var(--n3-teal-soft)]" />
              <a href="tel:+56993826127">+56 9 9382 6127</a>
            </div>
            <div className="flex items-center gap-3">
              <Crosshair className="h-4 w-4 text-[var(--n3-teal-soft)]" />
              <span>Santiago, Chile - LATAM</span>
            </div>
          </div>
          <div className="pt-2 text-[11px] uppercase tracking-[0.22em] text-[var(--n3-teal-soft)]">
            Powered by{' '}
            <a
              href="https://n3uralia.com"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-[rgba(255,255,255,0.25)] underline-offset-4 transition-colors hover:text-white"
            >
              N3uralia
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, links, dark }: { title: string; links: NavLink[]; dark: boolean }) {
  return (
    <div className="space-y-4">
      <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--n3-teal-soft)]">{title}</div>
      <div className="space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={dark ? 'block text-sm text-[var(--n3-text-light)] transition-colors hover:text-[var(--n3-teal-soft)]' : 'block text-sm text-[var(--n3-light-text)] transition-colors hover:text-[var(--n3-teal)]'}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function RetroButton({
  href,
  children,
  variant = 'secondary',
  className = '',
  onClick,
}: {
  href?: string
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
  onClick?: () => void
}) {
  const base = 'inline-flex items-center justify-center gap-2 border px-4 py-3 text-[11px] uppercase tracking-[0.22em] transition-colors duration-300'
  const styles = {
    primary: 'border-[var(--n3-teal-soft)] bg-[var(--n3-teal-soft)] text-[var(--n3-black)] hover:bg-white hover:border-white',
    secondary: 'border-[var(--n3-line)] bg-transparent text-[var(--n3-teal-soft)] hover:border-[var(--n3-teal-soft)] hover:text-white',
    ghost: 'border-transparent bg-transparent text-[var(--n3-text-light)] hover:text-[var(--n3-teal-soft)]',
  }[variant]

  const content = (
    <>
      <span>{children}</span>
      {variant !== 'ghost' ? <ArrowRight className="h-3.5 w-3.5" /> : null}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={`${base} ${styles} ${className}`}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" className={`${base} ${styles} ${className}`} onClick={onClick}>
      {content}
    </button>
  )
}

function HudCorners({ active = 1 }: { active?: number }) {
  const style = {
    opacity: 0.2 + active * 0.8,
    transform: `scale(${0.92 + active * 0.08})`,
  }

  return (
    <div className="pointer-events-none absolute inset-0" style={style}>
      <span className="absolute left-0 top-0 h-4 w-4 border-l border-t border-[var(--n3-teal-soft)]" />
      <span className="absolute right-0 top-0 h-4 w-4 border-r border-t border-[var(--n3-teal-soft)]" />
      <span className="absolute bottom-0 left-0 h-4 w-4 border-b border-l border-[var(--n3-teal-soft)]" />
      <span className="absolute bottom-0 right-0 h-4 w-4 border-b border-r border-[var(--n3-teal-soft)]" />
    </div>
  )
}

function BrandLockup({ dark = true }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/brand/n3uralia-mark.jpeg"
        alt="N3uralia"
        width={52}
        height={52}
        unoptimized
        className={`h-10 w-10 shrink-0 object-contain ${dark ? '' : 'mix-blend-multiply'}`}
      />
      <Image
        src="/brand/n3uralia-wordmark.jpeg"
        alt="N3uralia"
        width={260}
        height={72}
        priority
        unoptimized
        className={`h-8 w-auto object-contain md:h-9 ${dark ? '' : 'mix-blend-multiply'}`}
      />
    </div>
  )
}

function PhotoPanel({
  src,
  alt,
  className = '',
  aspect = 'aspect-[16/10]',
  imageClassName = 'object-cover object-center',
}: {
  src: string
  alt: string
  className?: string
  aspect?: string
  imageClassName?: string
}) {
  return (
    <div className={`relative overflow-hidden border border-[var(--n3-line)] bg-black ${aspect} ${className}`}>
      <HudCorners active={1} />
      <Image src={src} alt={alt} fill unoptimized className={imageClassName} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,6,6,0.12)_0%,rgba(3,6,6,0.28)_100%)]" />
    </div>
  )
}

function GeneratedGraphic({
  src,
  alt,
  className = '',
  aspect = 'aspect-[16/10]',
  priority = false,
}: {
  src: string
  alt: string
  className?: string
  aspect?: string
  priority?: boolean
}) {
  return (
    <div className={`relative overflow-hidden border border-[var(--n3-line)] bg-black ${aspect} ${className}`}>
      <HudCorners active={1} />
      <Image src={src} alt={alt} fill priority={priority} unoptimized className="object-cover opacity-95" />
    </div>
  )
}

function AnimatedTelemetryText({
  lines,
  activity,
}: {
  lines: string[]
  activity: number
}) {
  return (
    <div className="space-y-1.5">
      {lines.map((line, index) => {
        const lineActivity = Math.max(0.18, activity - index * 0.035)
        return (
          <div
            key={`${line}-${index}`}
            className="whitespace-pre-wrap text-[10px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]"
            style={{
              opacity: 0.28 + lineActivity * 0.72,
              transform: `translateY(${(1 - lineActivity) * 3}px)`,
              letterSpacing: `${0.22 + lineActivity * 0.08}em`,
            }}
          >
            {line || ' '}
          </div>
        )
      })}
    </div>
  )
}

function FocusScanModule({
  number,
  title,
  body,
  href,
  graphic,
  telemetry,
}: {
  number: string
  title: string
  body: string
  href: string
  graphic: string
  telemetry: string[]
}) {
  const ref = useRef<HTMLElement | null>(null)
  const activity = useScrollActivity(ref)
  const focus = focusStyle(activity)

  return (
    <section
      ref={ref}
      id={title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
      className="border-t border-[var(--n3-line)] bg-[var(--n3-black)] px-4 py-10 md:px-8 md:py-14"
    >
      <div className="mx-auto grid max-w-[1440px] gap-6 lg:grid-cols-[220px_minmax(0,1.15fr)_minmax(0,1.1fr)] lg:items-center">
        <div className="space-y-5">
          <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]">LAYER {number}</div>
          <AnimatedTelemetryText lines={telemetry} activity={activity} />
        </div>

        <div
          className="relative transition-all duration-300 ease-out"
          style={{
            opacity: focus.opacity,
            transform: `translateY(${focus.translate}px) scale(${focus.scale})`,
            filter: `blur(${focus.blur}px)`,
          }}
        >
          <GeneratedGraphic src={graphic} alt={title} priority={number === '01'} />
        </div>

        <div
          className="space-y-5 border border-[var(--n3-line)] p-6 transition-all duration-300"
          style={{
            opacity: focus.opacity,
            transform: `translateY(${focus.translate * 0.4}px) scale(${0.97 + activity * 0.03})`,
          }}
        >
          <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]">{number} - {title}</div>
          <p className="max-w-lg text-sm leading-7 text-[var(--n3-text-light)] md:text-base">
            {body}
          </p>
          <RetroButton href={href} variant="secondary">
            Learn More
          </RetroButton>
        </div>
      </div>
    </section>
  )
}

function ExpandableRetroPanel({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="border border-[var(--n3-line)] bg-[rgba(5,12,13,0.82)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--n3-teal-soft)]">{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div
        className="grid overflow-hidden transition-all duration-500 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}
      >
        <div className="min-h-0">
          <div className="border-t border-[var(--n3-line)] px-6 py-6 text-sm leading-7 text-[var(--n3-text-light)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

function PageHero({
  eyebrow,
  title,
  body,
  ctas,
  graphic,
  graphicAlt,
  dark = true,
  overline,
}: {
  eyebrow: string
  overline?: string
  title: string
  body: string
  ctas: ReactNode
  graphic: string
  graphicAlt: string
  dark?: boolean
}) {
  const ref = useRef<HTMLElement | null>(null)
  const activity = useScrollActivity(ref)
  const focus = focusStyle(activity)
  const theme = dark
    ? 'bg-[var(--n3-black)] text-[var(--n3-text-light)]'
    : 'bg-[var(--n3-light-bg)] text-[var(--n3-light-text)]'

  return (
    <section ref={ref} className={`${theme} px-4 py-10 md:px-8 md:py-16`}>
      <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div className="space-y-7">
          <div className="space-y-3">
            {overline ? <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]">{overline}</div> : null}
            <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]">{eyebrow}</div>
            <h1 className="max-w-xl text-[clamp(2.8rem,6vw,5.7rem)] font-light leading-[0.95]">
              {title}
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-7 text-[var(--n3-text-muted)] md:text-base">
            {body}
          </p>
          <div className="flex flex-wrap gap-3">{ctas}</div>
        </div>

        <div
          className="relative transition-all duration-300"
          style={{
            opacity: focus.opacity,
            transform: `translateY(${focus.translate}px) scale(${focus.scale})`,
            filter: `blur(${focus.blur}px)`,
          }}
        >
          <GeneratedGraphic src={graphic} alt={graphicAlt} priority={false} />
        </div>
      </div>
    </section>
  )
}

function LandingHero() {
  const ref = useRef<HTMLElement | null>(null)
  const activity = useScrollActivity(ref)
  const focus = focusStyle(activity)

  return (
    <section ref={ref} className="relative overflow-hidden bg-[var(--n3-black)] px-4 pb-10 pt-6 md:px-8 md:pb-14 md:pt-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]">
                Intelligence · Automation · Execution
              </div>
              <h1 className="max-w-xl text-[clamp(3rem,6vw,6.2rem)] font-light leading-[0.94] text-[var(--n3-text-light)]">
                Turn complexity into intelligent execution.
              </h1>
              <p className="max-w-lg text-sm leading-7 text-[var(--n3-text-muted)] md:text-base">
                N3uralia helps companies turn scattered data, workflows, documents, and AI into systems that improve visibility, control, and execution.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <RetroButton href="/es/diagnostico" variant="primary">
                Book a Diagnosis
              </RetroButton>
              <RetroButton href="/es/soluciones" variant="secondary">
                See Solutions
              </RetroButton>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'Operational Intelligence', value: '01' },
                { label: 'Workflow Automation', value: '02' },
                { label: 'Production AI Systems', value: '03' },
              ].map((item) => (
                <div key={item.label} className="border border-[var(--n3-line)] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--n3-teal-soft)]">{item.value}</div>
                  <div className="mt-2 text-sm uppercase tracking-[0.2em] text-[var(--n3-text-light)]">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="relative transition-all duration-300"
            style={{
              opacity: focus.opacity,
              transform: `translateY(${focus.translate}px) scale(${focus.scale})`,
              filter: `blur(${focus.blur}px)`,
            }}
          >
            <PhotoPanel
              src="/assets/photos/hero-ops.jpg"
              alt="N3uralia strategic team"
              aspect="aspect-[16/11]"
              imageClassName="object-cover object-[center_top]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function LandingPage() {
  const [openPanel, setOpenPanel] = useState<'work' | 'approach' | null>('work')

  return (
    <SiteShell>
      <LandingHero />

      <section className="border-t border-[var(--n3-line)] bg-[var(--n3-black)]">
        {landingModules.map((module) => (
          <FocusScanModule
            key={module.id}
            number={module.number}
            title={module.title}
            body={module.body}
            href={module.href}
            graphic={module.graphic}
            telemetry={module.telemetry}
          />
        ))}
      </section>

      <section className="border-t border-[var(--n3-line)] bg-[var(--n3-black)] px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
          <div className="space-y-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]">Built for complexity</div>
            <h2 className="max-w-md text-[clamp(2rem,4vw,4rem)] font-light leading-[0.95] text-[var(--n3-text-light)]">
              We work where systems get hard.
            </h2>
            <p className="max-w-md text-sm leading-7 text-[var(--n3-text-muted)] md:text-base">
              Complex environments. High stakes. Real impact.
            </p>
          </div>
          <GeneratedGraphic src="/assets/graphics/data-landscape.svg" alt="Data landscape" />
        </div>
      </section>

      <section className="border-t border-[var(--n3-line)] bg-[var(--n3-black)] px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1440px] space-y-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
            <PhotoPanel
              src="/assets/photos/operations-team.jpg"
              alt="Operational team around a system table"
              aspect="aspect-[16/10]"
              imageClassName="object-cover object-center"
            />
            <div className="space-y-5">
              <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]">Built on experience</div>
              <h2 className="max-w-md text-[clamp(2rem,4vw,4.1rem)] font-light leading-[0.96]">
                Built around real operations.
              </h2>
              <p className="max-w-xl text-sm leading-7 text-[var(--n3-text-muted)] md:text-base">
                We partner with operations, engineering, and leadership teams to understand reality and design systems that fit.
              </p>
              <ExpandableRetroPanel
                title="See how we work"
                open={openPanel === 'work'}
                onToggle={() => setOpenPanel(openPanel === 'work' ? null : 'work')}
              >
                We start by mapping the real operating system of the company: people, tools, documents, decisions, bottlenecks and repeated workflows.
                Then we design the intelligence layer that connects those pieces into something visible, usable and scalable.
                <div className="mt-4 flex flex-wrap gap-3">
                  <RetroButton href="/es/diagnostico" variant="secondary">
                    Start a diagnosis
                  </RetroButton>
                </div>
              </ExpandableRetroPanel>
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
            <div className="order-2 space-y-5 lg:order-1">
              <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]">Focused on people</div>
              <h2 className="max-w-md text-[clamp(2rem,4vw,4.1rem)] font-light leading-[0.96]">
                Human-centered implementation.
              </h2>
              <p className="max-w-xl text-sm leading-7 text-[var(--n3-text-muted)] md:text-base">
                Technology works when teams adopt it. We design training, support, and handoff into every engagement.
              </p>
              <ExpandableRetroPanel
                title="Our approach"
                open={openPanel === 'approach'}
                onToggle={() => setOpenPanel(openPanel === 'approach' ? null : 'approach')}
              >
                Technology only works when people adopt it. We design systems around real teams, not abstract workflows. Every project includes clarity on roles, permissions, handoff, training and daily usage.
                <div className="mt-4 flex flex-wrap gap-3">
                  <RetroButton href="/es/soluciones" variant="secondary">
                    Explore expertise
                  </RetroButton>
                </div>
              </ExpandableRetroPanel>
            </div>
            <PhotoPanel
              src="/assets/photos/control-room.jpg"
              alt="Control room with operational dashboards"
              aspect="aspect-[16/10]"
              className="order-1 lg:order-2"
              imageClassName="object-cover object-center"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--n3-border-light)] bg-[var(--n3-light-bg)] px-4 py-14 text-[var(--n3-light-text)] md:px-8 md:py-20">
        <div className="mx-auto max-w-[1440px] space-y-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-light-muted)]">Our projects</div>
              <h2 className="max-w-lg text-[clamp(2rem,4vw,4.1rem)] font-light leading-[0.96]">
                Real systems. Real impact.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-[var(--n3-light-muted)]">
              Selected projects show N3uralia&apos;s work converting complexity into measurable operational value.
            </p>
          </div>

          <div className="space-y-5">
            {projectPreviews.map((project, index) => (
              <div key={project.name} className="grid gap-5 border-t border-[var(--n3-border-light)] pt-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
                <div className="space-y-3">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--n3-light-muted)]">{project.number} -</div>
                  <div className="text-[clamp(1.5rem,2vw,2.2rem)] font-light uppercase tracking-[0.18em]">{project.name}</div>
                  <p className="max-w-md text-sm leading-7 text-[var(--n3-light-muted)]">{project.description}</p>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--n3-light-muted)]">{project.industry}</div>
                  <Link href={`/es/proyectos#${projectsSections[index].id}`} className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[var(--n3-light-text)]">
                    View Project
                    <Plus className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <GeneratedGraphic src="/assets/graphics/project-mockup.svg" alt={project.name} aspect="aspect-[16/8]" />
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <RetroButton href="/es/proyectos" variant="secondary" className="min-w-56 justify-center text-[var(--n3-light-text)]">
              See All Projects
            </RetroButton>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--n3-border-light)] bg-[var(--n3-light-bg)] px-4 py-14 text-[var(--n3-light-text)] md:px-8 md:py-20">
        <div className="mx-auto max-w-[1440px] space-y-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-light-muted)]">Our products</div>
              <h2 className="max-w-xl text-[clamp(2rem,4vw,4.1rem)] font-light leading-[0.96]">
                Systems that think. Workflows that scale.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-[var(--n3-light-muted)]">
              N3uralia&apos;s product suite powers intelligent operations across documents, processes, and decisions.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {productPreviews.map((product, index) => (
              <div key={product.name} className="border border-[var(--n3-border-light)] bg-[var(--n3-light-surface)] p-4">
                <GeneratedGraphic src="/assets/graphics/product-mockup.svg" alt={product.name} aspect="aspect-[16/11]" />
                <div className="mt-4 flex items-start justify-between gap-4">
                  <h3 className="text-[18px] font-light uppercase tracking-[0.18em]">{product.name}</h3>
                  <Plus className="h-4 w-4 shrink-0 text-[var(--n3-light-muted)]" />
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--n3-light-muted)]">{product.summary}</p>
                <div className="mt-4">
                  <Link href={`/es/productos#${productSections[index].id}`} className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[var(--n3-light-text)]">
                    Explore
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <RetroButton href="/es/productos" variant="secondary" className="min-w-56 justify-center text-[var(--n3-light-text)]">
              Explore Products
            </RetroButton>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--n3-line)] bg-[var(--n3-black)] px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
          <div className="space-y-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]">How we work</div>
            <h2 className="max-w-md text-[clamp(2rem,4vw,4rem)] font-light leading-[0.96]">
              From diagnosis to execution.
            </h2>
            <GeneratedGraphic src="/assets/graphics/radar-timeline.svg" alt="Radar timeline" />
          </div>
          <div className="space-y-4">
            {methodSteps.map((step) => (
              <MethodStep key={step.number} step={step} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--n3-line)] bg-[var(--n3-black)] px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <div className="space-y-6">
            <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]">Start with a diagnosis</div>
            <h2 className="max-w-lg text-[clamp(2rem,4vw,4.1rem)] font-light leading-[0.96]">
              Clarity first. Impact follows.
            </h2>
            <p className="max-w-xl text-sm leading-7 text-[var(--n3-text-muted)] md:text-base">
              A diagnosis gives you a clear picture of what is possible and a practical path to get there.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {diagnosisItems.map((item) => (
                <FocusDiagnosisCard key={item.number} item={item} />
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <RetroButton href="/es/diagnostico" variant="primary">
                Book a Diagnosis
              </RetroButton>
              <RetroButton href="/es/diagnostico#contacto" variant="secondary">
                Contact Us
              </RetroButton>
            </div>
          </div>

          <GeneratedGraphic src="/assets/graphics/diagnosis-tower.svg" alt="Diagnostic framework tower" />
        </div>
      </section>

      <section className="border-t border-[var(--n3-line)] bg-[var(--n3-black)] px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div className="space-y-4">
            <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]">Ready to transform?</div>
            <h2 className="max-w-lg text-[clamp(2rem,4vw,4.4rem)] font-light leading-[0.96]">
              Let&apos;s build the system behind your next stage of growth.
            </h2>
            <p className="max-w-xl text-sm leading-7 text-[var(--n3-text-muted)] md:text-base">
              We work with companies facing operational complexity and help turn scattered signals into controlled execution.
            </p>
            <div className="flex flex-wrap gap-3">
              <RetroButton href="/es/diagnostico" variant="primary">
                Book a Diagnosis
              </RetroButton>
              <RetroButton href="/es/diagnostico#contacto" variant="secondary">
                Contact Us
              </RetroButton>
            </div>
          </div>
          <PhotoPanel
            src="/assets/photos/control-room.jpg"
            alt="Operations command center"
            aspect="aspect-[16/10]"
            imageClassName="object-cover object-center"
          />
        </div>
      </section>
    </SiteShell>
  )
}

function MethodStep({ step }: { step: { number: string; title: string; body: string } }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const activity = useScrollActivity(ref)
  const focus = focusStyle(activity)

  return (
    <div
      ref={ref}
      className="border border-[var(--n3-line)] px-5 py-4 transition-all duration-300"
      style={{
        opacity: focus.opacity,
        transform: `translateY(${focus.translate * 0.25}px) scale(${0.98 + activity * 0.02})`,
      }}
    >
      <div className="flex items-start gap-5">
        <div className="min-w-12 text-[11px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]">{step.number}</div>
        <div className="space-y-2">
          <div className="text-[22px] font-light uppercase tracking-[0.2em] text-[var(--n3-text-light)]">
            {step.title}
          </div>
          <p className="max-w-lg text-sm leading-7 text-[var(--n3-text-muted)]">{step.body}</p>
        </div>
      </div>
    </div>
  )
}

function FocusDiagnosisCard({
  item,
}: {
  item: {
    number: string
    title: string
    body: string
    icon: ComponentType<{ className?: string }>
  }
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const activity = useScrollActivity(ref)
  const focus = focusStyle(activity)
  const Icon = item.icon

  return (
    <div
      ref={ref}
      className="border border-[var(--n3-line)] px-5 py-4 transition-all duration-300"
      style={{
        opacity: focus.opacity,
        transform: `translateY(${focus.translate * 0.2}px) scale(${0.98 + activity * 0.02})`,
      }}
    >
      <div className="flex items-start gap-4">
        <Icon className="mt-1 h-5 w-5 text-[var(--n3-teal-soft)]" />
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]">{item.number}</div>
          <div className="text-[18px] font-light uppercase tracking-[0.18em]">{item.title}</div>
          <p className="text-sm leading-7 text-[var(--n3-text-muted)]">{item.body}</p>
        </div>
      </div>
    </div>
  )
}

function RoutePageFrame({
  title,
  intro,
  graphic,
  children,
  darkHero = true,
  cta = <RetroButton href="/es/diagnostico" variant="primary">Book a Diagnosis</RetroButton>,
}: {
  title: string
  intro: string
  graphic: string
  children: ReactNode
  darkHero?: boolean
  cta?: ReactNode
}) {
  return (
    <SiteShell footerVariant={darkHero ? 'dark' : 'light'}>
      <PageHero
        eyebrow="N3uralia"
        title={title}
        body={intro}
        ctas={cta}
        graphic={graphic}
        graphicAlt={title}
        dark={darkHero}
      />
      {children}
    </SiteShell>
  )
}

function SolutionsPage() {
  return (
    <RoutePageFrame
      title="Expertise for complex operations."
      intro="N3uralia designs operational intelligence, workflow automation, production AI systems, and the surrounding governance layer."
      graphic="/assets/graphics/operational-intelligence-stack.svg"
    >
      <section className="border-t border-[var(--n3-line)] bg-[var(--n3-black)] px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1440px] space-y-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {solutionsSections.map((section) => (
              <article key={section.id} id={section.id} className="border border-[var(--n3-line)] p-5">
                <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]">{section.id.replace(/-/g, ' ')}</div>
                <h2 className="mt-3 text-[26px] font-light uppercase tracking-[0.18em]">{section.title}</h2>
                <p className="mt-4 text-sm leading-7 text-[var(--n3-text-muted)]">{section.body}</p>
                <ul className="mt-4 space-y-2">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm leading-7 text-[var(--n3-text-light)]">
                      <CircleDot className="mt-1.5 h-3.5 w-3.5 shrink-0 text-[var(--n3-teal-soft)]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
    </RoutePageFrame>
  )
}

function ProjectsPage() {
  return (
    <RoutePageFrame
      title="Projects that turn complexity into systems."
      intro="Proof, case studies, and real operational interfaces built for organizations that need clarity and control."
      graphic="/assets/graphics/project-mockup.svg"
    >
      <section className="border-t border-[var(--n3-line)] bg-[var(--n3-black)] px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-[1440px] space-y-6">
          {projectsSections.map((project) => (
            <article key={project.id} id={project.id} className="grid gap-6 border border-[var(--n3-line)] p-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
              <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]">{project.industry}</div>
                <h2 className="text-[28px] font-light uppercase tracking-[0.18em]">{project.name}</h2>
                <p className="text-sm leading-7 text-[var(--n3-text-muted)]">{project.problem}</p>
                <p className="text-sm leading-7 text-[var(--n3-text-light)]">{project.built}</p>
                <p className="text-sm leading-7 text-[var(--n3-text-muted)]">{project.value}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {project.tags.map((tag) => (
                    <span key={tag} className="border border-[var(--n3-line)] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--n3-teal-soft)]">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link href={`/es/proyectos#${project.id}`} className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[var(--n3-teal-soft)]">
                  View Project <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <GeneratedGraphic src="/assets/graphics/project-mockup.svg" alt={project.name} aspect="aspect-[16/8]" />
            </article>
          ))}
        </div>
      </section>
    </RoutePageFrame>
  )
}

function ProductsPage() {
  return (
    <RoutePageFrame
      title="Products built from real operations."
      intro="N3uralia products are reusable systems shaped by the realities of complex organizations."
      graphic="/assets/graphics/product-mockup.svg"
      darkHero={false}
      cta={<RetroButton href="/es/productos#clarity" variant="primary">Explore products</RetroButton>}
    >
      <section className="border-t border-[var(--n3-border-light)] bg-[var(--n3-light-bg)] px-4 py-14 text-[var(--n3-light-text)] md:px-8 md:py-20">
        <div className="mx-auto grid max-w-[1440px] gap-4 md:grid-cols-2 xl:grid-cols-3">
          {productSections.map((product) => (
            <article key={product.id} id={product.id} className="border border-[var(--n3-border-light)] bg-[var(--n3-light-surface)] p-5">
              <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-light-muted)]">{product.status}</div>
              <h2 className="mt-3 text-[28px] font-light uppercase tracking-[0.18em]">{product.name}</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--n3-light-muted)]">{product.what}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--n3-light-text)]">{product.who}</p>
              <div className="mt-4 space-y-2">
                {product.modules.map((module) => (
                  <div key={module} className="flex items-center gap-2 text-sm text-[var(--n3-light-muted)]">
                    <Plus className="h-3.5 w-3.5 text-[var(--n3-teal)]" />
                    <span>{module}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </RoutePageFrame>
  )
}

function DiagnosisPage() {
  return (
    <RoutePageFrame
      title="Start with a diagnosis."
      intro="A diagnosis gives you a clear picture of what is possible and a practical path to get there."
      graphic="/assets/graphics/diagnosis-tower.svg"
    >
      <section id="contacto" className="border-t border-[var(--n3-line)] bg-[var(--n3-black)] px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="space-y-5">
            <h2 className="max-w-xl text-[clamp(2rem,4vw,4rem)] font-light leading-[0.96]">
              Clarity first. Impact follows.
            </h2>
            <p className="max-w-xl text-sm leading-7 text-[var(--n3-text-muted)] md:text-base">
              We start by mapping current systems, identifying leverage, and defining a practical roadmap. The goal is a decision surface you can use with confidence.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {diagnosisItems.map((item) => (
                <FocusDiagnosisCard key={item.number} item={item} />
              ))}
            </div>
          </div>

          <div className="space-y-4 border border-[var(--n3-line)] p-6">
            <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--n3-teal-soft)]">Contact</div>
            <div className="space-y-3 text-sm leading-7 text-[var(--n3-text-light)]">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-[var(--n3-teal-soft)]" />
                <a href="mailto:juan@n3uralia.com">juan@n3uralia.com</a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-[var(--n3-teal-soft)]" />
                <a href="tel:+56993826127">+56 9 9382 6127</a>
              </div>
            </div>
            <div className="pt-4">
              <RetroButton href="mailto:juan@n3uralia.com" variant="primary">
                Send email
              </RetroButton>
            </div>
          </div>
        </div>
      </section>
    </RoutePageFrame>
  )
}

function AboutPage() {
  return (
    <RoutePageFrame
      title="A philosophy built for real operations."
      intro="N3uralia works at the intersection of strategy, systems design, and practical implementation."
      graphic="/assets/photos/operations-team.jpg"
      darkHero={false}
    >
      <section className="border-t border-[var(--n3-border-light)] bg-[var(--n3-light-bg)] px-4 py-14 text-[var(--n3-light-text)] md:px-8 md:py-20">
        <div className="mx-auto grid max-w-[1440px] gap-6 lg:grid-cols-3">
          {[
            {
              title: 'Human-centered',
              body: 'Systems only work when teams can adopt them. We design for people first, then automate what should scale.',
            },
            {
              title: 'Technically structured',
              body: 'We keep interfaces, data flows, and governance aligned so the system stays maintainable in production.',
            },
            {
              title: 'Operationally realistic',
              body: 'We favor solutions that fit current reality and improve the operating model instead of introducing unnecessary complexity.',
            },
          ].map((item) => (
            <article key={item.title} className="border border-[var(--n3-border-light)] bg-[var(--n3-light-surface)] p-5">
              <h2 className="text-[26px] font-light uppercase tracking-[0.18em]">{item.title}</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--n3-light-muted)]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </RoutePageFrame>
  )
}

export {
  AboutPage,
  DiagnosisPage,
  LandingPage,
  ProjectsPage,
  ProductsPage,
  SolutionsPage,
}



