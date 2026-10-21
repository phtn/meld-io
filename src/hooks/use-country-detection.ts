import { useState } from 'octane'

function getBrowserCountryCode(): string {
  if (typeof navigator === 'undefined' || !navigator.language) return 'US'

  try {
    return new Intl.Locale(navigator.language).region?.toUpperCase() || 'US'
  } catch {
    const region = navigator.language.split('-').at(-1)
    return region?.length === 2 ? region.toUpperCase() : 'US'
  }
}

export function useCountryDetection() {
  const [countryCode] = useState<string>(getBrowserCountryCode)
  return { countryCode, loading: false }
}
