"use client";

import { Condition, ItemType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createMaintenanceTicket } from "@/lib/actions/maintenance";

type Asset = {
  id: string;
  assetTag: string;
  itemId: string;
  itemName: string;
  condition: Condition;
  currentLocationName: string | null;
};

export default function NewMaintenanceTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    assetId: "",
    problemText: "",
    vendorName: "",
    estimatedCost: "",
  });

  const handleSearchAssets = async () => {
    if (!searchTerm.trim()) {
      setAssets([]);
      return;
    }

    setLoadingAssets(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/assets/search?q=${encodeURIComponent(searchTerm)}&itemType=${ItemType.ASSET}`,
      );
      if (!response.ok) {
        throw new Error("Failed to search assets");
      }
      const data = await response.json();
      setAssets(data.assets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search assets");
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const input = {
        assetId: formData.assetId,
        problemText: formData.problemText,
        vendorName: formData.vendorName.trim() || undefined,
        estimatedCost: formData.estimatedCost
          ? parseFloat(formData.estimatedCost)
          : undefined,
      };

      const ticket = await createMaintenanceTicket(input);
      router.push(`/maintenance/${ticket.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
      setLoading(false);
    }
  };

  const selectedAsset = assets.find((a) => a.id === formData.assetId);

  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold">Create Maintenance Ticket</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Report a maintenance issue for an asset.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-medium">Asset Selection</h2>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by asset tag or item name..."
                className="flex-1 rounded border px-3 py-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearchAssets();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleSearchAssets}
                disabled={loadingAssets}
                className="rounded border bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {loadingAssets ? "Searching..." : "Search"}
              </button>
            </div>

            {assets.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded border">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800">
                    <tr>
                      <th className="px-3 py-2 text-left">Select</th>
                      <th className="px-3 py-2 text-left">Asset Tag</th>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-left">Condition</th>
                      <th className="px-3 py-2 text-left">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => (
                      <tr
                        key={asset.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        <td className="px-3 py-2">
                          <input
                            type="radio"
                            name="assetId"
                            value={asset.id}
                            checked={formData.assetId === asset.id}
                            onChange={(e) =>
                              setFormData({ ...formData, assetId: e.target.value })
                            }
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {asset.assetTag}
                        </td>
                        <td className="px-3 py-2">{asset.itemName}</td>
                        <td className="px-3 py-2">{asset.condition}</td>
                        <td className="px-3 py-2">
                          {asset.currentLocationName ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedAsset && (
              <div className="rounded border bg-blue-50 p-3 text-sm dark:bg-blue-900/20">
                <strong>Selected:</strong> {selectedAsset.assetTag} -{" "}
                {selectedAsset.itemName}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-white p-4 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-medium">Problem Details</h2>

          <div className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">
                Problem Description <span className="text-red-600">*</span>
              </span>
              <textarea
                value={formData.problemText}
                onChange={(e) =>
                  setFormData({ ...formData, problemText: e.target.value })
                }
                required
                minLength={10}
                maxLength={1000}
                rows={4}
                placeholder="Describe the issue in detail..."
                className="w-full rounded border px-3 py-2"
              />
              <span className="text-xs text-zinc-500">
                {formData.problemText.length}/1000 characters
              </span>
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Vendor Name (Optional)</span>
              <input
                type="text"
                value={formData.vendorName}
                onChange={(e) =>
                  setFormData({ ...formData, vendorName: e.target.value })
                }
                maxLength={200}
                placeholder="e.g., ABC Repair Services"
                className="w-full rounded border px-3 py-2"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Estimated Cost (₹) (Optional)</span>
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
          </div>
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !formData.assetId || !formData.problemText}
            className="rounded bg-black px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {loading ? "Creating..." : "Create Ticket"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded border px-6 py-2 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
