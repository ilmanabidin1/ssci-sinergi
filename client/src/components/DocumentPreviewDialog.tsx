import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Download, ExternalLink, Loader2, XCircle } from "lucide-react";

export type PreviewDocument = {
  id: number;
  documentType: string;
  originalName: string;
  storedName: string;
  contentType: string;
  status: string;
  rejectionReason?: string | null;
};

export const documentUrl = (storedName: string) => `/uploads/${encodeURIComponent(storedName)}`;

const statusLabels: Record<string, string> = { uploaded: "Menunggu verifikasi", verified: "Terverifikasi", rejected: "Ditolak" };

/**
 * Pratinjau dokumen (PDF di iframe, JPG/PNG sebagai gambar) dengan tombol
 * Verifikasi/Tolak di footer, sehingga checker memutuskan sambil melihat isinya.
 */
export function DocumentPreviewDialog({
  document,
  onOpenChange,
  canVerify,
  verifying,
  rejecting,
  onVerify,
  onReject,
}: {
  document: PreviewDocument | null;
  onOpenChange: (open: boolean) => void;
  canVerify: boolean;
  verifying: boolean;
  rejecting: boolean;
  onVerify: (document: PreviewDocument) => void;
  onReject: (document: PreviewDocument) => void;
}) {
  const url = document ? documentUrl(document.storedName) : "";
  const isPdf = document?.contentType === "application/pdf";
  const busy = verifying || rejecting;

  return (
    <Dialog open={document !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-4xl">
        {document && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 font-serif text-xl text-navy-900">
                Dokumen {document.documentType}
                <Badge variant={document.status === "rejected" ? "destructive" : document.status === "verified" ? "default" : "secondary"}>
                  {statusLabels[document.status] ?? document.status}
                </Badge>
              </DialogTitle>
              <DialogDescription className="break-all">{document.originalName}</DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-muted">
              {isPdf ? (
                <iframe src={url} title={`Pratinjau ${document.documentType}: ${document.originalName}`} className="h-[60vh] w-full bg-white" />
              ) : (
                <img src={url} alt={`Dokumen ${document.documentType}: ${document.originalName}`} className="mx-auto max-h-[60vh] w-auto object-contain" />
              )}
            </div>
            {isPdf && (
              <p className="text-xs text-muted-foreground">Jika pratinjau tidak tampil (misalnya di sebagian ponsel), buka dokumen di tab baru.</p>
            )}
            {document.status === "rejected" && document.rejectionReason && (
              <p className="text-sm text-destructive">Alasan penolakan: {document.rejectionReason}</p>
            )}

            <DialogFooter className="flex-wrap gap-3 sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />Buka di tab baru
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={url} download={document.originalName}>
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" />Unduh
                  </a>
                </Button>
              </div>
              {canVerify && document.status !== "verified" && (
                <div className="flex flex-wrap gap-3">
                  {document.status !== "rejected" && (
                    <Button variant="destructive" disabled={busy} onClick={() => onReject(document)}>
                      {rejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />}
                      Tolak dokumen
                    </Button>
                  )}
                  <Button disabled={busy} onClick={() => onVerify(document)}>
                    {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />}
                    {verifying ? "Memverifikasi..." : "Verifikasi dokumen"}
                  </Button>
                </div>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
