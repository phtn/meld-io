import { useEffect, useState } from 'octane'

export function useCountryDetection() {
  const [countryCode, setCountryCode] = useState<string>('US')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Option 1: Try IP-based detection first (more reliable)
        const response = await fetch('/api/detect-country')
        if (response.ok) {
          const data = await response.json()
          if (data.countryCode) {
            setCountryCode(data.countryCode)
            setLoading(false)
            return
          }
        }
      } catch (error) {
        console.error('IP-based country detection failed:', error)
      }

      // Option 2: Try browser geolocation as fallback
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              // Use reverse geocoding to get country from coordinates
              const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
              )
              if (response.ok) {
                const data = await response.json()
                if (data.countryCode) {
                  setCountryCode(data.countryCode)
                }
              }
            } catch (error) {
              console.error('Geolocation country detection failed:', error)
            } finally {
              setLoading(false)
            }
          },
          () => {
            // Geolocation failed, use default
            setLoading(false)
          },
          { timeout: 5000 }
        )
      } else {
        setLoading(false)
      }
    }

    detectCountry()
  }, [])

  return { countryCode, loading }
}
