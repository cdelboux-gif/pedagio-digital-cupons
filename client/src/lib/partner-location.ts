export type PartnerLocation = {
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  addressCountry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function formatPartnerAddress(location: PartnerLocation) {
  const street = [location.addressStreet, location.addressNumber].filter(Boolean).join(", ");
  const city = [location.addressCity, location.addressState].filter(Boolean).join(" - ");
  const addressParts = [street, location.addressComplement, location.addressNeighborhood, city, location.addressPostalCode].filter(Boolean);
  if (!addressParts.length) return "";
  const country = location.addressCountry && location.addressCountry !== "BR" ? location.addressCountry : "Brasil";
  return [...addressParts, country].join(", ");
}

export function hasPartnerCoordinates(location: PartnerLocation) {
  return Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
}

export function buildPartnerGpsUrl(location: PartnerLocation) {
  if (hasPartnerCoordinates(location)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
  }

  const address = formatPartnerAddress(location);
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
}
