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
import { ChevronDown, CircleUserRound, LogOut, Settings2 } from "lucide-react";
import { Link, useLocation } from "wouter";

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2">
          <CircleUserRound className="h-5 w-5 text-slate-500" />
          <span className="hidden text-sm text-slate-700 sm:inline">{user?.name || "Akun"}</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="font-medium">{user?.name || "Pengguna"}</span>
          <span className="text-xs font-normal text-slate-500">{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/pengaturan">
            <CircleUserRound className="mr-2 h-4 w-4" />
            Profil & akun
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/pengaturan">
            <Settings2 className="mr-2 h-4 w-4" />
            Pengaturan BPRS
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await logout();
            setLocation("/");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
