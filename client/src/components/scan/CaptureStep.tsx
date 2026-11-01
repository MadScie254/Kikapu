import { useRef, useState, type DragEvent } from "react";
import { Camera, Upload, RotateCw, SunMedium, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateImageFile, loadImageFile, drawToCanvas, applyContrastBrightness, canvasToDataUrl } from "@/lib/imageProcessing";
import { useToast } from "@/components/ui/toast";

interface CaptureStepProps {
  onConfirm: (img: HTMLImageElement, rotation: number, enhanced: boolean) => void;
  onManualEntry: () => void;
}

export function CaptureStep({ onConfirm, onManualEntry }: CaptureStepProps) {
  const { toast } = useToast();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const error = validateImageFile(file);
    if (error) {
      toast({ title: "Can't use this image", description: error, variant: "destructive" });
      return;
    }
    try {
      const img = await loadImageFile(file);
      setImage(img);
      setRotation(0);
      setEnhanced(false);
    } catch (err) {
      toast({ title: "Couldn't open image", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }

  function updatePreview(img: HTMLImageElement, rot: number, enh: boolean) {
    let canvas = drawToCanvas(img, rot);
    if (enh) canvas = applyContrastBrightness(canvas, 35, 15);
    setPreviewUrl(canvasToDataUrl(canvas));
  }

  function rotate() {
    if (!image) return;
    const next = (rotation + 90) % 360;
    setRotation(next);
    updatePreview(image, next, enhanced);
  }

  function toggleEnhance() {
    if (!image) return;
    const next = !enhanced;
    setEnhanced(next);
    updatePreview(image, rotation, next);
  }

  // Recompute preview whenever an image is first loaded.
  if (image && !previewUrl) updatePreview(image, rotation, enhanced);

  if (image && previewUrl) {
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border bg-black/5">
          <img src={previewUrl} alt="Receipt preview" className="w-full object-contain" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={rotate}>
            <RotateCw className="size-4" /> Rotate
          </Button>
          <Button variant={enhanced ? "accent" : "outline"} size="sm" onClick={toggleEnhance}>
            <SunMedium className="size-4" /> {enhanced ? "Enhanced" : "Enhance"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setImage(null);
              setPreviewUrl(null);
            }}
          >
            <X className="size-4" /> Retake
          </Button>
        </div>
        <Button size="lg" className="w-full max-w-sm" onClick={() => onConfirm(image, rotation, enhanced)}>
          <Check className="size-4" /> Use This Photo
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-6"
      onDragOver={(e: DragEvent) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e: DragEvent) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <div
        className={`flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging ? "border-accent bg-accent/5" : "border-border"
        }`}
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Camera className="size-7" />
        </div>
        <p className="font-display font-semibold">Scan a receipt</p>
        <p className="text-sm text-muted-foreground">Take a photo, choose from your gallery, or drag an image here.</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button size="lg" onClick={() => cameraInputRef.current?.click()}>
          <Camera className="size-4" /> Take Photo
        </Button>
        <Button size="lg" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="size-4" /> Upload from Gallery
        </Button>
        <Button size="lg" variant="ghost" onClick={onManualEntry}>
          Enter details manually instead
        </Button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}
