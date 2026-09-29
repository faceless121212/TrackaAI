"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser-client";

export type RealtimeConfig = { url: string; key: string } | null;

/**
 * Re-renders the board when anyone changes its tasks or columns (Supabase
 * Realtime; RLS decides which changes this user receives). Bursts of changes
 * are coalesced into one refresh. `ids` are the board's task and column ids:
 * DELETE events can't be filtered by board and carry only the row's id.
 */
export function useBoardRealtime(boardId: string, config: RealtimeConfig, ids: ReadonlySet<string>) {
  const router = useRouter();
  const idsRef = useRef(ids);
  useEffect(() => {
    idsRef.current = ids;
  }, [ids]);
  // Primitives, not `config`: every refresh sends a new props object, and
  // rejoining the channel on each change would drop events mid-rejoin.
  const url = config?.url;
  const key = config?.key;

  useEffect(() => {
    if (!url || !key) return;
    const supabase = getBrowserSupabase(url, key);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 150);
    };
    const refreshIfOurs = (payload: { old: { id?: string } }) => {
      if (payload.old.id && idsRef.current.has(payload.old.id)) refresh();
    };
    const filter = `board_id=eq.${boardId}`;
    // A unique topic per mount: a channel still leaving from the previous
    // mount would otherwise be reused.
    const channel = supabase.channel(`board:${boardId}:${crypto.randomUUID()}`);
    for (const table of ["tasks", "columns"]) {
      channel
        .on("postgres_changes", { event: "INSERT", schema: "public", table, filter }, refresh)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table, filter }, refresh)
        .on("postgres_changes", { event: "DELETE", schema: "public", table }, refreshIfOurs);
    }

    // Join as the signed-in user: realtime applies RLS, so an anonymous
    // connection (session not loaded yet) would receive nothing.
    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      channel.subscribe();
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [boardId, url, key, router]);
}
