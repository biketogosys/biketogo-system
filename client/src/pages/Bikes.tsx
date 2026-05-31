import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Bike as BikeIcon,
  Plus,
  Pencil,
  Trash2,
  Percent,
  DollarSign,
  Camera,
  X,
  Upload,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  AlertTriangle,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type BikeStatus = "available" | "rented" | "maintenance";
type BikeCategory = "mtb" | "speed" | "gravel";

const statusConfig: Record<BikeStatus, { cls: string; label: string }> = {
  available: { cls: "bg-emerald-100 text-emerald-700 border border-emerald-200", label: "Disponível" },
  rented: { cls: "bg-blue-100 text-blue-700 border border-blue-200", label: "Alugada" },
  maintenance: { cls: "bg-amber-100 text-amber-700 border border-amber-200", label: "Manutenção" },
};

const categoryLabels: Record<BikeCategory, string> = {
  mtb: "MTB",
  speed: "Speed",
  gravel: "Gravel",
};

// ─── Discount Rules Editor ────────────────────────────────────────────────────
function DiscountRulesEditor({ bikeId, onClose }: { bikeId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: rules = [], isLoading } = trpc.bikes.discountRules.useQuery({ bikeId });
  const [localRules, setLocalRules] = useState<{ minDays: string; discountPercent: string }[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (!initialized && (rules as any[]).length >= 0 && !isLoading) {
    setLocalRules((rules as any[]).map((r: any) => ({ minDays: String(r.minDays), discountPercent: String(r.discountPercent) })));
    setInitialized(true);
  }

  const setRules = trpc.bikes.setDiscountRules.useMutation({
    onSuccess: () => { utils.bikes.discountRules.invalidate(); toast.success("Regras salvas!"); },
    onError: (e) => toast.error(e.message),
  });

  const addRule = () => setLocalRules([...localRules, { minDays: "", discountPercent: "" }]);
  const removeRule = (idx: number) => setLocalRules(localRules.filter((_, i) => i !== idx));
  const updateRule = (idx: number, field: string, value: string) => {
    const updated = [...localRules];
    (updated[idx] as any)[field] = value;
    setLocalRules(updated);
  };

  const handleSave = () => {
    const parsed = localRules.filter(r => r.minDays && r.discountPercent).map(r => ({ minDays: parseInt(r.minDays), discountPercent: r.discountPercent }));
    setRules.mutate({ bikeId, rules: parsed });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md dialog-mobile">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Percent className="w-4 h-4 text-primary" />Desconto Progressivo</DialogTitle></DialogHeader>
        {isLoading ? <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Configure descontos automáticos por número de dias de aluguel.</p>
            {localRules.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input type="number" min="1" placeholder="Dias" value={rule.minDays} onChange={e => updateRule(idx, "minDays", e.target.value)} className="h-8 text-sm" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">dias =</span>
                <Input type="number" min="0" max="100" step="0.5" placeholder="%" value={rule.discountPercent} onChange={e => updateRule(idx, "discountPercent", e.target.value)} className="h-8 text-sm" />
                <span className="text-xs text-muted-foreground">%</span>
                <button onClick={() => removeRule(idx)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button onClick={addRule} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />Adicionar faixa</button>
            <div className="flex gap-3 pt-3 border-t border-border">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
              <Button onClick={handleSave} disabled={setRules.isPending} className="flex-1">{setRules.isPending ? "Salvando..." : "Salvar regras"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Bike Sizes Tab ───────────────────────────────────────────────────────────
function BikeSizesTab({ bikeId }: { bikeId: number }) {
  const utils = trpc.useUtils();
  const { data: sizes = [], isLoading } = trpc.bikes.listSizes.useQuery({ bikeId });
  const [tamanho, setTamanho] = useState("");
  const [qtTotal, setQtTotal] = useState("1");
  const [qtDisp, setQtDisp] = useState("1");
  const [obs, setObs] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{ tamanho: string; quantidadeTotal: string; quantidadeDisponivel: string }>({ tamanho: "", quantidadeTotal: "", quantidadeDisponivel: "" });

  const addMut = trpc.bikes.addSize.useMutation({
    onSuccess: () => { utils.bikes.listSizes.invalidate(); setTamanho(""); setQtTotal("1"); setQtDisp("1"); setObs(""); toast.success("Tamanho adicionado!"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.bikes.updateSize.useMutation({
    onSuccess: () => { utils.bikes.listSizes.invalidate(); setEditId(null); toast.success("Tamanho atualizado!"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.bikes.deleteSize.useMutation({
    onSuccess: () => { utils.bikes.listSizes.invalidate(); toast.success("Tamanho removido!"); },
    onError: (e) => toast.error(e.message),
  });

  const startEdit = (s: any) => { setEditId(s.id); setEditData({ tamanho: s.tamanho, quantidadeTotal: String(s.quantidadeTotal), quantidadeDisponivel: String(s.quantidadeDisponivel) }); };

  return (
    <div className="space-y-4">
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
        <div className="space-y-2">
          {(sizes as any[]).length === 0 && <p className="text-sm text-muted-foreground">Nenhum tamanho cadastrado.</p>}
          {(sizes as any[]).map((s: any) => (
            <div key={s.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              {editId === s.id ? (
                <div className="flex-1 grid grid-cols-3 gap-2 mr-2">
                  <Input value={editData.tamanho} onChange={e => setEditData(d => ({ ...d, tamanho: e.target.value }))} className="h-8 text-sm" placeholder="Tamanho" />
                  <Input type="number" value={editData.quantidadeTotal} onChange={e => setEditData(d => ({ ...d, quantidadeTotal: e.target.value }))} className="h-8 text-sm" placeholder="Total" />
                  <Input type="number" value={editData.quantidadeDisponivel} onChange={e => setEditData(d => ({ ...d, quantidadeDisponivel: e.target.value }))} className="h-8 text-sm" placeholder="Disponível" />
                </div>
              ) : (
                <div className="flex-1">
                  <span className="font-medium text-sm">{s.tamanho}</span>
                  <span className="text-xs text-muted-foreground ml-2">Total: {s.quantidadeTotal} | Disponível: {s.quantidadeDisponivel}</span>
                  {s.observacao && <p className="text-xs text-muted-foreground mt-0.5">{s.observacao}</p>}
                </div>
              )}
              <div className="flex gap-1">
                {editId === s.id ? (
                  <>
                    <Button size="sm" className="h-7 text-xs" onClick={() => updateMut.mutate({ id: s.id, tamanho: editData.tamanho, quantidadeTotal: parseInt(editData.quantidadeTotal), quantidadeDisponivel: parseInt(editData.quantidadeDisponivel) })}>Salvar</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditId(null)}>Cancelar</Button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(s)} className="text-muted-foreground hover:text-primary p-1"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { if (confirm("Remover tamanho?")) deleteMut.mutate({ id: s.id }); }} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Separator />
      <div className="grid grid-cols-3 gap-2">
        <div><Label className="text-xs">Tamanho *</Label><Input value={tamanho} onChange={e => setTamanho(e.target.value)} placeholder="P / M / G / 29" className="h-8 text-sm" /></div>
        <div><Label className="text-xs">Qtd. Total</Label><Input type="number" value={qtTotal} onChange={e => setQtTotal(e.target.value)} className="h-8 text-sm" /></div>
        <div><Label className="text-xs">Qtd. Disponível</Label><Input type="number" value={qtDisp} onChange={e => setQtDisp(e.target.value)} className="h-8 text-sm" /></div>
      </div>
      <Input value={obs} onChange={e => setObs(e.target.value)} placeholder="Observação (opcional)" className="h-8 text-sm" />
      <Button size="sm" onClick={() => { if (!tamanho) return toast.error("Informe o tamanho."); addMut.mutate({ bikeId, tamanho, quantidadeTotal: parseInt(qtTotal), quantidadeDisponivel: parseInt(qtDisp), observacao: obs || undefined }); }} disabled={addMut.isPending} className="w-full">
        <Plus className="w-3.5 h-3.5 mr-1" />Adicionar Tamanho
      </Button>
    </div>
  );
}

// ─── Maintenance Tab ──────────────────────────────────────────────────────────
function MaintenanceTab({ bikeId }: { bikeId: number }) {
  const utils = trpc.useUtils();
  const { data: logs = [], isLoading } = trpc.bikes.listMaintenance.useQuery({ bikeId });
  const { data: sizes = [] } = trpc.bikes.listSizes.useQuery({ bikeId });
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState("");
  const [custo, setCusto] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [status, setStatus] = useState<"em_andamento" | "concluida">("em_andamento");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  // Tamanho afetado: null = todos os tamanhos
  const [tamanhoBikeId, setTamanhoBikeId] = useState<number | null>(null);
  const [quantidadeAfetada, setQuantidadeAfetada] = useState("1");
  const [serialAfetado, setSerialAfetado] = useState("");

  const selectedSize = (sizes as any[]).find((s: any) => s.id === tamanhoBikeId);
  const maxQty = selectedSize ? (selectedSize.quantidadeDisponivel ?? selectedSize.quantidadeTotal ?? 99) : 99;

  // Filter: hide completed logs older than 30 days unless showHistory is true
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const visibleLogs = showHistory
    ? (logs as any[])
    : (logs as any[]).filter((l: any) => l.status !== "concluida" || new Date(l.dataEntrada) >= cutoff);
  const hiddenCount = (logs as any[]).length - visibleLogs.length;

  const addMut = trpc.bikes.addMaintenance.useMutation({
    onSuccess: () => {
      utils.bikes.listMaintenance.invalidate();
      utils.bikes.list.invalidate();
      utils.bikes.listSizes.invalidate();
      setShowForm(false);
      setDesc(""); setCusto(""); setDataPrevista(""); setStatus("em_andamento");
      setTamanhoBikeId(null); setQuantidadeAfetada("1"); setSerialAfetado("");
      toast.success("Manutenção registrada!");
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.bikes.updateMaintenance.useMutation({
    onSuccess: () => {
      utils.bikes.listMaintenance.invalidate();
      utils.bikes.list.invalidate();
      utils.bikes.listSizes.invalidate();
      toast.success("Manutenção atualizada!");
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.bikes.deleteMaintenanceLog.useMutation({
    onSuccess: () => {
      utils.bikes.listMaintenance.invalidate();
      utils.bikes.list.invalidate();
      utils.bikes.listSizes.invalidate();
      setConfirmDeleteId(null);
      toast.success("Registro excluído.");
    },
    onError: (e) => { toast.error(e.message); setConfirmDeleteId(null); },
  });

  return (
    <div className="space-y-3">
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
        <div className="space-y-2">
          {visibleLogs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro de manutenção.</p>}
          {visibleLogs.map((log: any) => (
            <div key={log.id} className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/50" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                <div className="flex items-center gap-2 min-w-0">
                  {log.status === "concluida" ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> : <Clock className="w-4 h-4 text-amber-500 shrink-0" />}
                  <span className="text-sm font-medium line-clamp-1">{log.descricao}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant={log.status === "concluida" ? "default" : "secondary"} className="text-xs">{log.status === "concluida" ? "Concluída" : "Em andamento"}</Badge>
                  <button
                    className="p-1 rounded hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors"
                    title="Excluir registro"
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(log.id); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {expandedId === log.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
              {/* Confirm delete inline */}
              {confirmDeleteId === log.id && (
                <div className="px-3 pb-3 border-t border-destructive/20 bg-destructive/5">
                  <div className="flex items-center gap-2 py-2">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    <p className="text-xs text-destructive flex-1">
                      {log.status === "em_andamento"
                        ? "Excluir este registro irá restaurar a disponibilidade da bike. Confirmar?"
                        : "Excluir este registro de manutenção? Esta ação não pode ser desfeita."}
                    </p>
                    <Button size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={() => deleteMut.mutate({ logId: log.id, bikeId })} disabled={deleteMut.isPending}>
                      {deleteMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Excluir"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
                  </div>
                </div>
              )}
              {expandedId === log.id && confirmDeleteId !== log.id && (
                <div className="p-3 pt-0 border-t border-border bg-secondary/20 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Entrada: {new Date(log.dataEntrada).toLocaleDateString("pt-BR")}</span>
                    {log.dataPrevistaRetorno && <span>Prev. retorno: {new Date(log.dataPrevistaRetorno).toLocaleDateString("pt-BR")}</span>}
                    {log.custo && <span>Custo: R$ {parseFloat(log.custo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                  </div>
                  {log.status === "em_andamento" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateMut.mutate({ id: log.id, bikeId, status: "concluida" })} disabled={updateMut.isPending}>
                      {updateMut.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}Marcar como concluída
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
          {hiddenCount > 0 && (
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-1"
              onClick={() => setShowHistory(true)}
            >
              <History className="w-3.5 h-3.5" />
              Ver histórico completo ({hiddenCount} registro{hiddenCount !== 1 ? "s" : ""} oculto{hiddenCount !== 1 ? "s" : ""})
            </button>
          )}
          {showHistory && hiddenCount > 0 && (
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-1"
              onClick={() => setShowHistory(false)}
            >
              <ChevronUp className="w-3.5 h-3.5" />
              Ocultar histórico antigo
            </button>
          )}
        </div>
      )}
      {showForm ? (
        <div className="border border-border rounded-lg p-3 space-y-3 bg-secondary/20">
          <Label className="text-sm font-medium">Novo registro de manutenção</Label>
          <div><Label className="text-xs">Descrição *</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descreva o problema ou serviço..." className="text-sm min-h-[60px]" /></div>
          <div>
            <Label className="text-xs">Tamanho afetado *</Label>
            <Select value={tamanhoBikeId === null ? "__todos__" : String(tamanhoBikeId)} onValueChange={(v) => { setTamanhoBikeId(v === "__todos__" ? null : parseInt(v)); setQuantidadeAfetada("1"); }}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar tamanho..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos os tamanhos</SelectItem>
                {(sizes as any[]).map((s: any) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.tamanho} — {s.quantidadeDisponivel ?? s.quantidadeTotal} disp.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Quantidade em manutenção</Label>
            <Input type="number" min={1} max={maxQty} value={quantidadeAfetada} onChange={e => setQuantidadeAfetada(e.target.value)} className="h-8 text-sm" />
            {selectedSize && <p className="text-xs text-muted-foreground mt-0.5">Máx. disponível: {maxQty}</p>}
          </div>
          <div>
            <Label className="text-xs">Número de série da unidade afetada <span className="text-muted-foreground">(opcional)</span></Label>
            <Input
              value={serialAfetado}
              onChange={e => setSerialAfetado(e.target.value)}
              placeholder="Ex: BK-007"
              className="h-8 text-sm"
              maxLength={50}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Custo (R$)</Label><Input value={custo} onChange={e => setCusto(e.target.value)} placeholder="0,00" className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Prev. retorno</Label><Input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} className="h-8 text-sm" /></div>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => {
            if (!desc) return toast.error("Informe a descrição.");
            const qty = parseInt(quantidadeAfetada) || 1;
            // Append serial number to description if provided
            const descFinal = serialAfetado.trim()
              ? `${desc} [Série: ${serialAfetado.trim()}]`
              : desc;
            addMut.mutate({ bikeId, tamanhoBikeId, quantidadeAfetada: qty, descricao: descFinal, custo: custo || undefined, dataPrevistaRetorno: dataPrevista || undefined, status });
          }} disabled={addMut.isPending} className="flex-1">Salvar</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="w-full"><Plus className="w-3.5 h-3.5 mr-1" />Registrar Manutenção</Button>
      )}
    </div>
  );
}

// ─── Bike Photo Upload ────────────────────────────────────────────────────────
function BikePhotoUpload({ bikeId, currentUrl, onUploaded }: { bikeId: number; currentUrl?: string | null; onUploaded: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sizeWarning, setSizeWarning] = useState(false);
  const uploadMut = trpc.bikes.uploadBikePhoto.useMutation({
    onSuccess: (data) => { onUploaded(data.url); toast.success("Foto atualizada!"); },
    onError: (e) => toast.error(e.message),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Foto deve ter no máximo 5MB.");
    setSizeWarning(file.size > 2 * 1024 * 1024);
    const reader = new FileReader();
    reader.onload = () => uploadMut.mutate({ bikeId, base64: reader.result as string, mimeType: file.type });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      {/* Preview na proporção 4:3 */}
      {currentUrl ? (
        <div className="relative w-full rounded-lg overflow-hidden bg-secondary border border-border" style={{ aspectRatio: "4/3" }}>
          <img src={currentUrl} alt="Foto da bicicleta" className="w-full h-full object-cover" />
          <button onClick={() => fileRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity text-white text-sm font-medium">
            <Camera className="w-5 h-5 mr-1" />Trocar foto
          </button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} className="w-full rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors" style={{ aspectRatio: "4/3" }}>
          <Upload className="w-8 h-8" />
          <span className="text-sm">Clique para adicionar foto</span>
          <span className="text-xs">JPG, PNG ou WEBP — máx. 5MB</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {/* Guia de tamanho */}
      <p className="text-xs text-muted-foreground">
        Recomendado: 800×600px, proporção 4:3, máximo 2MB
      </p>
      {/* Aviso > 2MB */}
      {sizeWarning && (
        <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
          ⚠️ Foto muito grande — pode deixar o formulário lento
        </p>
      )}
      {uploadMut.isPending && <p className="text-xs text-muted-foreground text-center animate-pulse">Enviando foto...</p>}
    </div>
  );
}

// ─── Bike Form Dialog ─────────────────────────────────────────────────────────
function BikeFormDialog({ bike, onClose, onSuccess }: { bike: any | null; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!bike;
  const [form, setForm] = useState({
    serialNumber: bike?.serialNumber ?? "",
    model: bike?.model ?? "",
    brand: bike?.brand ?? "",
    category: bike?.category ?? "",
    size: bike?.size ?? "",
    color: bike?.color ?? "",
    description: bike?.description ?? "",
    weight: bike?.weight ?? "",
    weightLimit: bike?.weightLimit ?? "",
    dailyRate: bike?.dailyRate ?? "",
    quantity: bike?.quantity ?? 1,
    notes: bike?.notes ?? "",
    status: bike?.status ?? "available",
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(bike?.photoUrl ?? null);
  const [savedId, setSavedId] = useState<number | null>(bike?.id ?? null);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const createMut = trpc.bikes.create.useMutation({
    onSuccess: (data) => { setSavedId(data.id); toast.success("Bicicleta criada! Use as abas para adicionar foto e tamanhos."); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.bikes.update.useMutation({
    onSuccess: () => { toast.success("Bicicleta atualizada!"); onSuccess(); },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.serialNumber.trim()) return toast.error("Número de série é obrigatório.");
    if (!form.model.trim()) return toast.error("Modelo é obrigatório.");
    const payload: any = { ...form, quantity: Number(form.quantity) || 1, photoUrl: photoUrl ?? undefined };
    if (savedId) updateMut.mutate({ id: savedId, ...payload });
    else createMut.mutate(payload);
  };

  const currentId = savedId ?? bike?.id;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dialog-mobile">
        <DialogHeader><DialogTitle>{isEdit ? "Editar Bicicleta" : "Nova Bicicleta"}</DialogTitle></DialogHeader>
        <Tabs defaultValue="dados">
          <TabsList className="w-full grid grid-cols-4 h-auto">
            <TabsTrigger value="dados" className="text-xs py-2 px-1">Dados</TabsTrigger>
            <TabsTrigger value="foto" disabled={!currentId} className="text-xs py-2 px-1">Foto</TabsTrigger>
            <TabsTrigger value="tamanhos" disabled={!currentId} className="text-xs py-2 px-1">Tamanhos</TabsTrigger>
            <TabsTrigger value="manutencao" disabled={!currentId} className="text-xs py-2 px-1">
              <span className="hidden sm:inline">Manutenção</span>
              <span className="sm:hidden">Manut.</span>
            </TabsTrigger>
          </TabsList>

          {/* Aba Dados */}
          <TabsContent value="dados" className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Nº de Série *</Label><Input value={form.serialNumber} onChange={e => set("serialNumber", e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Modelo *</Label><Input value={form.model} onChange={e => set("model", e.target.value)} className="h-8 text-sm" /></div>
              <div>
                <Label className="text-xs">Marca</Label>
                <Select value={form.brand || "_none"} onValueChange={v => set("brand", v === "_none" ? "" : v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Selecionar...</SelectItem>
                    <SelectItem value="Trek">Trek</SelectItem>
                    <SelectItem value="Sense">Sense</SelectItem>
                    <SelectItem value="Oggi">Oggi</SelectItem>
                    <SelectItem value="Cannondale">Cannondale</SelectItem>
                    <SelectItem value="Specialized">Specialized</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={form.category || "_none"} onValueChange={v => set("category", v === "_none" ? "" : v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Selecionar...</SelectItem>
                    <SelectItem value="mtb">MTB</SelectItem>
                    <SelectItem value="speed">Speed</SelectItem>
                    <SelectItem value="gravel">Gravel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Cor</Label><Input value={form.color} onChange={e => set("color", e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Diária (R$)</Label><Input type="number" value={form.dailyRate} onChange={e => set("dailyRate", e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Peso (kg)</Label><Input value={form.weight} onChange={e => set("weight", e.target.value)} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Limite de peso (kg)</Label><Input value={form.weightLimit} onChange={e => set("weightLimit", e.target.value)} className="h-8 text-sm" /></div>

              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="rented">Alugada</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Descrição</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} className="text-sm min-h-[60px]" /></div>
            <div><Label className="text-xs">Observações internas</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} className="text-sm min-h-[60px]" /></div>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending} className="w-full">
              {createMut.isPending || updateMut.isPending ? "Salvando..." : (savedId && !isEdit ? "Salvo ✓ — Atualizar" : isEdit ? "Salvar alterações" : "Criar bicicleta")}
            </Button>
          </TabsContent>

          {/* Aba Foto */}
          <TabsContent value="foto" className="pt-2">
            {currentId ? <BikePhotoUpload bikeId={currentId} currentUrl={photoUrl} onUploaded={url => setPhotoUrl(url)} /> : <p className="text-sm text-muted-foreground text-center py-8">Salve a bicicleta primeiro.</p>}
          </TabsContent>

          {/* Aba Tamanhos */}
          <TabsContent value="tamanhos" className="pt-2">
            {currentId ? <BikeSizesTab bikeId={currentId} /> : <p className="text-sm text-muted-foreground text-center py-8">Salve a bicicleta primeiro.</p>}
          </TabsContent>

          {/* Aba Manutenção */}
          <TabsContent value="manutencao" className="pt-2">
            {currentId ? <MaintenanceTab bikeId={currentId} /> : <p className="text-sm text-muted-foreground text-center py-8">Salve a bicicleta primeiro.</p>}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Bikes Page ──────────────────────────────────────────────────────────
export default function Bikes() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<BikeStatus | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editBike, setEditBike] = useState<any | null>(null);
  const [discountBikeId, setDiscountBikeId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const { data: bikesResult, isLoading } = trpc.bikes.list.useQuery({ status: statusFilter, category: categoryFilter, search: search || undefined, page, limit: LIMIT });
  const bikes: any[] = bikesResult?.data ?? [];
  const totalBikes = bikesResult?.total ?? 0;
  const totalPages = bikesResult?.totalPages ?? 1;

  const deleteMutation = trpc.bikes.delete.useMutation({
    onSuccess: () => { utils.bikes.list.invalidate(); toast.success("Bicicleta removida!"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Bicicletas</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Gerencie a frota, tamanhos e manutenções</p>
        </div>
        <Button onClick={() => { setEditBike(null); setShowForm(true); }} className="gap-1.5 h-9 text-xs md:text-sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nova Bicicleta</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>

      {/* Filters — horizontal compact */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar por modelo, série..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 text-sm pl-8 bg-card border-border" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {([undefined, "available", "rented", "maintenance"] as (BikeStatus | undefined)[]).map(s => (
            <button key={String(s)} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1 rounded text-xs font-medium transition-all border ${statusFilter === s ? "bg-primary/15 border-primary/40 text-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
              {s === undefined ? "Todos" : statusConfig[s]?.label}
            </button>
          ))}
          <span className="hidden sm:inline text-border">|</span>
          {([undefined, "mtb", "speed", "gravel"] as (string | undefined)[]).map(c => (
            <button key={String(c)} onClick={() => setCategoryFilter(c)} className={`px-2.5 py-1 rounded text-xs font-medium transition-all border ${categoryFilter === c ? "bg-primary/15 border-primary/40 text-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
              {c === undefined ? "Todas" : categoryLabels[c as BikeCategory] || c}
            </button>
          ))}
          {(search || statusFilter || categoryFilter) && (
            <button onClick={() => { setSearch(""); setStatusFilter(undefined); setCategoryFilter(undefined); setPage(1); }} className="px-2.5 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground border border-border bg-card">
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : bikes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <BikeIcon className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">Nenhuma bicicleta encontrada</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full table-compact">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Bicicleta</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Categoria</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Status</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Diária</th>
                  <th className="w-32 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {bikes.map((bike: any) => (
                  <tr key={bike.id} className="group border-b border-border/40 last:border-b-0">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-md overflow-hidden bg-secondary flex-shrink-0 border border-border">
                          {bike.photoUrl ? (
                            <img src={bike.photoUrl} alt={bike.model} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><BikeIcon className="w-4 h-4 text-muted-foreground/30" /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-foreground truncate">{bike.model}</p>
                          <p className="text-[11px] text-muted-foreground">{bike.brand || ''} {bike.serialNumber ? `• #${bike.serialNumber}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {bike.category && <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] uppercase font-medium">{categoryLabels[bike.category as BikeCategory] || bike.category}</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[bike.status as BikeStatus]?.cls ?? "bg-secondary text-secondary-foreground"}`}>
                        {statusConfig[bike.status as BikeStatus]?.label ?? bike.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] font-semibold text-primary">
                      {bike.dailyRate ? `R$ ${parseFloat(bike.dailyRate).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2 row-actions">
                        <button onClick={() => { setEditBike(bike); setShowForm(true); }} className="text-[12px] text-primary hover:underline font-medium">Editar</button>
                        <button onClick={() => setDiscountBikeId(bike.id)} className="text-[12px] text-muted-foreground hover:text-primary">Descontos</button>
                        <button onClick={() => { if (confirm("Remover?")) deleteMutation.mutate({ id: bike.id }); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {bikes.map((bike: any) => (
              <div key={bike.id} className="bg-card border border-border rounded-lg p-3 active:bg-accent/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-md overflow-hidden bg-secondary flex-shrink-0 border border-border">
                    {bike.photoUrl ? (
                      <img src={bike.photoUrl} alt={bike.model} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><BikeIcon className="w-5 h-5 text-muted-foreground/30" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{bike.model}</p>
                    <p className="text-xs text-muted-foreground">{bike.brand} {bike.category && `• ${categoryLabels[bike.category as BikeCategory] || bike.category}`}</p>
                    {bike.dailyRate && <p className="text-xs font-semibold text-primary mt-0.5">R$ {parseFloat(bike.dailyRate).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/dia</p>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusConfig[bike.status as BikeStatus]?.cls ?? "bg-secondary text-secondary-foreground"}`}>
                    {statusConfig[bike.status as BikeStatus]?.label ?? bike.status}
                  </span>
                </div>
                <div className="flex gap-3 pt-2 mt-2 border-t border-border/50">
                  <button onClick={() => { setEditBike(bike); setShowForm(true); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><Pencil className="w-3 h-3" />Editar</button>
                  <button onClick={() => setDiscountBikeId(bike.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><Percent className="w-3 h-3" />Descontos</button>
                  <button onClick={() => { if (confirm("Remover?")) deleteMutation.mutate({ id: bike.id }); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive ml-auto"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
          {/* Pagination footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2.5 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Mostrando {Math.min((page - 1) * LIMIT + 1, totalBikes)}–{Math.min(page * LIMIT, totalBikes)} de {totalBikes}
              </p>
              <div className="flex gap-1.5">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-2.5 py-1 rounded text-xs border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed">Anterior</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-2.5 py-1 rounded text-xs border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed">Próxima</button>
              </div>
            </div>
          )}
        </>
      )}

      {showForm && <BikeFormDialog bike={editBike} onClose={() => { setShowForm(false); setEditBike(null); }} onSuccess={() => { setShowForm(false); setEditBike(null); utils.bikes.list.invalidate(); }} />}
      {discountBikeId !== null && <DiscountRulesEditor bikeId={discountBikeId} onClose={() => setDiscountBikeId(null)} />}
    </div>
  );
}
