"use client";

import { DateRangeFilter } from "./date-range-filter";
import { FilterActions } from "./filter-actions";
import { PropertyLocationFilter } from "./property-location-filter";

type Property = {
  id: string;
  name: string;
};

type Location = {
  id: string;
  name: string;
  propertyId: string;
};

type ReportFiltersFormProps = {
  properties: Property[];
  locations: Location[];
  startDate?: string;
  endDate?: string;
  propertyId?: string;
  locationId?: string;
  clearHref: string;
  children?: React.ReactNode;
};

export function ReportFiltersForm({
  properties,
  locations,
  startDate,
  endDate,
  propertyId,
  locationId,
  clearHref,
  children,
}: ReportFiltersFormProps) {
  return (
    <section className="rounded-lg border bg-white p-4 dark:bg-zinc-900 print:hidden">
      <h2 className="mb-3 text-lg font-medium">Filters</h2>
      <form method="get" className="grid gap-4 sm:grid-cols-3">
        <DateRangeFilter startDate={startDate} endDate={endDate} />

        <PropertyLocationFilter
          properties={properties}
          locations={locations}
          propertyId={propertyId}
          locationId={locationId}
        />

        {children}

        <FilterActions clearHref={clearHref} />
      </form>
    </section>
  );
}
