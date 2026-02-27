"use client";

import { Condition, ItemType } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wrench, Search, ChevronRight, AlertCircle, Tag, DollarSign } from "lucide-react";

import { createMaintenanceTicket } from "@/lib/actions/maintenance";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { InlineError } from "@/components/ui/inline-error";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Create Maintenance Ticket"
        description="Report a maintenance issue for an asset."
        icon={<Wrench className="h-5 w-5" />}
        actions={
          <Button variant="outline" asChild>
            <Link href="/maintenance">
              <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
              Back
            </Link>
          </Button>
        }
      />

      {error && <InlineError message={error} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Asset Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by asset tag or item name..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearchAssets();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleSearchAssets}
                disabled={loadingAssets}
                variant="secondary"
              >
                <Search className="mr-2 h-4 w-4" />
                {loadingAssets ? "Searching..." : "Search"}
              </Button>
            </div>

            {assets.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded border">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted">
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Asset Tag</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <input
                            type="radio"
                            name="assetId"
                            value={asset.id}
                            checked={formData.assetId === asset.id}
                            onChange={(e) =>
                              setFormData({ ...formData, assetId: e.target.value })
                            }
                            className="h-4 w-4"
                          />
                        </TableCell>
                        <TableCell className="font-medium font-mono text-sm">
                          {asset.assetTag}
                        </TableCell>
                        <TableCell>{asset.itemName}</TableCell>
                        <TableCell>
                          <StatusBadge status={asset.condition} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {asset.currentLocationName ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {selectedAsset && (
              <Alert>
                <Tag className="h-4 w-4" />
                <AlertDescription>
                  <strong>Selected:</strong> {selectedAsset.assetTag} -{" "}
                  {selectedAsset.itemName}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Problem Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="problemText">
                Problem Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="problemText"
                value={formData.problemText}
                onChange={(e) =>
                  setFormData({ ...formData, problemText: e.target.value })
                }
                required
                minLength={10}
                maxLength={1000}
                rows={4}
                placeholder="Describe the issue in detail..."
              />
              <p className="text-xs text-muted-foreground">
                {formData.problemText.length}/1000 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendorName">Vendor Name (Optional)</Label>
              <Input
                id="vendorName"
                value={formData.vendorName}
                onChange={(e) =>
                  setFormData({ ...formData, vendorName: e.target.value })
                }
                maxLength={200}
                placeholder="e.g., ABC Repair Services"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedCost">
                <DollarSign className="mr-1 inline-block h-4 w-4" />
                Estimated Cost (₹) (Optional)
              </Label>
              <Input
                id="estimatedCost"
                type="number"
                value={formData.estimatedCost}
                onChange={(e) =>
                  setFormData({ ...formData, estimatedCost: e.target.value })
                }
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <SubmitButton
            isSubmitting={loading}
            loadingText="Creating..."
            disabled={!formData.assetId || !formData.problemText}
          >
            Create Ticket
          </SubmitButton>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
