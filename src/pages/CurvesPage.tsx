import { useState } from "react";
import { Plus } from "lucide-react";
import type { CurveState } from "../lib/api";
import { useCurves, useCreateCurve, useUpdateCurve, useDeleteCurve } from "../hooks/queries";
import { logUserAction } from "../lib/logUserAction";
import { useDeviceStore } from "../stores/deviceStore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurveList } from "../components/curves/CurveList";
import { CurveEditor } from "../components/curves/CurveEditor";

const MAX_CURVE_SLOTS = 16;

interface CurvePoint {
  temp_c: number;
  duty: number;
}

export function CurvesPage() {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const { showToast } = useToast();
  const { data: curves = [] } = useCurves(activeDeviceId);
  const createCurve = useCreateCurve(activeDeviceId ?? -1);
  const updateCurve = useUpdateCurve(activeDeviceId ?? -1);
  const deleteCurve = useDeleteCurve(activeDeviceId ?? -1);
  const [editingCurve, setEditingCurve] = useState<CurveState | null>(null);
  const [editorPoints, setEditorPoints] = useState<CurvePoint[]>([]);
  const [curveName, setCurveName] = useState("");
  const [showEditor, setShowEditor] = useState(false);

  function openCreate() {
    setEditingCurve(null);
    setCurveName("");
    setEditorPoints([
      { temp_c: 30, duty: 30 },
      { temp_c: 70, duty: 100 }
    ]);
    setShowEditor(true);
  }

  function openEdit(curve: CurveState) {
    setEditingCurve(curve);
    setCurveName(curve.name);
    setEditorPoints(curve.points.map((p) => ({ ...p })));
    setShowEditor(true);
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingCurve(null);
    setCurveName("");
    setEditorPoints([]);
  }

  async function handleSave() {
    if (activeDeviceId == null) return;
    if (!curveName.trim()) return;
    if (editorPoints.length < 2) return;

    try {
      if (editingCurve) {
        const updated = await updateCurve.mutateAsync({
          slot: editingCurve.slot,
          req: { name: curveName.trim(), points: editorPoints }
        });
        showToast("Curve updated", "success");
        logUserAction(activeDeviceId, "curve", `Curve "${updated.name}" updated`, `slot=${updated.slot}, points=${updated.points.length}`);
      } else {
        const created = await createCurve.mutateAsync({
          name: curveName.trim(),
          points: editorPoints
        });
        showToast("Curve created", "success");
        logUserAction(activeDeviceId, "curve", `Curve "${created.name}" created`, `slot=${created.slot}, points=${created.points.length}`);
      }
      closeEditor();
    } catch (err) {
      showToast(`Failed to save curve: ${String(err)}`, "error");
    }
  }

  async function handleDelete(curve: CurveState) {
    if (activeDeviceId == null) return;
    if (!confirm(`Delete curve "${curve.name}"?`)) return;
    try {
      await deleteCurve.mutateAsync(curve.slot);
      showToast("Curve deleted", "success");
      logUserAction(activeDeviceId, "curve", `Curve "${curve.name}" deleted`, `slot=${curve.slot}`);
    } catch (err) {
      showToast(`Failed to delete curve: ${String(err)}`, "error");
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Curves</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {curves.length} of {MAX_CURVE_SLOTS} slots used
          </p>
        </div>
        <Button onClick={openCreate} disabled={curves.length >= MAX_CURVE_SLOTS}>
          <Plus size={16} />
          Create Curve
        </Button>
      </div>

      {/* Curve list or editor */}
      {showEditor ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex shrink-0 items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">{editingCurve ? "Edit Curve" : "Create Curve"}</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={closeEditor}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!curveName.trim() || editorPoints.length < 2}>
                {editingCurve ? "Update" : "Create"}
              </Button>
            </div>
          </div>

          <div className="shrink-0">
            <Label htmlFor="curve-name">Name</Label>
            <Input id="curve-name" type="text" value={curveName} onChange={(e) => setCurveName(e.target.value)} placeholder="e.g. CPU Fan Curve" className="mt-1 max-w-sm" autoFocus />
          </div>

          <div className="min-h-0 flex-1">
            <CurveEditor points={editorPoints} onChange={setEditorPoints} />
          </div>
        </div>
      ) : (
        <CurveList curves={curves} onEdit={openEdit} onDelete={handleDelete} onCreateFirst={openCreate} />
      )}
    </div>
  );
}

