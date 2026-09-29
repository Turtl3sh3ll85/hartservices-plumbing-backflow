import { useState } from "react";
import ReceiptsBrowser from "@/components/accounting/ReceiptsBrowser";
import MatchTransactionDialog from "@/components/accounting/MatchTransactionDialog";

export default function Receipts() {
  const [pickedFile, setPickedFile] = useState(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Receipts</h1>
        <p className="text-muted-foreground text-sm mt-1">Files from your Google Drive receipts folder. Click "Pin" to match a receipt to a transaction.</p>
      </div>
      <ReceiptsBrowser onPick={(file) => setPickedFile(file)} />
      <MatchTransactionDialog
        open={!!pickedFile}
        file={pickedFile}
        onClose={() => setPickedFile(null)}
      />
    </div>
  );
}