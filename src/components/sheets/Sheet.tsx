'use client';
import { useRef, useEffect, TouchEvent } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const startYRef = useRef<number>(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) { dialog.showModal(); }
    else { dialog.close(); }
  }, [open]);

  // Close on backdrop click
  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose();
  };

  // Swipe down to dismiss
  const handleTouchStart = (e: TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: TouchEvent) => {
    const delta = e.changedTouches[0].clientY - startYRef.current;
    if (delta > 80) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onCancel={onClose}
      aria-labelledby="sheet-title"
    >
      <div className="sheet-handle" />
      <h2 className="sheet-title" id="sheet-title">{title}</h2>
      <div className="sheet-body">{children}</div>
    </dialog>
  );
}
