import type { Capability } from '@/lib/access-control'
import type { UserRole } from '@/lib/types'

export type NavigationItem = {
  label: string
  href: string
  exact?: boolean
  anyCapabilities?: Capability[]
  roles?: UserRole[]
}

export type NavigationSection = {
  label: string
  items: NavigationItem[]
}

// Contrato: los tres pilares de Property Partners permanecen visibles.
// El resto de herramientas se organiza por rol, sin ampliar permisos.
export const CEO_NAVIGATION: NavigationSection[] = [
  {
    "label": "Tres pilares",
    "items": [
      {
        "label": "Control de gestión",
        "href": "/dashboard/ceo",
        "anyCapabilities": [
          "dashboard.global.read"
        ]
      },
      {
        "label": "Inteligencia de mercado",
        "href": "/dashboard/market",
        "anyCapabilities": [
          "market.read"
        ]
      },
      {
        "label": "Valorizador",
        "href": "/dashboard/valuation",
        "anyCapabilities": [
          "valuations.self.create",
          "valuations.office.review",
          "valuations.global.approve"
        ]
      }
    ]
  },
  {
    "label": "Más herramientas",
    "items": [
      {
        "label": "Valorizaciones",
        "href": "/dashboard/valuations",
        "anyCapabilities": [
          "valuations.global.read"
        ]
      },
      {
        "label": "Por resolver",
        "href": "/dashboard/properties",
        "anyCapabilities": [
          "properties.global.read"
        ]
      },
      {
        "label": "Informes",
        "href": "/dashboard/reportes/canonicos",
        "anyCapabilities": [
          "reports.global.read"
        ]
      },
      {
        "label": "Seguimiento operativo",
        "href": "/dashboard/control/operations",
        "anyCapabilities": [
          "management.global.read"
        ]
      }
    ]
  }
]

export const ADMIN_NAVIGATION: NavigationSection[] = [
  {
    "label": "Tres pilares",
    "items": [
      {
        "label": "Control de gestión",
        "href": "/dashboard/control/operations",
        "anyCapabilities": [
          "management.global.read"
        ]
      },
      {
        "label": "Inteligencia de mercado",
        "href": "/dashboard/market",
        "anyCapabilities": [
          "market.read"
        ]
      },
      {
        "label": "Valorizador",
        "href": "/dashboard/valuation",
        "anyCapabilities": [
          "valuations.self.create",
          "valuations.office.review",
          "valuations.global.approve"
        ]
      }
    ]
  },
  {
    "label": "Más herramientas",
    "items": [
      {
        "label": "Inicio",
        "href": "/dashboard",
        "exact": true,
        "anyCapabilities": [
          "dashboard.global.read"
        ]
      },
      {
        "label": "Valorizaciones",
        "href": "/dashboard/valuations",
        "anyCapabilities": [
          "valuations.global.read"
        ]
      },
      {
        "label": "Por resolver",
        "href": "/dashboard/properties",
        "anyCapabilities": [
          "properties.global.read"
        ]
      },
      {
        "label": "Informes",
        "href": "/dashboard/reportes/canonicos",
        "anyCapabilities": [
          "reports.global.read"
        ]
      }
    ]
  },
  {
    "label": "Administración",
    "items": [
      {
        "label": "Metas y alertas",
        "href": "/dashboard/control/admin",
        "anyCapabilities": [
          "management.global.manage"
        ]
      },
      {
        "label": "Cartera y asignaciones",
        "href": "/dashboard/properties/admin",
        "anyCapabilities": [
          "properties.global.assign"
        ]
      },
      {
        "label": "Datos y fuentes",
        "href": "/dashboard/market/fuentes",
        "anyCapabilities": [
          "market.manage_sources",
          "settings.manage"
        ]
      },
      {
        "label": "Usuarios",
        "href": "/dashboard/settings",
        "anyCapabilities": [
          "users.manage",
          "settings.manage"
        ]
      }
    ]
  }
]

export const DIRECTOR_NAVIGATION: NavigationSection[] = [
  {
    "label": "Tres pilares",
    "items": [
      {
        "label": "Control de gestión",
        "href": "/dashboard/director",
        "anyCapabilities": [
          "dashboard.office.read"
        ]
      },
      {
        "label": "Inteligencia de mercado",
        "href": "/dashboard/market",
        "anyCapabilities": [
          "market.read"
        ]
      },
      {
        "label": "Valorizador",
        "href": "/dashboard/valuation",
        "anyCapabilities": [
          "valuations.self.create",
          "valuations.office.review",
          "valuations.global.approve"
        ]
      }
    ]
  },
  {
    "label": "Más herramientas",
    "items": [
      {
        "label": "Valorizaciones",
        "href": "/dashboard/valuations",
        "anyCapabilities": [
          "valuations.office.read"
        ]
      },
      {
        "label": "Por resolver",
        "href": "/dashboard/properties",
        "anyCapabilities": [
          "properties.office.read"
        ]
      },
      {
        "label": "Informes",
        "href": "/dashboard/director/reporte",
        "anyCapabilities": [
          "reports.office.read"
        ]
      }
    ]
  },
  {
    "label": "Gestión de oficina",
    "items": [
      {
        "label": "Operación",
        "href": "/dashboard/control/operations",
        "anyCapabilities": [
          "management.office.read"
        ]
      },
      {
        "label": "Metas y seguimiento",
        "href": "/dashboard/control/admin",
        "anyCapabilities": [
          "management.office.manage"
        ]
      },
      {
        "label": "Cartera y asignaciones",
        "href": "/dashboard/properties/admin",
        "anyCapabilities": [
          "properties.office.assign"
        ]
      }
    ]
  }
]

export const SELLER_NAVIGATION: NavigationSection[] = [
  {
    "label": "Tres pilares",
    "items": [
      {
        "label": "Control de gestión",
        "href": "/dashboard/partner",
        "anyCapabilities": [
          "dashboard.self.read"
        ]
      },
      {
        "label": "Inteligencia de mercado",
        "href": "/dashboard/market",
        "anyCapabilities": [
          "market.read"
        ]
      },
      {
        "label": "Valorizador",
        "href": "/dashboard/valuation",
        "anyCapabilities": [
          "valuations.self.create",
          "valuations.office.review",
          "valuations.global.approve"
        ]
      }
    ]
  },
  {
    "label": "Más herramientas",
    "items": [
      {
        "label": "Valorizaciones",
        "href": "/dashboard/valuations",
        "anyCapabilities": [
          "valuations.self.read"
        ]
      },
      {
        "label": "Propiedades",
        "href": "/dashboard/properties",
        "anyCapabilities": [
          "properties.self.read"
        ]
      },
      {
        "label": "Mi reporte",
        "href": "/dashboard/reportes/audiencias/ejecutivo",
        "anyCapabilities": [
          "reports.self.read"
        ]
      }
    ]
  }
]

// Kept for compatibility with existing imports; non-CEO default is the technical admin profile.
export const DEFAULT_NAVIGATION = ADMIN_NAVIGATION
