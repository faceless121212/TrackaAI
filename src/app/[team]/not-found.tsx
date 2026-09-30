import { SearchX } from "lucide-react";
import { StatusScreen } from "@/components/shell/status-screen";

// A missing board or task inside a team keeps the sidebar, so the way on is one click away.
export default function TeamNotFound() {
  return (
    <StatusScreen icon={SearchX} title="Not found">
      This board or task doesn&apos;t exist anymore, or it was moved. Pick a board from the sidebar.
    </StatusScreen>
  );
}
