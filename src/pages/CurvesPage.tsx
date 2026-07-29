import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { api, type CurveState } from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";
import { useToast } from "../stores/toastStore";
import { CurveList } from "../components/curves/CurveList";
import { CurveEditor } from "../components/curves/CurveEditor";

const MAX_CURVE_SLOTS = 8;

interface CurvePoint {
  temp_c: number;
  duty: number;
}

export function CurvesPage() {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const { showToast } = useToast();
  const [curves, setCurves] = useState<CurveState[]>([]);
  const [editingCurve, setEditingCurve] = useState<CurveState | null>(null);
  const [editorPoints, setEditorPoints] = useState<CurvePoint[]>([]);
  const [curveName, setCurveName] = useState("");
  const [showEditor, setShowEditor] = useState(false);

  const fetchCurves = useCallback(async () => {
    if (activeDeviceId == null) return;
    try {
      const data = await api.getCurves(activeDeviceId);
      setCurves(data);
    } catch (err) {
      showToast(`Failed to load curves: ${String(err)}`, "error");
    }
  }, [activeDeviceId]);

  useEffect(() => {
    fetchCurves();
  }, [fetchCurves]);

  function openCreate() {
    setEditingCurve(null);
    setCurveName("");
    setEditorPoints([
      { temp_c: 30, duty: 30 },
      { temp_c: 70, duty: 100 },
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
        const updated = await api.updateCurve(
          activeDeviceId,
          editingCurve.slot,
          { name: curveName.trim(), points: editorPoints }
        );
        setCurves((prev) =>
          prev.map((c) => (c.slot === updated.slot ? updated : c))
        );
      } else {
        const created = await api.createCurve(activeDeviceId, {
          name: curveName.trim(),
          points: editorPoints,
        });
        setCurves((prev) => [...prev, created]);
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
      await api.deleteCurve(activeDeviceId, curve.slot);
      setCurves((prev) => prev.filter((c) => c.slot !== curve.slot));
    } catch (err) {
      showToast(`Failed to delete curve: ${String(err)}`, "error");
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#171717]">Curves</h1>
          <p className="mt-1 text-xs text-[#60646c]">
            {curves.length} of {MAX_CURVE_SLOTS} slots used
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={curves.length >= MAX_CURVE_SLOTS}
          className="flex items-center gap-1.5 rounded-md bg-[#171717] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} />
          Create Curve
        </button>
      </div>

      {/* Curve list or editor */}
      {showEditor ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#171717]">
              {editingCurve ? "Edit Curve" : "Create Curve"}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-md border border-[#dcdee0] bg-white px-4 py-2 text-sm font-medium text-[#171717] transition-colors hover:bg-[#f0f0f3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!curveName.trim() || editorPoints.length < 2}
                className="rounded-md bg-[#171717] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editingCurve ? "Update" : "Create"}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="curve-name"
              className="mb-1 block text-xs font-medium text-[#60646c]"
            >
              Name
            </label>
            <input
              id="curve-name"
              type="text"
              value={curveName}
              onChange={(e) => setCurveName(e.target.value)}
              placeholder="e.g. CPU Fan Curve"
              className="w-full max-w-sm rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition-colors focus:border-[#171717]"
              autoFocus
            />
          </div>

          <CurveEditor points={editorPoints} onChange={setEditorPoints} />
        </div>
      ) : (
        <CurveList
          curves={curves}
          onEdit={openEdit}
          onDelete={handleDelete}
          onCreateFirst={openCreate}
        />
      )}
    </div>
  );
}
