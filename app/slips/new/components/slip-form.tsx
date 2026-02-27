"use client";

import { Condition, DepartmentType, ItemType, SlipType } from "@prisma/client";
import { useMemo, useState } from "react";
import { Plus, Trash2, Package, MapPin, Users, PenLine, Hash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

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
  vendors?: SelectOption[];
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
  vendors = [],
  issueSlips = [],
  prefillSourceSlipId,
  submitAction,
}: SlipFormProps) {
  const [propertyId, setPropertyId] = useState<string>(properties[0]?.id ?? "");
  const [department, setDepartment] = useState<string>(Object.values(DepartmentType)[0]);
  const [fromLocationId, setFromLocationId] = useState<string>(locations[0]?.id ?? "");
  const [toLocationId, setToLocationId] = useState<string>(locations[0]?.id ?? "");
  const [vendorId, setVendorId] = useState<string>("");
  const [requestedById, setRequestedById] = useState<string>("");
  const [issuedById, setIssuedById] = useState<string>("");
  const [receivedById, setReceivedById] = useState<string>("");
  const [signedByName, setSignedByName] = useState<string>("");
  const [signedByUserId, setSignedByUserId] = useState<string>("");

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
      className="space-y-6"
    >
      {/* Where and Who Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Where and Who
          </CardTitle>
          <CardDescription>
            Select locations and people involved in this movement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {slipType === SlipType.RETURN && issueSlips.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="sourceSlipId">Return from Original Issue (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Select the original issue slip to validate return quantities and assets.
              </p>
              <Select value={sourceSlipId} onValueChange={setSourceSlipId}>
                <SelectTrigger id="sourceSlipId">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {issueSlips.map((slip) => (
                    <SelectItem key={slip.id} value={slip.id}>
                      {slip.slipNo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="sourceSlipId" value={sourceSlipId} />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="propertyId">Property <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground">Hotel/site where this movement happened.</p>
              <Select value={propertyId} onValueChange={setPropertyId} required>
                <SelectTrigger id="propertyId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="propertyId" value={propertyId} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground">Which department requested this movement.</p>
              <Select value={department} onValueChange={setDepartment} required>
                <SelectTrigger id="department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DepartmentType).map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {titleCaseLabel(dept)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="department" value={department} />
            </div>

            {slipType !== SlipType.RECEIVE && (
              <div className="space-y-2">
                <Label htmlFor="fromLocationId">From Location <span className="text-destructive">*</span></Label>
                <p className="text-xs text-muted-foreground">Where the item is currently kept.</p>
                <Select value={fromLocationId} onValueChange={setFromLocationId} required>
                  <SelectTrigger id="fromLocationId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="fromLocationId" value={fromLocationId} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="toLocationId">
                {slipType === SlipType.RECEIVE ? "Receiving Location" : "To Location"} <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                {slipType === SlipType.RECEIVE
                  ? "Where the items will be stored after receiving."
                  : "Where the item is being moved to."}
              </p>
              <Select value={toLocationId} onValueChange={setToLocationId} required>
                <SelectTrigger id="toLocationId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="toLocationId" value={toLocationId} />
            </div>

            {slipType === SlipType.RECEIVE ? (
              <div className="space-y-2">
                <Label htmlFor="vendorId">Vendor (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Select the vendor/supplier if this is a purchase.
                </p>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger id="vendorId">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="vendorId" value={vendorId} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="requestedById">Requested By</Label>
                <p className="text-xs text-muted-foreground">Person who asked for this movement.</p>
                <Select value={requestedById} onValueChange={setRequestedById}>
                  <SelectTrigger id="requestedById">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="requestedById" value={requestedById} />
              </div>
            )}

            {slipType === SlipType.RECEIVE ? (
              <div className="space-y-2">
                <Label htmlFor="receivedById">Received By</Label>
                <p className="text-xs text-muted-foreground">Store person receiving the items.</p>
                <Select value={receivedById} onValueChange={setReceivedById}>
                  <SelectTrigger id="receivedById">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="receivedById" value={receivedById} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="issuedById">Issued By</Label>
                <p className="text-xs text-muted-foreground">Person handing over the item.</p>
                <Select value={issuedById} onValueChange={setIssuedById}>
                  <SelectTrigger id="issuedById">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="issuedById" value={issuedById} />
              </div>
            )}

            {slipType === SlipType.RETURN && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="receivedByIdReturn">Received By</Label>
                <p className="text-xs text-muted-foreground">Person receiving the returned item.</p>
                <Select value={receivedById} onValueChange={setReceivedById}>
                  <SelectTrigger id="receivedByIdReturn">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="receivedById" value={receivedById} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* What Is Moving Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                What Is Moving
              </CardTitle>
              <CardDescription>
                Add one or more consumables or equipment lines. Use the filter below to search items.
              </CardDescription>
            </div>
            <Button type="button" onClick={addLine} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-filter">Filter items by name</Label>
            <Input
              id="item-filter"
              type="text"
              value={itemFilter}
              onChange={(event) => setItemFilter(event.target.value)}
              placeholder="Type to search items..."
            />
          </div>

          <Separator />

          {lines.map((line, index) => {
            const availableItems = filteredItemsByType[line.itemType];
            const selectedItemId = availableItems.some((item) => item.id === line.itemId)
              ? line.itemId
              : availableItems[0]?.id ?? "";

            const filteredAssets = assets.filter((asset) => asset.itemId === selectedItemId);

            return (
              <Card key={line.id} className="border-muted">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Hash className="h-4 w-4" />
                      Line {index + 1}
                    </p>
                    <Button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      variant="ghost"
                      size="sm"
                      disabled={lines.length === 1}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Item Category</Label>
                      <p className="text-xs text-muted-foreground">
                        Choose Consumable for quantity-based items, Equipment for tagged assets.
                      </p>
                      <Select
                        value={line.itemType}
                        onValueChange={(value) => {
                          const nextType = value as ItemType;
                          const defaultItem = itemsByType[nextType][0];
                          updateLine(line.id, {
                            itemType: nextType,
                            itemId: defaultItem?.id ?? "",
                            qty: "",
                            assetId: "",
                            conditionAtMove: "",
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ItemType.STOCK}>{ITEM_TYPE_LABEL[ItemType.STOCK]}</SelectItem>
                          <SelectItem value={ItemType.ASSET}>{ITEM_TYPE_LABEL[ItemType.ASSET]}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Item</Label>
                      <p className="text-xs text-muted-foreground">
                        {availableItems.length === 0
                          ? "No items match the filter."
                          : `${availableItems.length} item(s) available.`}
                      </p>
                      <Select
                        value={selectedItemId}
                        onValueChange={(value) =>
                          updateLine(line.id, { itemId: value, assetId: "" })
                        }
                        disabled={availableItems.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {lineErrors[line.id]?.itemId && (
                        <p className="text-xs text-destructive">{lineErrors[line.id]?.itemId}</p>
                      )}
                    </div>

                    {line.itemType === ItemType.STOCK ? (
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <p className="text-xs text-muted-foreground">
                          Enter total units being moved (for example, 10).
                        </p>
                        <Input
                          value={line.qty}
                          onChange={(event) => updateLine(line.id, { qty: event.target.value })}
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="e.g. 10"
                        />
                        {lineErrors[line.id]?.qty && (
                          <p className="text-xs text-destructive">{lineErrors[line.id]?.qty}</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Equipment Tag</Label>
                        <p className="text-xs text-muted-foreground">
                          Pick the exact tagged equipment to move.
                        </p>
                        <Select
                          value={line.assetId}
                          onValueChange={(value) => updateLine(line.id, { assetId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select asset" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredAssets.map((asset) => (
                              <SelectItem key={asset.id} value={asset.id}>
                                {asset.assetTag} - {asset.itemName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {lineErrors[line.id]?.assetId && (
                          <p className="text-xs text-destructive">{lineErrors[line.id]?.assetId}</p>
                        )}
                      </div>
                    )}

                    {slipType === SlipType.RETURN && line.itemType === ItemType.ASSET && (
                      <div className="space-y-2">
                        <Label>Condition on Return</Label>
                        <p className="text-xs text-muted-foreground">
                          Update only if condition changed while in use.
                        </p>
                        <Select
                          value={line.conditionAtMove}
                          onValueChange={(value) =>
                            updateLine(line.id, { conditionAtMove: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Keep existing condition" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(Condition).map((condition) => (
                              <SelectItem key={condition} value={condition}>
                                {titleCaseLabel(condition)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      value={line.notes}
                      onChange={(event) => updateLine(line.id, { notes: event.target.value })}
                      placeholder="Optional line note"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <input type="hidden" name="linesPayload" value={serializedLines} />

      {/* Sign-Off Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5" />
            Sign-Off
          </CardTitle>
          <CardDescription>
            Capture who approved this movement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="signedByName">Signed By Name <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground">
                Enter full name of the person signing this record.
              </p>
              <Input
                id="signedByName"
                name="signedByName"
                type="text"
                value={signedByName}
                onChange={(e) => setSignedByName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signedByUserId">Signed By User (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Link signature to an existing user if available.
              </p>
              <Select value={signedByUserId} onValueChange={setSignedByUserId}>
                <SelectTrigger id="signedByUserId">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="signedByUserId" value={signedByUserId} />
            </div>
          </div>
        </CardContent>
      </Card>

      {formError && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {formError}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full sm:w-auto">
        Create {slipType} Slip
      </Button>
    </form>
  );
}
