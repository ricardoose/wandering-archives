import React, { useState } from "react";
import { X, Sliders, Check, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { db } from "@/src/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { cn } from "@/src/lib/utils";

interface Filters {
  brightness: number;
  contrast: number;
  saturation: number;
  sepia: number;
  grayscale: number;
}

const defaultFilters: Filters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sepia: 0,
  grayscale: 0,
};

interface PhotoEditorProps {
  photo: {
    id: string;
    driveThumbnailUrl: string;
    albumId: string;
    filters?: Filters;
  };
  onClose: () => void;
  onSave: (newFilters: Filters) => void;
}

export default function PhotoEditor({ photo, onClose, onSave }: PhotoEditorProps) {
  const [filters, setFilters] = useState<Filters>(photo.filters || defaultFilters);
  const [isSaving, setIsSaving] = useState(false);

  const getFilterString = () => {
    return `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${filters.sepia}%) grayscale(${filters.grayscale}%)`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const photoRef = doc(db, `albums/${photo.albumId}/photos`, photo.id);
      await updateDoc(photoRef, { filters });
      onSave(filters);
      onClose();
    } catch (err) {
      console.error("Error saving filters:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const FilterSlider = ({ label, name, min, max }: { label: string, name: keyof Filters, min: number, max: number }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="label-micro opacity-40">{label}</span>
        <span className="text-[10px] font-mono font-bold text-accent">{filters[name]}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={filters[name]}
        onChange={(e) => setFilters(prev => ({ ...prev, [name]: parseInt(e.target.value) }))}
        className="w-full accent-accent h-1 bg-border-toned/20 rounded-full appearance-none cursor-pointer"
      />
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-paper/95 backdrop-blur-xl p-8"
    >
      <div className="w-full max-w-6xl grid lg:grid-cols-[1fr_350px] gap-12">
        {/* Preview Area */}
        <div className="relative flex flex-col justify-center items-center bg-ink/5 rounded-sm overflow-hidden p-12">
          <button 
            onClick={onClose}
            className="absolute top-8 left-8 p-3 bg-white rounded-full shadow-lg hover:scale-110 transition-transform"
          >
            <X size={20} />
          </button>
          
          <div className="relative group max-h-[70vh]">
            {photo.driveThumbnailUrl && (
              <img 
                src={photo.driveThumbnailUrl} 
                style={{ filter: getFilterString() }}
                className="max-w-full max-h-full object-contain shadow-2xl transition-all duration-300"
                alt="Editor Preview"
              />
            )}
          </div>
          
          <div className="mt-8 label-micro opacity-30 tracking-[0.4em]">Photo Alchemy Preview</div>
        </div>

        {/* Controls Area */}
        <div className="flex flex-col h-full bg-white border border-border-toned p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-10 pb-6 border-b border-border-toned/20">
            <div className="p-2 bg-accent/10 text-accent rounded-full">
              <Sliders size={18} />
            </div>
            <div>
              <span className="label-micro block opacity-40">Artifact Tuning</span>
              <h3 className="text-xl font-bold italic text-ink">Filter Controls</h3>
            </div>
          </div>

          <div className="flex-1 space-y-8">
            <FilterSlider label="Exposure" name="brightness" min={0} max={200} />
            <FilterSlider label="Dynamic Range" name="contrast" min={0} max={200} />
            <FilterSlider label="Vibrance" name="saturation" min={0} max={200} />
            <FilterSlider label="Nostalgia" name="sepia" min={0} max={100} />
            <FilterSlider label="Noir" name="grayscale" min={0} max={100} />
          </div>

          <div className="pt-10 space-y-4">
            <button 
              onClick={() => setFilters(defaultFilters)}
              className="w-full py-4 rounded-full border border-border-toned text-[10px] font-bold uppercase tracking-widest hover:bg-paper transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} /> Revert to Raw
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-4 rounded-full bg-accent text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-accent/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? <span className="animate-pulse">Preserving...</span> : <><Check size={14} /> Commit Edits</>}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
