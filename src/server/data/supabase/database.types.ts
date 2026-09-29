// Generated from the live schema (Supabase MCP `generate_typescript_types`) and
// trimmed to the Database type. Regenerate after every migration.
// Function args are widened to `| null` where the SQL accepts NULL.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert> = { Row: Row; Insert: Insert; Update: Partial<Insert>; Relationships: [] };

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      boards: Table<{ created_at: string; description: string | null; id: string; name: string; workspace_id: string }, { created_at?: string; description?: string | null; id?: string; name: string; workspace_id: string }>;
      columns: Table<{ board_id: string; id: string; name: string; position: string }, { board_id: string; id?: string; name: string; position: string }>;
      comments: Table<{ author_agent_id: string | null; author_user_id: string | null; body: string; created_at: string; id: string; task_id: string }, { author_agent_id?: string | null; author_user_id?: string | null; body: string; created_at?: string; id?: string; task_id: string }>;
      invites: Table<{ accepted_at: string | null; created_at: string; email: string; expires_at: string; id: string; invited_by: string; role: string; team_id: string; token: string }, { accepted_at?: string | null; created_at?: string; email: string; expires_at: string; id?: string; invited_by: string; role: string; team_id: string; token: string }>;
      labels: Table<{ color: string; id: string; name: string; team_id: string }, { color: string; id?: string; name: string; team_id: string }>;
      memberships: Table<{ joined_at: string; role: string; team_id: string; user_id: string }, { joined_at?: string; role: string; team_id: string; user_id: string }>;
      profiles: Table<{ avatar_url: string | null; created_at: string; email: string; id: string; name: string; theme: string | null }, { avatar_url?: string | null; created_at?: string; email: string; id: string; name: string; theme?: string | null }>;
      task_labels: Table<{ label_id: string; task_id: string }, { label_id: string; task_id: string }>;
      tasks: Table<{ assignee_agent_id: string | null; assignee_user_id: string | null; board_id: string; column_id: string; created_at: string; created_by: string; description: string; due_date: string | null; id: string; key: string; number: number; parent_id: string | null; position: string; priority: string; title: string; updated_at: string }, { assignee_agent_id?: string | null; assignee_user_id?: string | null; board_id: string; column_id: string; created_at?: string; created_by: string; description?: string; due_date?: string | null; id?: string; key: string; number: number; parent_id?: string | null; position: string; priority?: string; title: string; updated_at?: string }>;
      ai_usage: Table<
        {
          id: string;
          team_id: string;
          user_id: string | null;
          feature: string;
          model: string;
          input_tokens: number;
          output_tokens: number;
          created_at: string;
        },
        {
          team_id: string;
          user_id: string;
          feature: string;
          model: string;
          input_tokens?: number;
          output_tokens?: number;
        }
      >;
      teams: Table<{ created_at: string; id: string; name: string; plan: string; slug: string }, { created_at?: string; id?: string; name: string; plan?: string; slug: string }>;
      workspaces: Table<{ created_at: string; id: string; key_prefix: string; name: string; next_task_number: number; team_id: string }, { created_at?: string; id?: string; key_prefix: string; name: string; next_task_number?: number; team_id: string }>;
    };
    Views: { [_ in never]: never };
    Functions: {
      accept_invite: {
        Args: { p_token: string; p_actor?: string };
        Returns: Database["public"]["Tables"]["memberships"]["Row"];
      };
      create_board: {
        Args: { p_workspace: string; p_name: string; p_description: string | null; p_columns: Json };
        Returns: Database["public"]["Tables"]["boards"]["Row"];
      };
      create_task: {
        Args: {
          p_board: string;
          p_column: string;
          p_title: string;
          p_description: string;
          p_priority: string;
          p_assignee_user: string | null;
          p_label_ids: string[];
          p_due_date: string | null;
          p_parent: string | null;
          p_position: string;
          p_actor?: string;
        };
        Returns: Database["public"]["Tables"]["tasks"]["Row"];
      };
      create_team: {
        Args: { p_name: string; p_slug: string; p_labels?: Json; p_actor?: string };
        Returns: Database["public"]["Tables"]["teams"]["Row"];
      };
      set_team_plan: {
        Args: { p_team: string; p_plan: string; p_actor?: string };
        Returns: Database["public"]["Tables"]["teams"]["Row"];
      };
      team_usage: {
        Args: { p_team: string };
        Returns: { members: number; pending_invites: number; workspaces: number }[];
      };
      invite_preview: {
        Args: { p_token: string };
        Returns: { invite: Json; team_name: string; team_slug: string; inviter_name: string | null }[];
      };
      transfer_ownership: {
        Args: { p_team: string; p_to: string; p_actor?: string };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
