"use client";

import { useMemo, useState } from "react";

type Property = {
  id: string;
  name: string;
};

type Location = {
  id: string;
  name: string;
  propertyId: string;
};

type PropertyLocationFilterProps = {
  properties: Property[];
  locations: Location[];
  propertyId?: string;
  locationId?: string;
};

export function PropertyLocationFilter({
  properties,
  locations,
  propertyId,
  locationId,
}: PropertyLocationFilterProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(propertyId ?? "");

  const filteredLocations = useMemo(() => {
    if (selectedPropertyId) {
      return locations.filter((loc) => loc.propertyId === selectedPropertyId);
    }
    return locations;
  }, [selectedPropertyId, locations]);

  return (
    <>
      <label className="space-y-1 text-sm">
        <span>Property</span>
        <select
          name="propertyId"
          value={selectedPropertyId}
          onChange={(e) => setSelectedPropertyId(e.target.value)}
          className="w-full rounded border px-2 py-2"
        >
          <option value="">All</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 text-sm">
        <span>Location</span>
        <select
          name="locationId"
          defaultValue={locationId ?? ""}
          className="w-full rounded border px-2 py-2"
        >
          <option value="">All</option>
          {filteredLocations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
