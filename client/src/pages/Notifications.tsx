import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { usePageTitle } from "@/hooks/usePageTitle";
import { errorMessage } from "@/lib/errors";
import { trpc } from "@/lib/trpc";
import { AlertCircle, BellRing, Check, CheckCheck, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Notifications() {
  usePageTitle("Notifikasi");
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
    onError: error => toast.error("Gagal menandai dibaca", { description: errorMessage(error) }),
  });

  // Tandai satu notifikasi dibaca tanpa toast, misalnya saat pengguna membukanya.
  const markOneRead = trpc.notifications.markRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.list.invalidate();
      await utils.notifications.unreadCount.invalidate();
    },
    onError: error => toast.error("Gagal menandai dibaca", { description: errorMessage(error) }),
  });

  return (
    <div className="min-h-screen bg-ivory">
      <AppHeader />

      <main id="main-content" tabIndex={-1} className="container max-w-3xl py-8 focus:outline-none">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-medium text-navy-900 sm:text-4xl">Notifikasi</h1>
            <p className="mt-1 text-slate-600">Pembaruan status pengajuan dan aktivitas penilaian Anda.</p>
          </div>
          <Button variant="outline" className="self-start sm:self-auto" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending || unreadCount === 0}>
            {markAllRead.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCheck className="mr-2 h-4 w-4" aria-hidden="true" />}
            Tandai semua dibaca
          </Button>
        </div>

        <Card className="border-border shadow-premium">
          <CardHeader className="border-b px-6 py-5">
            <CardTitle as="h2">Kotak masuk</CardTitle>
            <CardDescription>
              {unreadCount > 0 ? `${unreadCount} belum dibaca` : "Semua notifikasi telah dibaca"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {listQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-24 text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Memuat notifikasi...
              </div>
            ) : listQuery.isError ? (
              <div role="alert" className="flex flex-col items-center gap-3 py-20 text-center text-red-700">
                <AlertCircle className="h-8 w-8" aria-hidden="true" />
                <p>Notifikasi tidak dapat dimuat. {errorMessage(listQuery.error, "")}</p>
                <Button variant="outline" onClick={() => listQuery.refetch()} disabled={listQuery.isFetching}>
                  Coba lagi
                </Button>
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
                  const markThisRead = () => {
                    if (isUnread) markOneRead.mutate({ ids: [item.id] });
                  };
                  const inner = (
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          isUnread ? "bg-primary" : "bg-transparent"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-sm font-semibold ${isUnread ? "text-slate-900" : "text-slate-700"}`}>
                            {item.title}
                          </p>
                          {isUnread && <Badge variant="secondary">Baru</Badge>}
                        </div>
                        {item.content && <p className="mt-1 break-words text-sm text-slate-600">{item.content}</p>}
                        <p className="mt-1 text-xs text-slate-600">{date}</p>
                      </div>
                    </div>
                  );
                  return (
                    <li key={item.id} className={`flex items-stretch ${isUnread ? "bg-slate-50/60" : ""}`}>
                      {item.applicationId !== null && item.applicationId !== undefined ? (
                        <Link
                          to={`/applications/${item.applicationId}`}
                          onClick={markThisRead}
                          className="block min-w-0 flex-1 px-6 py-4 outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-900"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div className="min-w-0 flex-1 px-6 py-4">{inner}</div>
                      )}
                      {isUnread && (
                        <div className="flex items-center pr-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={markThisRead}
                            disabled={markOneRead.isPending && markOneRead.variables?.ids?.includes(item.id)}
                            aria-label={`Tandai dibaca: ${item.title}`}
                            title="Tandai dibaca"
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
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
