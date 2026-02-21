import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  zIndexBase?: number;
};

export function Modal({ open, title, onClose, children, zIndexBase = 900 }: ModalProps) {
  return (
    <dialog className={`modal ${open ? "modal-open" : ""}`} style={{ zIndex: zIndexBase }}>
      <div className="modal-box relative bg-base-100" style={{ zIndex: zIndexBase + 1 }}>
        <div className="flex items-start justify-between gap-4 border-b border-primary/20 pb-3">
          <h3 className="section-title text-lg">{title}</h3>
          <button type="button" className="btn btn-ghost btn-sm relative z-[70] text-error" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
      <form method="dialog" className="modal-backdrop" style={{ zIndex: zIndexBase }}>
        <button type="button" onClick={onClose}>
          close
        </button>
      </form>
    </dialog>
  );
}
