import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ReceiptsBrowser from "@/components/accounting/ReceiptsBrowser";

export default function ReceiptsDialog({ open, onClose, onPick, title }) {
  const isPickMode = !!onPick;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title || "Receipts"}</DialogTitle>
          <DialogDescription>
            {isPickMode
              ? "Pick a receipt to pin to this transaction."
              : "Files from your Google Drive receipts folder."}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto -mx-6 px-6 flex-1">
          <ReceiptsBrowser onPick={onPick} />
        </div>
      </DialogContent>
    </Dialog>
  );
}