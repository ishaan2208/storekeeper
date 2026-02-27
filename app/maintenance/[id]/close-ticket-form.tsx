"use client";

import { Condition } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, DollarSign } from "lucide-react";

import { closeTicket } from "@/lib/actions/maintenance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InlineError } from "@/components/ui/inline-error";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      {error && <InlineError message={error} />}

      <Alert>
        <AlertDescription className="text-sm">
          Closing the ticket will create a MAINT_IN movement log and update the asset
          condition and location.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="note">Closing Note (Optional)</Label>
        <Textarea
          id="note"
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          maxLength={500}
          rows={3}
          placeholder="Add any final notes about the resolution..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="actualCost">
            <DollarSign className="mr-1 inline-block h-4 w-4" />
            Final Actual Cost (₹)
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

        <div className="space-y-2">
          <Label htmlFor="finalCondition">Final Condition</Label>
          <Select
            value={formData.finalCondition}
            onValueChange={(value) =>
              setFormData({ ...formData, finalCondition: value })
            }
          >
            <SelectTrigger id="finalCondition">
              <SelectValue placeholder="Auto-determine from status" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(Condition).map((condition) => (
                <SelectItem key={condition} value={condition}>
                  {condition}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Leave blank to auto-determine: FIXED → GOOD, UNREPAIRABLE → DAMAGED
          </p>
        </div>
      </div>

      <SubmitButton
        isSubmitting={loading}
        loadingText="Closing..."
        variant="destructive"
      >
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Close Ticket
      </SubmitButton>
    </form>
  );
}
