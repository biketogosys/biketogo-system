import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewClientDialog({ open, onClose, onSuccess }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast.success("Cliente criado com sucesso!");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || firstName.trim().length < 2) return toast.error("Nome é obrigatório (mín. 2 caracteres).");
    if (!lastName.trim() || lastName.trim().length < 2) return toast.error("Sobrenome é obrigatório (mín. 2 caracteres).");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("E-mail obrigatório e válido.");
    if (!height.trim()) return toast.error("Altura é obrigatória.");
    if (!weight.trim()) return toast.error("Peso é obrigatório.");
    const name = `${firstName.trim()} ${lastName.trim()}`;
    createMutation.mutate({ name, cpf, phone, email, height, weight, status: "lead" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Novo Cliente
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Nome *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="João" className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Sobrenome *</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Silva" className="bg-secondary border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">CPF</Label>
              <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">WhatsApp</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(48) 9 9999-9999" className="bg-secondary border-border" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">E-mail *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@email.com" className="bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Altura (m) *</Label>
              <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="1.75" className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Peso (kg) *</Label>
              <Input type="number" min="20" max="300" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="75" className="bg-secondary border-border" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1"
              style={{ background: "oklch(0.68 0.12 65)", color: "oklch(0.10 0.005 240)" }}
            >
              {createMutation.isPending ? "Criando..." : "Criar cliente"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
