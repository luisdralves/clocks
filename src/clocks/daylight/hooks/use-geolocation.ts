import { useEffect, useState } from 'react';

interface Location {
  latitude: number;
  longitude: number;
  ready: boolean;
}

const DEFAULT_LOCATION = {
  latitude: 51.4772, // Greenwich
  longitude: 0,
  ready: false,
};

export function useGeolocation(): Location {
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);

  useEffect(() => {
    async function fetchLocation() {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.latitude && data.longitude) {
          setLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            ready: true,
          });
          console.log(`IP geolocation: ${data.city}, ${data.country_name}`);
        } else {
          console.warn('IP geolocation failed, using default (Greenwich)');
          setLocation({ ...DEFAULT_LOCATION, ready: true });
        }
      } catch (e) {
        console.warn('IP geolocation failed, using default (Greenwich):', e);
        setLocation({ ...DEFAULT_LOCATION, ready: true });
      }
    }

    fetchLocation();
  }, []);

  return location;
}
