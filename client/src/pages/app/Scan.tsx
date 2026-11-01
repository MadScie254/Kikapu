import { useState } from "react";
import { ScanLine, PenLine, Carrot, Sparkles } from "lucide-react";
import { CaptureStep } from "@/components/scan/CaptureStep";
import { ProcessingStep } from "@/components/scan/ProcessingStep";
import { ReviewStep } from "@/components/scan/ReviewStep";
import { LocalMarketForm } from "@/components/scan/LocalMarketForm";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { drawToCanvas, prepareUploadCopy, applyContrastBrightness } from "@/lib/imageProcessing";
import { recognizeReceiptText } from "@/lib/ocr";
import { parseReceiptText } from "@shared/parsing/receiptParser";
import type { ParsedReceiptResult } from "@shared/parsing/types";
import { api } from "@/lib/api";

type Mode = "choose" | "capture" | "processing" | "review" | "market";

export default function Scan() {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("choose");
  const [parsed, setParsed] = useState<ParsedReceiptResult | null>(null);
  const [rawOcrText, setRawOcrText] = useState<string | null>(null);
  const [uploadedImagePath, setUploadedImagePath] = useState<string | null>(null);
  const [reviewSource, setReviewSource] = useState<"ocr" | "manual">("ocr");
  const [statusLabel, setStatusLabel] = useState("Warming up the scanner…");
  const [aiEnabled, setAiEnabled] = useState(false);

  async function handleConfirmCapture(img: HTMLImageElement, rotation: number, enhanced: boolean) {
    setMode("processing");
    setStatusLabel("Preparing image…");

    // Upload a compressed copy in the background so the user doesn't wait on it.
    prepareUploadCopy(img, rotation)
      .then((upload) => api.post<{ stored: boolean; imageBlobPath?: string }>("/upload/receipt-image", upload))
      .then((res) => {
        if (res.stored && res.imageBlobPath) setUploadedImagePath(res.imageBlobPath);
      })
      .catch(() => {
        /* Non-fatal; the receipt's structured data is what matters most. */
      });

    try {
      if (aiEnabled) {
        setStatusLabel("Sending to AI enhancement…");
        const upload = await prepareUploadCopy(img, rotation);
        try {
          const { result, rawText } = await api.post<{
            result: Omit<ParsedReceiptResult, "purchasedAt"> & { purchasedAt: string | null };
            rawText: string;
          }>("/ai/parse-receipt", { ...upload, consent: true });
          setParsed(reviveAiParsedReceipt(result));
          setRawOcrText(rawText);
          setReviewSource("ocr");
          setMode("review");
          return;
        } catch (err) {
          toast({
            title: "AI enhancement unavailable",
            description: "Falling back to the free on-device scanner.",
          });
          // fall through to local OCR below
        }
      }

      let canvas = drawToCanvas(img, rotation);
      if (enhanced) canvas = applyContrastBrightness(canvas, 35, 15);

      setStatusLabel("Reading text on-device…");
      const text = await recognizeReceiptText(canvas, (p) => setStatusLabel(`Reading text… ${Math.round(p.progress * 100)}%`));
      const result = parseReceiptText(text);
      setParsed(result);
      setRawOcrText(text);
      setReviewSource("ocr");
      setMode("review");
    } catch (err) {
      toast({
        title: "Couldn't read this receipt",
        description: "You can still enter the details manually.",
        variant: "destructive",
      });
      setParsed(null);
      setReviewSource("manual");
      setMode("review");
    }
  }

  function reset() {
    setMode("choose");
    setParsed(null);
    setRawOcrText(null);
    setUploadedImagePath(null);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-bold">Scan a Receipt</h1>
      <p className="mt-1 text-sm text-muted-foreground">Snap a photo and Kikapu will read the details; you confirm before anything is saved.</p>

      <div className="mt-6">
        {mode === "choose" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <ChoiceCard icon={ScanLine} title="Scan Receipt" description="Use your camera or upload a photo" onClick={() => setMode("capture")} />
            <ChoiceCard
              icon={PenLine}
              title="Manual Entry"
              description="Type in the details yourself"
              onClick={() => {
                setParsed(null);
                setReviewSource("manual");
                setMode("review");
              }}
            />
            <ChoiceCard icon={Carrot} title="Open-Air Market" description="Quick entry, no receipt needed" onClick={() => setMode("market")} />
          </div>
        )}

        {mode === "capture" && (
          <div className="space-y-5">
            <label className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4 text-accent" /> AI-enhanced scan (optional)
              </div>
              <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
            </label>
            {aiEnabled && (
              <p className="text-xs text-muted-foreground">
                This photo will be sent to a third-party AI service for this scan only. If it isn't enabled on this
                deployment, Kikapu automatically falls back to the free on-device scanner.
              </p>
            )}
            <CaptureStep onConfirm={handleConfirmCapture} onManualEntry={() => { setReviewSource("manual"); setParsed(null); setMode("review"); }} />
          </div>
        )}

        {mode === "processing" && <ProcessingStep statusLabel={statusLabel} />}

        {mode === "review" && <ReviewStep parsed={parsed} source={reviewSource} rawOcrText={rawOcrText} uploadedImagePath={uploadedImagePath} onDone={reset} />}

        {mode === "market" && <LocalMarketForm onDone={reset} />}
      </div>
    </div>
  );
}

function ChoiceCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof ScanLine;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="text-left">
      <Card className="h-full transition-shadow hover:shadow-soft-lg">
        <CardContent className="p-5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Icon className="size-5" />
          </div>
          <h3 className="mt-3 font-display text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </button>
  );
}

/**
 * The AI endpoint runs the same parseReceiptText() the free on-device
 * scanner uses server-side, so the response is already a ParsedReceiptResult
 * — except purchasedAt crosses JSON as an ISO string, not a Date.
 */
function reviveAiParsedReceipt(result: Omit<ParsedReceiptResult, "purchasedAt"> & { purchasedAt: string | null }): ParsedReceiptResult {
  return { ...result, purchasedAt: result.purchasedAt ? new Date(result.purchasedAt) : null };
}
