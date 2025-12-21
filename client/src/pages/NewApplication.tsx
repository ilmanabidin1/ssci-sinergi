import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function NewApplication() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [legalDocs, setLegalDocs] = useState([
    { type: "KTP", status: "pending", notes: "" },
    { type: "NPWP", status: "pending", notes: "" },
    { type: "SIUP", status: "pending", notes: "" },
    { type: "TDP", status: "pending", notes: "" },
  ]);

  const createMutation = trpc.applications.create.useMutation({
    onSuccess: (data) => {
      toast.success("Aplikasi pembiayaan berhasil dibuat");
      setLocation(`/applications/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Gagal membuat aplikasi: ${error.message}`);
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Silakan login terlebih dahulu</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createMutation.mutate({
      customerName: formData.get("customerName") as string,
      customerId: formData.get("customerId") as string,
      businessName: formData.get("businessName") as string,
      businessType: formData.get("businessType") as string,
      businessAge: parseInt(formData.get("businessAge") as string),
      address: formData.get("address") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string || undefined,
      monthlyRevenue: formData.get("monthlyRevenue") as string,
      monthlyExpenses: formData.get("monthlyExpenses") as string,
      existingDebt: formData.get("existingDebt") as string,
      collateralValue: formData.get("collateralValue") as string,
      requestedAmount: formData.get("requestedAmount") as string,
      loanPurpose: formData.get("loanPurpose") as string,
      legalDocuments: legalDocs,
      businessShariaCompliant: formData.get("businessShariaCompliant") as "yes" | "no" | "partial",
      shariaComplianceNotes: formData.get("shariaComplianceNotes") as string || undefined,
      environmentalPractices: formData.get("environmentalPractices") as string || undefined,
      socialImpact: formData.get("socialImpact") as string || undefined,
      governanceQuality: formData.get("governanceQuality") as "excellent" | "good" | "fair" | "poor",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="container py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-primary">SSCI</h1>
            </div>
          </div>
          <span className="text-sm text-gray-600">{user?.name}</span>
        </div>
      </nav>

      <main className="container py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Aplikasi Pembiayaan Baru</h1>
          <p className="text-gray-600 mt-2">Lengkapi data nasabah untuk penilaian kelayakan pembiayaan</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Nasabah</CardTitle>
              <CardDescription>Data identitas dan kontak nasabah</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Nama Lengkap *</Label>
                  <Input id="customerName" name="customerName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerId">NIK / ID Nasabah *</Label>
                  <Input id="customerId" name="customerId" required />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Nomor Telepon *</Label>
                  <Input id="phone" name="phone" type="tel" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Alamat Lengkap *</Label>
                <Textarea id="address" name="address" required rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informasi Usaha</CardTitle>
              <CardDescription>Detail usaha dan lama operasional</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nama Usaha *</Label>
                  <Input id="businessName" name="businessName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessType">Jenis Usaha *</Label>
                  <Input id="businessType" name="businessType" placeholder="Contoh: Perdagangan, Jasa" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessAge">Lama Usaha (bulan) *</Label>
                <Input id="businessAge" name="businessAge" type="number" min="1" required />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Keuangan</CardTitle>
              <CardDescription>Informasi keuangan usaha dan pembiayaan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyRevenue">Pendapatan Bulanan (Rp) *</Label>
                  <Input id="monthlyRevenue" name="monthlyRevenue" type="number" min="0" step="1000" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyExpenses">Pengeluaran Bulanan (Rp) *</Label>
                  <Input id="monthlyExpenses" name="monthlyExpenses" type="number" min="0" step="1000" required />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="existingDebt">Hutang Existing (Rp) *</Label>
                  <Input id="existingDebt" name="existingDebt" type="number" min="0" step="1000" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="collateralValue">Nilai Agunan (Rp) *</Label>
                  <Input id="collateralValue" name="collateralValue" type="number" min="0" step="1000" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestedAmount">Jumlah Pembiayaan (Rp) *</Label>
                <Input id="requestedAmount" name="requestedAmount" type="number" min="0" step="1000" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loanPurpose">Tujuan Pembiayaan *</Label>
                <Textarea id="loanPurpose" name="loanPurpose" required rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dokumen Legal</CardTitle>
              <CardDescription>Status kelengkapan dokumen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {legalDocs.map((doc, index) => (
                <div key={doc.type} className="grid md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Jenis Dokumen</Label>
                    <Input value={doc.type} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={doc.status}
                      onValueChange={(value) => {
                        const newDocs = [...legalDocs];
                        newDocs[index]!.status = value;
                        setLegalDocs(newDocs);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="complete">Lengkap</SelectItem>
                        <SelectItem value="verified">Terverifikasi</SelectItem>
                        <SelectItem value="missing">Tidak Ada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Catatan</Label>
                    <Input
                      value={doc.notes}
                      onChange={(e) => {
                        const newDocs = [...legalDocs];
                        newDocs[index]!.notes = e.target.value;
                        setLegalDocs(newDocs);
                      }}
                      placeholder="Opsional"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kepatuhan Syariah</CardTitle>
              <CardDescription>Evaluasi kepatuhan syariah</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessShariaCompliant">Kepatuhan Bisnis *</Label>
                <Select name="businessShariaCompliant" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Ya, Sepenuhnya</SelectItem>
                    <SelectItem value="partial">Sebagian</SelectItem>
                    <SelectItem value="no">Tidak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shariaComplianceNotes">Catatan</Label>
                <Textarea id="shariaComplianceNotes" name="shariaComplianceNotes" rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Keberlanjutan (ESG)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="environmentalPractices">Praktik Lingkungan</Label>
                <Textarea id="environmentalPractices" name="environmentalPractices" rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="socialImpact">Dampak Sosial</Label>
                <Textarea id="socialImpact" name="socialImpact" rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="governanceQuality">Tata Kelola *</Label>
                <Select name="governanceQuality" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Sangat Baik</SelectItem>
                    <SelectItem value="good">Baik</SelectItem>
                    <SelectItem value="fair">Cukup</SelectItem>
                    <SelectItem value="poor">Kurang</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="button" variant="outline" asChild className="flex-1">
              <Link href="/">Batal</Link>
            </Button>
            <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan & Lanjutkan
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
