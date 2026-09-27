import { useState } from "react";

export function useConfirmDialog() {
  const [state, setState] = useState({ open: false });
  const confirm = (opts) => setState({ open: true, ...opts });
  const onOpenChange = (open) => { if (!open) setState((s) => ({ ...s, open: false })); };
  return { confirmState: state, confirm, onOpenChange };
}