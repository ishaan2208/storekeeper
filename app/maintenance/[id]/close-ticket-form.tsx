"use client";

import { Condition } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { closeTicket } from "@/lib/actions/maintenance";

type CloseTicketFormProps = {
  ticketId: string;
};

export function CloseTicketForm({ ticketId }: CloseTicketFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    note: "",
    actualCost: "",
    finalCondition: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const input = {
        ticketId,
        note: formData.note.trim() || undefined,
        actualCost: formData.actualCost ? parseFloat(formData.actualCost) : undefined,
        finalCondition: formData.finalCondition
          ? (formData.finalCondition as Condition)
          : undefined,
      };

      await closeTicket(input);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close ticket");
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

      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Closing the ticket will create a MAINT_IN movement log and update the asset
        condition and location.
      </p>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Closing Note (Optional)</span>
        <textarea
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          maxLength={500}
          rows={3}
          placeholder="Add any final notes about the resolution..."
          className="w-full rounded border px-3 py-2"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Final Actual Cost (₹)</span>
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

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Final Condition</span>
          <select
            value={formData.finalCondition}
            onChange={(e) =>
              setFormData({ ...formData, finalCondition: e.target.value })
            }
            className="w-full rounded border px-3 py-2"
          >
            <option value="">Auto-determine from status</option>
            {Object.values(Condition).map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
          <span className="text-xs text-zinc-500">
            Leave blank to auto-determine: FIXED → GOOD, UNREPAIRABLE → DAMAGED
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-800"
      >
        {loading ? "Closing..." : "Close Ticket"}
      </button>
    </form>
  );
}
