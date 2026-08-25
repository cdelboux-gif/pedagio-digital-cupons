import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

type ImageUploadValue = { fileName: string; dataUrl: string };

type ImageUploadFieldProps = {
  label: string;
  hint: string;
  value?: ImageUploadValue | null;
  previewUrl?: string | null;
  onChange: (value: ImageUploadValue | null) => void;
};

export function ImageUploadField({ label, hint, value, previewUrl, onChange }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(value?.dataUrl ?? previewUrl ?? null);

  useEffect(() => {
    setPreview(value?.dataUrl ?? previewUrl ?? null);
  }, [previewUrl, value?.dataUrl]);

  function readFile(file: File) {
    if (!(file.type === "image/png" || file.type === "image/jpeg" || file.type === "image/webp")) {
      onChange(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onChange(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      if (!dataUrl) return;
      setPreview(dataUrl);
      onChange({ fileName: file.name, dataUrl });
    };
    reader.readAsDataURL(file);
  }

  function clear() {
    setPreview(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold">{label}</Label>
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-black/10 bg-[#fafaf7] p-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
          {preview ? <img src={preview} alt="Pré-visualização" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">{preview ? "Imagem selecionada" : "Nenhuma imagem selecionada"}</p>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{hint} PNG, JPG ou WebP · máximo 5 MB.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => inputRef.current?.click()}>{preview ? "Trocar imagem" : "Selecionar imagem"}</Button>
            {preview && <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground hover:text-rose-700" onClick={clear}><X className="h-3.5 w-3.5" /> Remover</Button>}
          </div>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) readFile(file); }} />
    </div>
  );
}

export type { ImageUploadValue };
