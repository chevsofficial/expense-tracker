"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { EmojiStyle, type EmojiClickData } from "emoji-picker-react";

const Picker = dynamic(() => import("emoji-picker-react"), { ssr: false });

type EmojiPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
};

export function EmojiPickerModal({ isOpen, onClose, onSelect }: EmojiPickerModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="relative z-[1001] w-full max-w-[380px] rounded-2xl border border-primary/20 bg-base-100 p-4 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4 border-b border-primary/20 pb-3">
          <h3 className="section-title text-lg">Pick emoji</h3>
          <button type="button" className="btn btn-ghost btn-sm text-error" onClick={onClose}>
            ✕
          </button>
        </div>
        <Picker
          onEmojiClick={(emojiData: EmojiClickData) => {
            onSelect(emojiData.emoji);
            onClose();
          }}
          emojiStyle={EmojiStyle.GOOGLE}
          width="100%"
        />
      </div>
    </div>,
    document.body
  );
}
