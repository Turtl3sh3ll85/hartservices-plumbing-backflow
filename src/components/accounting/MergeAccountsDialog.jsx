import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MergeAccountsDialog({ open, account, accounts = [], onClose, onMerge }) {
  const [target, setTarget] = useState("");
  useEffect(() => { if (open) setTarget(""); }, [open, account]);
  const others = accounts.filter((a) => a !== account);
  const canConfirm = target.trim() && target.trim() !== account;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Merge “{account}”</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Combine this account into another. Its transactions will appear under the chosen name.
        </p>
        <Input
          list="merge-targets"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Target account name"
          autoFocus
        />
        <datalist id="merge-targets">
          {others.map((a) => <option key={a} value={a} />)}
        </datalist>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!canConfirm} onClick={() => onMerge(target.trim())}>Merge</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}