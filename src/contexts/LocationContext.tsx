import React, { createContext, useContext, useEffect, useState } from "react";
import Geolocation from "@react-native-community/geolocation";

type LocationContextType = {
  location: { latitude: number; longitude: number } | null;
  loading: boolean;
  error: boolean;
  refresh: () => void;
};

const LocationContext = createContext<LocationContextType>({
  location: null,
  loading: true,
  error: false,
  refresh: () => {},
});

export function useLocation() {
  return useContext(LocationContext);
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function fetchLocation() {
    setLoading(true);
    setError(false);

    Geolocation.requestAuthorization(
      () => {
        Geolocation.getCurrentPosition(
          (pos) => {
            setLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
            setLoading(false);
          },
          () => {
            // Low accuracy failed, try high accuracy
            Geolocation.getCurrentPosition(
              (pos) => {
                setLocation({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                });
                setLoading(false);
              },
              () => {
                setError(true);
                setLoading(false);
              },
              { enableHighAccuracy: true, timeout: 30000 }
            );
          },
          { enableHighAccuracy: false, timeout: 10000 }
        );
      },
      () => {
        setError(true);
        setLoading(false);
      }
    );
  }

  useEffect(() => {
    fetchLocation();

    // Refresh location every 2 minutes
    const interval = setInterval(fetchLocation, 120000);
    return () => clearInterval(interval);
  }, []);

  return (
    <LocationContext.Provider value={{ location, loading, error, refresh: fetchLocation }}>
      {children}
    </LocationContext.Provider>
  );
}
