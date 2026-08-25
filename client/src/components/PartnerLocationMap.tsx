import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { hasPartnerCoordinates, type PartnerLocation } from "@/lib/partner-location";
import { Crosshair, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Point = { lat: number; lng: number };

type PartnerLocationMapProps = {
  address: string;
  location: PartnerLocation;
  onLocationChange: (point: Point) => void;
};

export function PartnerLocationMap({ address, location, onLocationChange }: PartnerLocationMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  function setMarker(point: Point, center = true) {
    const map = mapRef.current;
    if (!map || !window.google) return;

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        map,
        position: point,
        draggable: true,
        title: "Localização do parceiro",
      });
      markerRef.current.addListener("dragend", (event: google.maps.MapMouseEvent) => {
        const position = event.latLng;
        if (!position) return;
        onLocationChangeRef.current({ lat: position.lat(), lng: position.lng() });
      });
    } else {
      markerRef.current.setMap(map);
      markerRef.current.setPosition(point);
    }

    if (center) {
      map.panTo(point);
      map.setZoom(16);
    }
  }

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (hasPartnerCoordinates(location)) {
      setMarker({ lat: Number(location.latitude), lng: Number(location.longitude) }, true);
      return;
    }
    markerRef.current?.setMap(null);
  }, [ready, location.latitude, location.longitude]);

  function validateAddress() {
    if (!address.trim()) {
      toast.error("Preencha o endereço antes de validar o ponto no mapa");
      return;
    }
    if (!window.google?.maps || !mapRef.current) {
      toast.error("O mapa ainda está carregando. Tente novamente em instantes.");
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      const result = results?.[0];
      if (status !== "OK" || !result) {
        toast.error("Não foi possível localizar esse endereço. Ajuste os dados ou marque o ponto manualmente.");
        return;
      }

      const point = { lat: result.geometry.location.lat(), lng: result.geometry.location.lng() };
      setMarker(point);
      onLocationChangeRef.current(point);
      toast.success("Localização encontrada. Ajuste o pin se necessário e salve o parceiro.");
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-black/8 bg-[#fafaf7] p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="flex items-center gap-2 text-sm font-extrabold"><MapPin className="h-4 w-4 text-primary" /> Validar localização no mapa</p>
          <p className="mt-1 text-xs text-muted-foreground">Localize pelo endereço, arraste o pin ou clique no mapa para definir o ponto GPS.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={validateAddress} className="gap-2 border-black/10 bg-white"><Crosshair className="h-3.5 w-3.5" /> Validar endereço</Button>
      </div>
      <MapView
        initialCenter={{ lat: -14.235, lng: -51.9253 }}
        initialZoom={4}
        className="h-[290px] overflow-hidden rounded-xl border border-black/8"
        onMapReady={map => {
          mapRef.current = map;
          map.addListener("click", (event: google.maps.MapMouseEvent) => {
            const point = event.latLng;
            if (!point) return;
            const nextPoint = { lat: point.lat(), lng: point.lng() };
            setMarker(nextPoint, false);
            onLocationChangeRef.current(nextPoint);
          });
          setReady(true);
        }}
      />
      {hasPartnerCoordinates(location) ? (
        <p className="text-xs font-semibold text-emerald-700">Ponto confirmado: {Number(location.latitude).toFixed(6)}, {Number(location.longitude).toFixed(6)}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhum ponto confirmado. O endereço ainda poderá ser salvo, mas não terá precisão de navegação.</p>
      )}
    </div>
  );
}
