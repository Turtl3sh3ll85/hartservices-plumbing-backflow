import ReceiptsBrowser from "@/components/accounting/ReceiptsBrowser";

export default function Receipts() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Receipts</h1>
        <p className="text-muted-foreground text-sm mt-1">Files from your Google Drive receipts folder.</p>
      </div>
      <ReceiptsBrowser />
    </div>
  );
}