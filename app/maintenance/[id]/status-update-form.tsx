"use client";

import { MaintenanceStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateMaintenanceStatus } from "@/lib/actions/maintenance";

type StatusUpdateFormProps = {
  ticketId: string;
  currentStatus: MaintenanceStatus;
};

const statusOptions = [
  MaintenanceStatus.REPORTED,
  MaintenanceStatus.DIAGNOSING,
  MaintenanceStatus.SENT_TO_VENDOR,
  MaintenanceStatus.IN_REPAIR,
  MaintenanceStatus.FIXED,
  MaintenanceStatus.UNREPAIRABLE,
];

export function StatusUpdateForm({ ticketId, currentStatus }: StatusUpdateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    status: currentStatus,
    note: "",
    vendorName: "",
    estimatedCost: "",
    actualCost: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const input = {
        ticketId,
        status: formData.status,
        note: formData.note.trim() || undefined,
        vendorName: formData.vendorName.trim() || undefined,
        estimatedCost: formData.estimatedCost
          ? parseFloat(formData.estimatedCost)
          : undefined,
        actualCost: formData.actualCost ? parseFloat(formData.actualCost) : undefined,
      };

      await updateMaintenanceStatus(input);
      router.refresh();
      setFormData({
        status: formData.status,
        note: "",
        vendorName: "",
        estimatedCost: "",
        actualCost: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <label className="block space-y-1 text-sm">
        <span className="font-medium">
          New Status <span className="text-red-600">*</span>
        </span>
        <select
          value={formData.status}
          onChange={(e) =>
            setFormData({ ...formData, status: e.target.value as MaintenanceStatus })
          }
          required
          className="w-full rounded border px-3 py-2"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Note (Optional)</span>
        <textarea
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          maxLength={500}
          rows={3}
          placeholder="Add any notes about this status change..."
          className="w-full rounded border px-3 py-2"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Vendor Name (Optional)</span>
          <input
            type="text"
            value={formData.vendorName}
            onChange={(e) =>
              setFormData({ ...formData, vendorName: e.target.value })
            }
            maxLength={200}
            placeholder="e.g., ABC Repair"
            className="w-full rounded border px-3 py-2"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Estimated Cost (₹)</span>
          <input
            type="number"
            value={formData.estimatedCost}
            onChange={(e) =>
              setFormData({ ...formData, estimatedCost: e.target.value })
            }
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full rounded border px-3 py-2"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Actual Cost (₹)</span>
          <input
            type="number"
            value={formData.actualCost}
            onChange={(e) =>
              setFormData({ ...formData, actualCost: e.target.value })
            }
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full rounded border px-3 py-2"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={loading || formData.status === currentStatus}
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {loading ? "Updating..." : "Update Status"}
      </button>
    </form>
  );
}
