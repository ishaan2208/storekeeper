"use client";

import { MaintenanceStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TrendingUp, DollarSign } from "lucide-react";

import { updateMaintenanceStatus } from "@/lib/actions/maintenance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InlineError } from "@/components/ui/inline-error";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      {error && <InlineError message={error} />}

      <div className="space-y-2">
        <Label htmlFor="status">
          New Status <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.status}
          onValueChange={(value) =>
            setFormData({ ...formData, status: value as MaintenanceStatus })
          }
          required
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((status) => (
              <SelectItem key={status} value={status}>
                {status.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note (Optional)</Label>
        <Textarea
          id="note"
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          maxLength={500}
          rows={3}
          placeholder="Add any notes about this status change..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="vendorName">Vendor Name</Label>
          <Input
            id="vendorName"
            value={formData.vendorName}
            onChange={(e) =>
              setFormData({ ...formData, vendorName: e.target.value })
            }
            maxLength={200}
            placeholder="e.g., ABC Repair"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimatedCost">
            <DollarSign className="mr-1 inline-block h-4 w-4" />
            Estimated Cost (₹)
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

        <div className="space-y-2">
          <Label htmlFor="actualCost">
            <DollarSign className="mr-1 inline-block h-4 w-4" />
            Actual Cost (₹)
          </Label>
          <Input
            id="actualCost"
            type="number"
            value={formData.actualCost}
            onChange={(e) =>
              setFormData({ ...formData, actualCost: e.target.value })
            }
            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </div>
      </div>

      <SubmitButton
        isSubmitting={loading}
        loadingText="Updating..."
        disabled={formData.status === currentStatus}
      >
        <TrendingUp className="mr-2 h-4 w-4" />
        Update Status
      </SubmitButton>
    </form>
  );
}
