"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ImagePlus,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import { useConvexMutation } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";

import { Button } from "@/components/ui/button";

const MAX_FILE_SIZE =
  5 * 1024 * 1024;

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export default function EventCoverUploader({
  value,
  onChange,
}) {
  const inputRef =
    useRef(null);

  const [
    preview,
    setPreview,
  ] = useState(value || "");

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const { mutate: generateUploadUrl } =
    useConvexMutation(
      api.uploads.generateUploadUrl
    );

  const { mutate: getStorageUrl } =
    useConvexMutation(
      api.uploads.getStorageUrl
    );

  useEffect(() => {
    setPreview(value || "");
  }, [value]);

  const handleFile = async (
    file
  ) => {
    if (!file) return;

    if (
      !ACCEPTED_TYPES.includes(
        file.type
      )
    ) {
      alert(
        "Please select a JPG, PNG, WEBP, or GIF image."
      );
      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      alert(
        "Image must be smaller than 5 MB."
      );
      return;
    }

    const localPreview =
      URL.createObjectURL(
        file
      );

    setPreview(
      localPreview
    );

    try {
      setUploading(true);

      const uploadUrl =
        await generateUploadUrl(
          {}
        );

      const response =
        await fetch(
          uploadUrl,
          {
            method: "POST",
            headers: {
              "Content-Type":
                file.type,
            },
            body: file,
          }
        );

      if (!response.ok) {
        throw new Error(
          "Image upload failed."
        );
      }

      const {
        storageId,
      } = await response.json();

      const imageUrl =
        await getStorageUrl({
          storageId,
        });

      if (!imageUrl) {
        throw new Error(
          "Could not generate image URL."
        );
      }

      onChange(imageUrl);

      setPreview(
        imageUrl
      );
    } catch (error) {
      console.error(
        "Cover upload error:",
        error
      );

      setPreview(
        value || ""
      );

      alert(
        error?.message ||
          "Failed to upload image."
      );
    } finally {
      setUploading(false);

      URL.revokeObjectURL(
        localPreview
      );
    }
  };

  const handleInputChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    handleFile(file);

    event.target.value = "";
  };

  const removeImage = () => {
    setPreview("");
    onChange("");
  };

  return (
    <div className="space-y-3">
      <div
        className="relative aspect-square w-full rounded-xl overflow-hidden border border-white/10 bg-black/10"
        onClick={() =>
          !uploading &&
          inputRef.current?.click()
        }
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Event cover preview"
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-end justify-between p-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-2"
                disabled={
                  uploading
                }
              >
                <Upload className="w-4 h-4" />
                Change Image
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={(event) => {
                  event.stopPropagation();
                  removeImage();
                }}
                disabled={
                  uploading
                }
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-7 h-7 animate-spin" />
                <span className="text-sm">
                  Uploading...
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground cursor-pointer hover:text-white transition-colors">
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin" />

                <span className="text-sm">
                  Uploading image...
                </span>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
                  <ImagePlus className="w-7 h-7" />
                </div>

                <span className="font-medium">
                  Add cover image
                </span>

                <span className="text-xs">
                  JPG, PNG, WEBP or GIF · Max 5 MB
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={
          handleInputChange
        }
      />

      {!preview && !uploading && (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={() =>
            inputRef.current?.click()
          }
        >
          <Upload className="w-4 h-4" />
          Upload Cover Image
        </Button>
      )}
    </div>
  );
}