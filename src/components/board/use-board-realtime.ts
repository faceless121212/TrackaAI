"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser-client";

export type RealtimeConfig = { url: string; key: string } | null;

/**
 * Re-renders the board when anyone changes its tasks or columns (Supabase
 * Realtime; RLS decides which changes this user receives). Bursts of changes
 * are coalesced into one refresh.
 */
export function useBoardRealtime(boardId: string, config: RealtimeConfig) {
  const router = useRouter();

  useEffect(() => {
    if (!config) return;
    const supabase = getBrowserSupabase(config.url, config.key);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 150);
    };
    const channel = supabase
      .channel(`board:${boardId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `board_id=eq.${boardId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "columns", filter: `board_id=eq.${boardId}` }, refresh);

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
  }, [boardId, config, router]);
}
