import { useState, useEffect } from "react";
import type { SourceState } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SOURCE_TYPE_OPTIONS = ["DS18B20", "Manual", "NTC"] as const;

interface SourceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; source_type: string; gpio?: number; rom_code?: string }) => void;
  initialData?: SourceState | null;
}

export function SourceForm({ open, onOpenChange, onSubmit, initialData }: SourceFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [sourceType, setSourceType] = useState<string>(initialData?.source_type ?? SOURCE_TYPE_OPTIONS[0]);
  const [gpio, setGpio] = useState<string>(initialData?.gpio != null && initialData.gpio < 255 ? String(initialData.gpio) : "");
  const [romCode, setRomCode] = useState<string>(initialData?.rom_code ?? "");

  const isEdit = initialData != null;
  const showGpio = sourceType === "NTC";
  const showRomCode = sourceType === "DS18B20";

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "");
      setSourceType(initialData?.source_type ?? SOURCE_TYPE_OPTIONS[0]);
      setGpio(initialData?.gpio != null && initialData.gpio < 255 ? String(initialData.gpio) : "");
      setRomCode(initialData?.rom_code ?? "");
    }
  }, [open, initialData]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const data: {
      name: string;
      source_type: string;
      gpio?: number;
      rom_code?: string;
    } = {
      name: name.trim(),
      source_type: sourceType
    };
    if (showGpio && gpio.trim()) {
      data.gpio = Number(gpio);
    }
    if (showRomCode && romCode.trim()) {
      data.rom_code = romCode.trim();
    }
    onSubmit(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Source" : "Create Source"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="source-name">Name</Label>
            <Input id="source-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CPU Temp" required autoFocus className="mt-1" />
          </div>

          {/* Type */}
          <div>
            <Label>Type</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* GPIO (NTC) */}
          {showGpio && (
            <div>
              <Label htmlFor="source-gpio">GPIO</Label>
              <Input id="source-gpio" type="number" value={gpio} onChange={(e) => setGpio(e.target.value)} placeholder="e.g. 4" className="mt-1" />
            </div>
          )}

          {/* ROM Code (DS18B20) */}
          {showRomCode && (
            <div>
              <Label htmlFor="source-rom">ROM Code</Label>
              <Input id="source-rom" value={romCode} onChange={(e) => setRomCode(e.target.value)} placeholder="e.g. 28FF1234567890AB" className="mt-1 font-mono" />
            </div>
          )}

          {/* Footer */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

