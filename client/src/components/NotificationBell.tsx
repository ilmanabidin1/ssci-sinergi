import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Bell } from "lucide-react";
import { Link } from "wouter";

export function NotificationBell() {
  const { user } = useAuth();
  const unreadQuery = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30_000,
  });
  const count = unreadQuery.data ?? 0;

  return (
    <Button variant="ghost" size="icon" className="relative" asChild aria-label="Notifikasi">
      <Link to="/notifikasi">
        <Bell className="h-5 w-5 text-slate-500" />
        {count > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]"
          >
            {count > 99 ? "99+" : count}
          </Badge>
        )}
      </Link>
    </Button>
  );
}
