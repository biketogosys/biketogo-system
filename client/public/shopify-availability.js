/**
 * Bike To Go — Shopify Availability Widget
 * Lê o metafield btg.bike_id do produto e consulta o endpoint
 * GET /api/shopify/bike-availability/:bikeId para exibir
 * disponibilidade em tempo real e desabilitar tamanhos esgotados.
 *
 * Configuração: defina window.BTG_API_URL com a URL base da API
 * (ex: "https://biketogo.manus.space") antes de carregar este script.
 */
(function () {
  "use strict";

  var API_BASE = (window.BTG_API_URL || "").replace(/\/$/, "");

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function getBikeId() {
    // 1. Metafield btg.bike_id exposto pelo tema como variável global
    if (window.btgBikeId) return parseInt(window.btgBikeId, 10);

    // 2. Atributo data-btg-bike-id em qualquer elemento da página
    var el = document.querySelector("[data-btg-bike-id]");
    if (el) return parseInt(el.getAttribute("data-btg-bike-id"), 10);

    // 3. Meta tag <meta name="btg:bike_id" content="...">
    var meta = document.querySelector('meta[name="btg:bike_id"]');
    if (meta) return parseInt(meta.getAttribute("content"), 10);

    return null;
  }

  function getBadgeContainer() {
    return (
      document.getElementById("btg-availability-badge") ||
      document.querySelector(".btg-availability-badge")
    );
  }

  function getStatusText(data) {
    switch (data.status) {
      case "disponivel":
        return "● Aluguel Disponível";
      case "parcialmente": {
        var available = (data.tamanhos || []).filter(function (t) {
          return t.quantidadeDisponivel > 0;
        });
        if (available.length === 0) return "● Indisponível";
        var parts = available.map(function (t) {
          return t.tamanho + " (" + t.quantidadeDisponivel + ")";
        });
        return "● Disponível: " + parts.join(" · ");
      }
      case "indisponivel":
        return "● Indisponível";
      case "manutencao":
        return "● Em Manutenção";
      default:
        return "● Status desconhecido";
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case "disponivel":
        return "#22c55e"; // green-500
      case "parcialmente":
        return "#f59e0b"; // amber-500
      case "indisponivel":
        return "#ef4444"; // red-500
      case "manutencao":
        return "#6b7280"; // gray-500
      default:
        return "#6b7280";
    }
  }

  // ─── Renderização do badge ──────────────────────────────────────────────────

  function renderBadge(data) {
    var container = getBadgeContainer();
    if (!container) {
      // Criar badge automaticamente após o botão de adicionar ao carrinho
      var addToCartBtn =
        document.querySelector('button[name="add"]') ||
        document.querySelector(".product-form__submit") ||
        document.querySelector('[data-testid="Checkout-button"]');
      if (addToCartBtn) {
        container = document.createElement("div");
        container.id = "btg-availability-badge";
        container.style.cssText =
          "margin-top:12px;font-size:14px;font-weight:600;letter-spacing:0.01em;";
        addToCartBtn.parentNode.insertBefore(container, addToCartBtn.nextSibling);
      }
    }
    if (!container) return;

    var text = getStatusText(data);
    var color = getStatusColor(data.status);
    container.textContent = text;
    container.style.color = color;
  }

  // ─── Atualização dos botões de tamanho ─────────────────────────────────────

  function updateSizeButtons(tamanhos) {
    if (!tamanhos || tamanhos.length === 0) return;

    var availMap = {};
    tamanhos.forEach(function (t) {
      availMap[t.tamanho.toUpperCase()] = t.quantidadeDisponivel;
    });

    // Selectors comuns de variantes de tamanho no Shopify
    var sizeInputs = document.querySelectorAll(
      'input[name="Size"], input[name="Tamanho"], input[name="size"], input[name="tamanho"]'
    );
    sizeInputs.forEach(function (input) {
      var label = document.querySelector('label[for="' + input.id + '"]');
      var sizeKey = (input.value || "").toUpperCase();
      var qty = availMap[sizeKey];
      if (qty === undefined) return; // tamanho não mapeado, não alterar

      if (qty === 0) {
        input.disabled = true;
        if (label) {
          label.style.opacity = "0.4";
          label.style.textDecoration = "line-through";
          label.title = "Indisponível";
        }
      } else {
        input.disabled = false;
        if (label) {
          label.style.opacity = "";
          label.style.textDecoration = "";
          label.title = "";
        }
      }
    });

    // Suporte a botões de variante (alguns temas usam <button> em vez de <input>)
    var sizeButtons = document.querySelectorAll(
      '[data-value][data-option-name="Size"], [data-value][data-option-name="Tamanho"]'
    );
    sizeButtons.forEach(function (btn) {
      var sizeKey = (btn.getAttribute("data-value") || "").toUpperCase();
      var qty = availMap[sizeKey];
      if (qty === undefined) return;

      if (qty === 0) {
        btn.disabled = true;
        btn.style.opacity = "0.4";
        btn.style.textDecoration = "line-through";
        btn.title = "Indisponível";
      } else {
        btn.disabled = false;
        btn.style.opacity = "";
        btn.style.textDecoration = "";
        btn.title = "";
      }
    });
  }

  // ─── Fetch principal ────────────────────────────────────────────────────────

  function fetchAvailability(bikeId) {
    if (!API_BASE) {
      console.warn("[BTG] BTG_API_URL não configurado.");
      return;
    }
    var url = API_BASE + "/api/shopify/bike-availability/" + bikeId;

    fetch(url, { method: "GET", headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        renderBadge(data);
        updateSizeButtons(data.tamanhos || []);
      })
      .catch(function (err) {
        console.warn("[BTG] Erro ao buscar disponibilidade:", err);
        var container = getBadgeContainer();
        if (container) {
          container.textContent = "";
        }
      });
  }

  // ─── Init ───────────────────────────────────────────────────────────────────

  function init() {
    var bikeId = getBikeId();
    if (!bikeId || isNaN(bikeId)) return; // não é uma página de produto com bike_id

    fetchAvailability(bikeId);

    // Atualizar a cada 60 segundos para refletir reservas recentes
    setInterval(function () {
      fetchAvailability(bikeId);
    }, 60000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
