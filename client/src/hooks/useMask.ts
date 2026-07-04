/**
 * useMask.ts — Bloco C
 * Funções de máscara para campos de formulário e busca de CEP via ViaCEP.
 */

// ─── Funções de máscara ───────────────────────────────────────────────────────

/** CPF: 000.000.000-00 */
export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** CPF obfuscado para exibição (LGPD): 066.***.***-06 */
export function obfuscateCPF(cpf: string | null | undefined): string {
  if (!cpf) return "";
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf; // não-CPF (estrangeiro/incompleto): devolve como está
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
}

/** RG: 00.000.000-0 (padrão SP — aceita outros formatos) */
export function maskRG(value: string): string {
  const clean = value.replace(/[^\dXx]/g, "").slice(0, 9).toUpperCase();
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return clean.replace(/(\d{2})(\d)/, "$1.$2");
  if (clean.length <= 8) return clean.replace(/(\d{2})(\d{3})(\d)/, "$1.$2.$3");
  return clean.replace(/(\d{2})(\d{3})(\d{3})([\dX])/, "$1.$2.$3-$4");
}

/** CEP: 00000-000 */
export function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})/, "$1-$2");
}

/** Telefone: (00) 00000-0000 ou (00) 0000-0000 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

/** Data: DD/MM/AAAA */
export function maskDate(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2");
}

/** Converte DD/MM/AAAA → AAAA-MM-DD para envio ao servidor */
export function dateDisplayToISO(display: string): string {
  const parts = display.split("/");
  if (parts.length !== 3 || parts[2].length !== 4) return display;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/** Converte AAAA-MM-DD → DD/MM/AAAA para exibição */
export function dateISOToDisplay(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ─── Validações client-side ───────────────────────────────────────────────────

export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(digits[10]);
}

export function isValidRG(rg: string): boolean {
  const clean = rg.replace(/[.\-\s]/g, "").toUpperCase();
  if (clean.length < 7 || clean.length > 9) return false;
  return /^[0-9]{6,8}[0-9X]$/.test(clean);
}

// ─── ViaCEP ───────────────────────────────────────────────────────────────────

export interface ViaCEPResult {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

/**
 * Busca endereço pelo CEP usando a API pública ViaCEP.
 * Retorna null se o CEP não for encontrado ou for inválido.
 */
export async function fetchViaCEP(cep: string): Promise<ViaCEPResult | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return data as ViaCEPResult;
  } catch {
    return null;
  }
}

// ─── Hook principal ───────────────────────────────────────────────────────────

import { useCallback } from "react";

/**
 * useMask — retorna handlers de onChange com máscara aplicada.
 *
 * Uso:
 *   const { applyMask } = useMask();
 *   <Input onChange={e => setValue(applyMask("cpf", e.target.value))} />
 */
export function useMask() {
  const applyMask = useCallback((
    type: "cpf" | "rg" | "cep" | "phone" | "date",
    value: string
  ): string => {
    switch (type) {
      case "cpf":   return maskCPF(value);
      case "rg":    return maskRG(value);
      case "cep":   return maskCEP(value);
      case "phone": return maskPhone(value);
      case "date":  return maskDate(value);
      default:      return value;
    }
  }, []);

  return { applyMask, maskCPF, maskRG, maskCEP, maskPhone, maskDate, isValidCPF, isValidRG, fetchViaCEP, dateDisplayToISO, dateISOToDisplay };
}
