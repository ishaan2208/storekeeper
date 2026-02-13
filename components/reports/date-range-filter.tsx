"use client";

type DateRangeFilterProps = {
  startDate?: string;
  endDate?: string;
};

export function DateRangeFilter({ startDate, endDate }: DateRangeFilterProps) {
  return (
    <>
      <label className="space-y-1 text-sm">
        <span>Start Date</span>
        <input
          type="date"
          name="startDate"
          defaultValue={startDate ?? ""}
          className="w-full rounded border px-2 py-2"
        />
      </label>

      <label className="space-y-1 text-sm">
        <span>End Date</span>
        <input
          type="date"
          name="endDate"
          defaultValue={endDate ?? ""}
          className="w-full rounded border px-2 py-2"
        />
      </label>
    </>
  );
}
