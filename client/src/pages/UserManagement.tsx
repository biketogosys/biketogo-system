import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import {
  Plus, UserCog, Pencil, Trash2, Shield, ShieldCheck,
  Eye, EyeOff, Mail, User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useConfirm } from "@/components/ConfirmDialog";
import { friendlyError } from "@/lib/utils";

type AdminRole = "admin" | "operator";

const roleConfig: Record<AdminRole, { label: string; cls: string }> = {
  admin: { label: "Administrador", cls: "badge-rented" },
  operator: { label: "Operador", cls: "badge-verified" },
};

function UserFormDialog({
  user,
  onClose,
  onSuccess,
}: {
  user?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    role: (user?.role ?? "operator") as AdminRole,
    active: user?.active ?? true,
  });
  const [showPassword, setShowPassword] = useState(false);

  const createMutation = trpc.auth.createUser.useMutation({
    onSuccess: () => { toast.success("Usuário criado!"); onSuccess(); },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const updateMutation = trpc.auth.updateUser.useMutation({
    onSuccess: () => { toast.success("Usuário atualizado!"); onSuccess(); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Nome é obrigatório.");
    if (!form.email.trim()) return toast.error("E-mail é obrigatório.");
    if (!user && !form.password) return toast.error("Senha é obrigatória para novo usuário.");
    if (!user && form.password.length < 6) return toast.error("Senha deve ter no mínimo 6 caracteres.");

    if (user) {
      updateMutation.mutate({
        id: user.id,
        name: form.name,
        email: form.email,
        role: form.role,
        active: form.active,
        ...(form.password ? { password: form.password } : {}),
      });
    } else {
      createMutation.mutate({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md dialog-mobile">
        <DialogHeader>
          <DialogTitle className="text-base">
            {user ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Nome *</Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome completo"
                className="pl-9 bg-secondary border-border"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">E-mail *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@exemplo.com"
                className="pl-9 bg-secondary border-border"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              {user ? "Nova senha (deixe em branco para manter)" : "Senha *"}
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={user ? "Nova senha (opcional)" : "Mínimo 6 caracteres"}
                className="pr-9 bg-secondary border-border"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Papel</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as AdminRole })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="operator">Operador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {user && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
                <Select
                  value={form.active ? "active" : "inactive"}
                  onValueChange={(v) => setForm({ ...form, active: v === "active" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? "Salvando..." : user ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UserManagement() {
  const confirmDialog = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.auth.listUsers.useQuery();
  const deleteMutation = trpc.auth.deleteUser.useMutation({
    onSuccess: () => { toast.success("Usuário removido."); utils.auth.listUsers.invalidate(); },
    onError: (e) => toast.error(friendlyError(e)),
  });

  const users = data ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Gerenciar Usuários
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => { setEditUser(null); setShowForm(true); }}
        >
          <Plus className="w-4 h-4" />Novo usuário
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <UserCog className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Nenhum usuário cadastrado</p>
          <p className="text-xs mt-1">Crie o primeiro usuário para acessar o sistema</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["Nome", "E-mail", "Papel", "Status", "Último login", "Ações"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u: any, idx: number) => (
                <tr
                  key={u.id}
                  className={`border-b border-border/50 hover:bg-accent/30 transition-colors ${idx === users.length - 1 ? "border-b-0" : ""}`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {u.role === "admin" ? (
                        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      {u.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={roleConfig[u.role as AdminRole]?.cls ?? "badge-lead"}>
                      {roleConfig[u.role as AdminRole]?.label ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.active ? "badge-available" : "badge-blocked"}>
                      {u.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("pt-BR") : "Nunca"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditUser(u); setShowForm(true); }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Pencil className="w-3 h-3" />Editar
                      </button>
                      <button
                        onClick={async () => {
                          if (await confirmDialog({ title: `Remover "${u.name}"?`, description: "O usuário perderá acesso ao sistema.", confirmText: "Remover", destructive: true }))
                            deleteMutation.mutate({ id: u.id });
                        }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <UserFormDialog
          user={editUser}
          onClose={() => { setShowForm(false); setEditUser(null); }}
          onSuccess={() => { setShowForm(false); setEditUser(null); utils.auth.listUsers.invalidate(); }}
        />
      )}
    </div>
  );
}
