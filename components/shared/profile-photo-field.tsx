"use client";

import { useRef, useState } from "react";
import { Camera, Smile, Trash2 } from "lucide-react";
import { EmployeeAvatar } from "@/components/shared/employee-avatar";
import { Button } from "@/components/ui/button";
import { fileToAvatarDataUrl } from "@/lib/employee/display";
import { funnyAvatarsForGender, isFunnyAvatarSrc } from "@/lib/employee/funny-avatars";
import { cn } from "@/lib/utils";
import type { Gender } from "@/types";

export function ProfilePhotoField({
  fullName,
  gender,
  value,
  onChange,
  disabled,
  hint = "Upload a photo or pick an avatar. If empty, the default silhouette is used.",
}: {
  fullName: string;
  gender: Gender;
  value: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(true);
  const options = funnyAvatarsForGender(gender);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload photo.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <EmployeeAvatar
          employee={{ fullName: fullName || "Employee", avatarUrl: value, gender }}
          className="size-20"
          fallbackClassName="text-lg"
        />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || busy}
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="size-4" />
              {busy ? "Uploading…" : value && !isFunnyAvatarSrc(value) ? "Change photo" : "Upload photo"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || busy}
              onClick={() => setShowGallery((open) => !open)}
            >
              <Smile className="size-4" />
              {showGallery ? "Hide avatars" : "Pick avatar"}
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || busy}
                onClick={() => onChange(null)}
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{hint}</p>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
        </div>
      </div>

      {showGallery ? (
        <div className="rounded-xl border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {gender === "FEMALE"
              ? "Girl avatars"
              : gender === "MALE"
                ? "Guy avatars"
                : "Avatars"}{" "}
            — tap one to select
          </p>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-10">
            {options.map((option) => {
              const selected = value === option.src;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled}
                  title={option.label}
                  onClick={() => onChange(option.src)}
                  className={cn(
                    "overflow-hidden rounded-2xl border-2 bg-white p-1 shadow-sm transition hover:scale-[1.03]",
                    selected ? "border-primary ring-2 ring-primary/30" : "border-border/60",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={option.src} alt={option.label} className="aspect-square w-full rounded-xl object-cover" />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
