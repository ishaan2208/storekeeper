"use client";

import { Condition, DepartmentType, ItemType, SlipType } from "@prisma/client";
import { useMemo, useState } from "react";

type SelectOption = {
  id: string;
  name: string;
};

type ItemOption = {
  id: string;
  name: string;
  itemType: ItemType;
};

type AssetOption = {
  id: string;
  assetTag: string;
  itemId: string;
  itemName: string;
};

type LineState = {
  id: string;
  itemType: ItemType;
  itemId: string;
  qty: string;
  assetId: string;
  conditionAtMove: string;
  notes: string;
};

type LineErrors = {
  itemId?: string;
  qty?: string;
  assetId?: string;
};

type SlipFormProps = {
  slipType: SlipType;
  properties: SelectOption[];
  locations: SelectOption[];
  users: SelectOption[];
  items: ItemOption[];
  assets: AssetOption[];
  issueSlips?: Array<{ id: string; slipNo: string }>;
  prefillSourceSlipId?: string;
  submitAction: (formData: FormData) => void;
};

const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  [ItemType.STOCK]: "Consumable",
  [ItemType.ASSET]: "Equipment",
};

function titleCaseLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createInitialLine(items: ItemOption[]): LineState {
  const stockItem = items.find((item) => item.itemType === ItemType.STOCK) ?? items[0];
  return {
    id: crypto.randomUUID(),
    itemType: stockItem?.itemType ?? ItemType.STOCK,
    itemId: stockItem?.id ?? "",
    qty: "",
    assetId: "",
    conditionAtMove: "",
    notes: "",
  };
}

export function SlipForm({
  slipType,
  properties,
  locations,
  users,
  items,
  assets,
  issueSlips = [],
  prefillSourceSlipId,
  submitAction,
}: SlipFormProps) {
  const [sourceSlipId, setSourceSlipId] = useState<string>(prefillSourceSlipId ?? "");
  const [lines, setLines] = useState<LineState[]>(() => [createInitialLine(items)]);
  const [lineErrors, setLineErrors] = useState<Record<string, LineErrors>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [itemFilter, setItemFilter] = useState<string>("");

  const itemsByType = useMemo(
    () => ({
      [ItemType.STOCK]: items.filter((item) => item.itemType === ItemType.STOCK),
      [ItemType.ASSET]: items.filter((item) => item.itemType === ItemType.ASSET),
    }),
    [items],
  );

  const filteredItems = useMemo(() => {
    if (!itemFilter.trim()) return items;
    const needle = itemFilter.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(needle));
  }, [items, itemFilter]);

  const filteredItemsByType = useMemo(
    () => ({
      [ItemType.STOCK]: filteredItems.filter((item) => item.itemType === ItemType.STOCK),
      [ItemType.ASSET]: filteredItems.filter((item) => item.itemType === ItemType.ASSET),
    }),
    [filteredItems],
  );

  const updateLine = (lineId: string, patch: Partial<LineState>) => {
    setLines((current) =>
      current.map((line) => {
        if (line.id !== lineId) {
          return line;
        }
        return { ...line, ...patch };
      }),
    );
  };

  const addLine = () => {
    setLines((current) => [...current, createInitialLine(items)]);
  };

  const removeLine = (lineId: string) => {
    setLines((current) => {
      if (current.length === 1) {
        return current;
      }
      return current.filter((line) => line.id !== lineId);
    });
    setLineErrors((current) => {
      const next = { ...current };
      delete next[lineId];
      return next;
    });
  };

  const validateLines = (): boolean => {
    const nextErrors: Record<string, LineErrors> = {};

    for (const line of lines) {
      const errors: LineErrors = {};

      if (!line.itemId) {
        errors.itemId = "Item is required.";
      }

      if (line.itemType === ItemType.STOCK) {
        const qty = Number(line.qty);
        if (!line.qty || Number.isNaN(qty) || qty <= 0) {
          errors.qty = "Enter a quantity greater than 0.";
        }
      }

      if (line.itemType === ItemType.ASSET && !line.assetId) {
        errors.assetId = "Select an asset.";
      }

      if (Object.keys(errors).length > 0) {
        nextErrors[line.id] = errors;
      }
    }

    setLineErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const serializedLines = JSON.stringify(
    lines.map((line) => {
      const base = {
        itemId: line.itemId,
        itemType: line.itemType,
        notes: line.notes.trim() || undefined,
      };

      if (line.itemType === ItemType.STOCK) {
        return {
          ...base,
          qty: line.qty ? Number(line.qty) : undefined,
        };
      }

      return {
        ...base,
        assetId: line.assetId || undefined,
        conditionAtMove: line.conditionAtMove || undefined,
      };
    }),
  );

  return (
    <form
      action={submitAction}
      onSubmit={(event) => {
        const isValid = validateLines();
        if (!isValid) {
          event.preventDefault();
          setFormError("Fix line item errors before submitting.");
          return;
        }
        setFormError(null);
      }}
      className="space-y-6 rounded-lg border p-4"
    >
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Where and Who</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Select locations and people involved in this movement.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {slipType === SlipType.RETURN && issueSlips.length > 0 ? (
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Return from Original Issue (optional)</span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Select the original issue slip to validate return quantities and assets.
              </p>
              <select
                name="sourceSlipId"
                value={sourceSlipId}
                onChange={(event) => setSourceSlipId(event.target.value)}
                className="w-full rounded border px-2 py-2"
              >
                <option value="">None</option>
                {issueSlips.map((slip) => (
                  <option key={slip.id} value={slip.id}>
                    {slip.slipNo}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="space-y-1 text-sm">
            <span>Property</span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Hotel/site where this movement happened.</p>
            <select name="propertyId" className="w-full rounded border px-2 py-2" required>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Department</span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Which department requested this movement.</p>
            <select name="department" className="w-full rounded border px-2 py-2" required>
              {Object.values(DepartmentType).map((department) => (
                <option key={department} value={department}>
                  {titleCaseLabel(department)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>From Location</span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Where the item is currently kept.</p>
            <select name="fromLocationId" className="w-full rounded border px-2 py-2" required>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>To Location</span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Where the item is being moved to.</p>
            <select name="toLocationId" className="w-full rounded border px-2 py-2" required>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Requested By</span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Person who asked for this movement.</p>
            <select name="requestedById" className="w-full rounded border px-2 py-2">
              <option value="">Select user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Issued By</span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Person handing over the item.</p>
            <select name="issuedById" className="w-full rounded border px-2 py-2">
              <option value="">Select user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>

          {slipType === SlipType.RETURN ? (
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Received By</span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Person receiving the returned item.</p>
              <select name="receivedById" className="w-full rounded border px-2 py-2">
                <option value="">Select user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {slipType === SlipType.TRANSFER ? (
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Transfer Notes</span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Explain why this transfer is happening.
              </p>
              <input name="transferNotes" className="w-full rounded border px-2 py-2" />
            </label>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">What Is Moving</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Add one or more consumables or equipment lines. Use the filter below to search items.
            </p>
          </div>
          <button
            type="button"
            onClick={addLine}
            className="rounded border px-3 py-1 text-sm font-medium"
          >
            Add line
          </button>
        </div>

        <div className="space-y-1 text-sm">
          <label htmlFor="item-filter" className="text-xs text-zinc-500 dark:text-zinc-400">
            Filter items by name
          </label>
          <input
            id="item-filter"
            type="text"
            value={itemFilter}
            onChange={(event) => setItemFilter(event.target.value)}
            placeholder="Type to search items..."
            className="w-full rounded border px-2 py-2"
          />
        </div>

        {lines.map((line, index) => {
          const availableItems = filteredItemsByType[line.itemType];
          const selectedItemId = availableItems.some((item) => item.id === line.itemId)
            ? line.itemId
            : availableItems[0]?.id ?? "";

          const filteredAssets = assets.filter((asset) => asset.itemId === selectedItemId);

          return (
            <div key={line.id} className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Line {index + 1}</p>
                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  className="rounded border px-2 py-1 text-xs"
                >
                  Remove
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span>Item Category</span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Choose Consumable for quantity-based items, Equipment for tagged assets.
                  </p>
                  <select
                    value={line.itemType}
                    onChange={(event) => {
                      const nextType = event.target.value as ItemType;
                      const defaultItem = itemsByType[nextType][0];
                      updateLine(line.id, {
                        itemType: nextType,
                        itemId: defaultItem?.id ?? "",
                        qty: "",
                        assetId: "",
                        conditionAtMove: "",
                      });
                    }}
                    className="w-full rounded border px-2 py-2"
                  >
                    <option value={ItemType.STOCK}>{ITEM_TYPE_LABEL[ItemType.STOCK]}</option>
                    <option value={ItemType.ASSET}>{ITEM_TYPE_LABEL[ItemType.ASSET]}</option>
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span>Item</span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {availableItems.length === 0
                      ? "No items match the filter."
                      : `${availableItems.length} item(s) available.`}
                  </p>
                  <select
                    value={selectedItemId}
                    onChange={(event) =>
                      updateLine(line.id, { itemId: event.target.value, assetId: "" })
                    }
                    className="w-full rounded border px-2 py-2"
                    disabled={availableItems.length === 0}
                  >
                    {availableItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {lineErrors[line.id]?.itemId ? (
                    <p className="text-xs text-red-600">{lineErrors[line.id]?.itemId}</p>
                  ) : null}
                </label>

                {line.itemType === ItemType.STOCK ? (
                  <label className="space-y-1 text-sm">
                    <span>Quantity</span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Enter total units being moved (for example, 10).
                    </p>
                    <input
                      value={line.qty}
                      onChange={(event) => updateLine(line.id, { qty: event.target.value })}
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="w-full rounded border px-2 py-2"
                      placeholder="e.g. 10"
                    />
                    {lineErrors[line.id]?.qty ? (
                      <p className="text-xs text-red-600">{lineErrors[line.id]?.qty}</p>
                    ) : null}
                  </label>
                ) : (
                  <label className="space-y-1 text-sm">
                    <span>Equipment Tag</span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Pick the exact tagged equipment to move.
                    </p>
                    <select
                      value={line.assetId}
                      onChange={(event) => updateLine(line.id, { assetId: event.target.value })}
                      className="w-full rounded border px-2 py-2"
                    >
                      <option value="">Select asset</option>
                      {filteredAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.assetTag} - {asset.itemName}
                        </option>
                      ))}
                    </select>
                    {lineErrors[line.id]?.assetId ? (
                      <p className="text-xs text-red-600">{lineErrors[line.id]?.assetId}</p>
                    ) : null}
                  </label>
                )}

                {slipType === SlipType.RETURN && line.itemType === ItemType.ASSET ? (
                  <label className="space-y-1 text-sm">
                    <span>Condition on Return</span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Update only if condition changed while in use.
                    </p>
                    <select
                      value={line.conditionAtMove}
                      onChange={(event) =>
                        updateLine(line.id, { conditionAtMove: event.target.value })
                      }
                      className="w-full rounded border px-2 py-2"
                    >
                      <option value="">Keep existing condition</option>
                      {Object.values(Condition).map((condition) => (
                        <option key={condition} value={condition}>
                          {titleCaseLabel(condition)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              <label className="space-y-1 text-sm">
                <span>Notes</span>
                <input
                  value={line.notes}
                  onChange={(event) => updateLine(line.id, { notes: event.target.value })}
                  className="w-full rounded border px-2 py-2"
                  placeholder="Optional line note"
                />
              </label>
            </div>
          );
        })}
      </section>

      <input type="hidden" name="linesPayload" value={serializedLines} />

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Sign-Off</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Capture who approved this movement.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Signed By Name</span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Enter full name of the person signing this record.
            </p>
            <input name="signedByName" type="text" className="w-full rounded border px-2 py-2" required />
          </label>

          <label className="space-y-1 text-sm">
            <span>Signed By User (optional)</span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Link signature to an existing user if available.
            </p>
            <select name="signedByUserId" className="w-full rounded border px-2 py-2">
              <option value="">Select user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {formError ? (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-900">{formError}</p>
      ) : null}

      <button
        type="submit"
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        Create {slipType} Slip
      </button>
    </form>
  );
}
