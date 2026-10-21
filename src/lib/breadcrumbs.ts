export interface Breadcrumb { label: string; href: string }

const routeLabels: Record<string, string> = {
  '/converters': 'Converters',
  '/converters/image': 'Image Converter',
  '/icons': 'Icons',
  '/icons/favorites': 'Favorites',
  '/icons/optimizer': 'Optimizer',
  '/icons/lists': 'Icon Lists',
  '/gym': 'Gym',
  '/gym/effect-js': 'Effect',
  '/gym/effect-js/lessons': 'Lessons',
}

export function breadcrumbsForPath(pathname: string): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [{ label: 'Launcher', href: '/' }]
  const segments = pathname.split('/').filter(Boolean)
  for (let index = 0; index < segments.length; index++) {
    const href = '/' + segments.slice(0, index + 1).join('/')
    let segment = segments[index]
    try { segment = decodeURIComponent(segment) } catch {}
    const label = routeLabels[href] ?? segment.replace(/[-_]+/g, ' ')
    crumbs.push({ label, href })
  }
  return crumbs
}
