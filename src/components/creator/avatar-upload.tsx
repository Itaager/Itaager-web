"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Uploads to avatars/<user id>/..., which storage RLS restricts to the owner. */
export function AvatarUpload({ userId, name, value, onChange }: { userId: string; name: string; value?: string | null; onChange: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function upload(file: File) {
    setError(undefined);
    if (!TYPES.includes(file.type)) return setError("Use a PNG, JPG or WebP image.");
    if (file.size > MAX_BYTES) return setError("Image must be smaller than 2 MB.");
    setBusy(true);
    const ext = file.type.split("/")[1];
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
    setBusy(false);
    if (uploadError) return setError("Upload failed. Please try again.");
    onChange(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar src={value} name={name || "?"} size={80} />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="size-6 animate-spin text-white" aria-hidden />
          </span>
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-ink hover:bg-surface-2"
        >
          <Camera className="size-4" aria-hidden /> {value ? "Change photo" : "Upload photo"}
        </button>
        <p className="mt-1.5 text-xs text-ink-3">PNG, JPG or WebP, up to 2 MB.</p>
        {error && <p role="alert" className="mt-1 text-xs font-medium text-bad">{error}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
