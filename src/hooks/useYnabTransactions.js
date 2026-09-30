import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const queryKey = ["ynabTransactions"];

export default function useYnabTransactions({ enabled = true } = {}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: () => base44.entities.YnabTransaction.list("-date", 500),
    enabled,
  });

  useEffect(() => {
    if (!enabled) return;
    return base44.entities.YnabTransaction.subscribe((event) => {
      queryClient.setQueryData(queryKey, (rows) => {
        if (!rows) return rows;
        if (event.type === "delete") return rows.filter((tx) => tx.id !== event.id);
        return rows.map((tx) => tx.id === event.id ? { ...tx, ...event.data } : tx);
      });
      queryClient.invalidateQueries({ queryKey });
    });
  }, [queryClient, enabled]);

  const updateTransaction = useCallback(async (id, patch) => {
    const saved = await base44.entities.YnabTransaction.update(id, patch);
    // Stop older reads from replacing a successful save in another transaction view.
    await queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData(queryKey, (rows) => rows?.map((tx) =>
      tx.id === id ? { ...tx, ...patch, ...saved } : tx
    ));
    await queryClient.invalidateQueries({ queryKey });
    return saved;
  }, [queryClient]);

  return { ...query, updateTransaction };
}