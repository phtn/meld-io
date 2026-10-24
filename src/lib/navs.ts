import type { IconName } from '@/lib/icons'

export type NavItem = {
  href: string
  icon: IconName
  label: string
  value: string
  tags: string[]
  description?: string
  short?: string
  disabled?: boolean
}

export type NavGroup = {
  title: string
  items: NavItem[]
  label?: string
}
export const navGroups: NavGroup[] = [
  {
    title: 'Meld API',
    items: [
      {
        href: '/api',
        value: 'launcher',
        icon: 'search',
        label: 'Endpoint explorer',
        short: 'Endpoints',
        description: 'Search and test Meld API endpoints',
        tags: ['meld', 'api', 'endpoints', 'requests']
      }
    ]
  }
]

export const branches: NavGroup[] = [
  {
    title: 'Getting started',
    items: [
      {
        short: 'install',
        value: 'install',
        href: 'install',
        label: 'Installation',
        icon: 'search',
        description: 'settings',
        tags: ['tags']
      },
      {
        short: 'quick',
        value: 'quick',
        href: 'quick',
        label: 'Quick start',
        icon: 'search',
        description: 'settings',
        tags: ['tags']
      },
      {
        short: 'config',
        value: 'config',
        href: 'config',
        label: 'Configuration',
        icon: 'search',
        description: 'settings',
        tags: ['tags']
      }
    ]
  },
  {
    title: 'Components',
    items: [
      {
        short: 'buttons',
        value: 'buttons',
        href: 'buttons',
        label: 'Buttons',
        icon: 'search',
        description: 'settings',
        tags: ['tags']
      },
      {
        short: 'overlays',
        value: 'overlays',
        href: 'overlays',
        label: 'Overlays',
        icon: 'search',
        description: 'settings',
        tags: ['tags']
      }
    ]
  }
]
