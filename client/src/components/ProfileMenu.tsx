import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, CircleUserRound, Info, Landmark, LogOut, ScrollText, Settings2, ShieldCheck, UsersRound } from "lucide-react";
import { Link, useLocation } from "wouter";

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2" aria-label={`Menu akun ${user?.name ?? ""}`.trim()}>
          <CircleUserRound className="h-5 w-5 text-slate-500" aria-hidden="true" />
          <span className="hidden max-w-40 truncate text-sm text-slate-700 sm:inline">{user?.name || "Akun"}</span>
          <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="font-medium">{user?.name || "Pengguna"}</span>
          <span className="truncate text-xs font-normal text-slate-500">{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/pengaturan">
            <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Pengaturan akun
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/pengaturan#branding">
              <Landmark className="mr-2 h-4 w-4" aria-hidden="true" />
              Pengaturan BPRS
            </Link>
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/tim">
              <UsersRound className="mr-2 h-4 w-4" aria-hidden="true" />
              Kelola tim
            </Link>
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/audit">
              <ScrollText className="mr-2 h-4 w-4" aria-hidden="true" />
              Log audit
            </Link>
          </DropdownMenuItem>
        )}
        {user?.isSuperAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/platform">
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
              Konsol SuperAdmin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/tentang-ssci">
            <Info className="mr-2 h-4 w-4" aria-hidden="true" />
            Tentang SSCI
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await logout();
            setLocation("/");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
