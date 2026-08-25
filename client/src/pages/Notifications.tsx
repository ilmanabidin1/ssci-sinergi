import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bell, BellRing, CheckCheck, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Notifications() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const listQuery = trpc.notifications.list.useQuery(undefined, { enabled: !!user });
  const notifications = listQuery.data ?? [];
  const unreadCount = notifications.filter(item => Number(item.read) === 0).length;

  const markAllRead = trpc.notifications.markRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.list.invalidate();
      await utils.notifications.unreadCount.invalidate();
      toast.success("Semua notifikasi telah ditandai dibaca");
    },
    onError: error => toast.error(`Gagal menandai dibaca: ${error.message}`),
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-primary">Notifikasi</h1>
            </div>
          </div>
          <span className="hidden text-sm text-slate-600 sm:inline">{user?.name || "Belum masuk"}</span>
        </div>
      </nav>

      <main className="container max-w-3xl py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notifikasi</h1>
            <p className="mt-1 text-slate-600">Pembaruan status pengajuan dan aktivitas penilaian Anda.</p>
          </div>
          <Button variant="outline" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending || unreadCount === 0}>
            {markAllRead.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
            Tandai semua dibaca
          </Button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b px-6 py-5">
            <CardTitle>Inbox</CardTitle>
            <CardDescription>
              {unreadCount > 0 ? `${unreadCount} belum dibaca` : "Semua notifikasi telah dibaca"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {listQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Memuat notifikasi...
              </div>
            ) : notifications.length === 0 ? (
              <Empty className="py-20">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BellRing className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>Belum ada notifikasi</EmptyTitle>
                  <EmptyDescription>
                    Notifikasi tentang pengajuan dan penilaian Anda akan muncul di sini.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map(item => {
                  const isUnread = Number(item.read) === 0;
                  const date = new Date(item.createdAt).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const inner = (
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          isUnread ? "bg-primary" : "bg-transparent"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-sm font-semibold ${isUnread ? "text-slate-900" : "text-slate-600"}`}>
                            {item.title}
                          </p>
                          {isUnread && <Badge variant="secondary">Baru</Badge>}
                        </div>
                        {item.content && <p className="mt-1 text-sm text-slate-600">{item.content}</p>}
                        <p className="mt-1 text-xs text-slate-400">{date}</p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={item.id} className={`px-6 py-4 ${isUnread ? "bg-slate-50/60" : ""}`}>
                      {item.applicationId !== null && item.applicationId !== undefined ? (
                        <Link to={`/applications/${item.applicationId}`} className="block hover:bg-slate-50">
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
