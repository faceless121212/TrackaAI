"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PLAN_CATALOG, type Plan } from "@/lib/domain";
import { downgradeAction } from "@/server/actions/billing";

export function DowngradeButton({ teamSlug, plan, overLimit }: { teamSlug: string; plan: Plan; overLimit: string[] }) {
  const [pending, startTransition] = useTransition();
  const name = PLAN_CATALOG[plan].name;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="w-full" disabled={pending}>
          Switch to {name}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Switch to {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Nothing is deleted.{" "}
            {overLimit.length > 0
              ? `Your team is above ${name}'s limits (${overLimit.join(", ")}), so you can't add more until you're back under them or upgrade again.`
              : `New additions will follow ${name}'s limits.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                const result = await downgradeAction(teamSlug, plan);
                if (result.ok) toast.success(`Your team is on ${name} now`);
                else toast.error(result.error);
              })
            }
          >
            Switch to {name}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
