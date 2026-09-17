"use client";

import { Loader2Icon, UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  AVATAR_ACCEPTED_MIME_TYPES,
  AVATAR_MAX_BYTES,
  extensionForMime,
} from "@/lib/profile/avatar.constants";
import { updateAvatarUrl } from "@/lib/profile/profile.actions";
import { createClient } from "@/lib/supabase/client";

type AvatarUploaderProps = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
};

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function AvatarUploader({
  userId,
  displayName,
  avatarUrl,
}: AvatarUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);

  async function onFileSelected(file: File) {
    if (
      !AVATAR_ACCEPTED_MIME_TYPES.includes(
        file.type as (typeof AVATAR_ACCEPTED_MIME_TYPES)[number]
      )
    ) {
      toast.add({
        type: "error",
        title: "Use a JPEG, PNG, or WebP image.",
      });
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      toast.add({
        type: "error",
        title: "Image must be 2 MB or smaller.",
      });
      return;
    }

    const ext = extensionForMime(file.type);
    if (!ext) {
      toast.add({ type: "error", title: "Unsupported image type." });
      return;
    }

    setUploading(true);
    const objectPath = `${userId}/${crypto.randomUUID()}.${ext}`;

    try {
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(objectPath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        toast.add({
          type: "error",
          title: "Upload failed",
          description: uploadError.message,
        });
        return;
      }

      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(objectPath);

      const result = await updateAvatarUrl(publicData.publicUrl);
      if (!result.ok) {
        toast.add({ type: "error", title: "Could not save avatar." });
        return;
      }

      setPreviewUrl(publicData.publicUrl);
      toast.add({ type: "success", title: "Avatar updated" });
      router.refresh();
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  const initials = getInitials(displayName);

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      <Avatar size="lg" className="size-16">
        {previewUrl ? <AvatarImage src={previewUrl} alt="" /> : null}
        <AvatarFallback className="text-base font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_ACCEPTED_MIME_TYPES.join(",")}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void onFileSelected(file);
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
          ) : (
            <UploadIcon className="size-4" aria-hidden />
          )}
          {uploading ? "Uploading…" : "Upload photo"}
        </Button>
        <p className="text-muted-foreground text-xs">
          JPEG, PNG, or WebP. Max 2 MB.
        </p>
      </div>
    </div>
  );
}
