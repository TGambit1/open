/**
 * Home landing page — app.js
 *
 * Config is injected by the Home server at build/serve time via window.HOME_CONFIG.
 * Falls back to defaults for local dev.
 *
 * HOME_CONFIG shape:
 * {
 *   name?: string;           // household display name, default "Home"
 *   emoji?: string;          // avatar emoji, default "🏡"
 *   bio?: string;            // short bio line
 *   phoneNumber: string;     // E.164, e.g. "+12125551234"
 *   groupSmsLink?: string;   // optional pre-built group SMS URI
 * }
 */

(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────────────────────
  const cfg = window.HOME_CONFIG ?? {};

  const name         = cfg.name         ?? "Home";
  const emoji        = cfg.emoji        ?? "🏡";
  const bio          = cfg.bio          ?? null;
  const phoneNumber  = cfg.phoneNumber  ?? null;
  const groupSmsLink = cfg.groupSmsLink ?? null;

  // ── Populate profile ────────────────────────────────────────────────────
  const avatarEl  = document.getElementById("avatar");
  const nameEl    = document.getElementById("profile-name");
  const bioEl     = document.getElementById("bio");

  if (avatarEl)  avatarEl.textContent  = emoji;
  if (nameEl)    nameEl.textContent    = name;
  if (bioEl && bio) bioEl.innerHTML = escapeHtml(bio).replace(/\n/g, "<br>");

  // ── Build the "Text Home" deep link ────────────────────────────────────
  const textBtn     = document.getElementById("text-btn");
  const fallbackRow = document.getElementById("fallback-row");
  const displayNum  = document.getElementById("display-number");

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (textBtn && phoneNumber) {
    // Prefer an explicit group SMS link; otherwise build a sms: URI
    const href = groupSmsLink ?? buildSmsUri(phoneNumber);

    textBtn.setAttribute("href", href);

    if (isMobile || isSafari) {
      // On iOS, sms: URIs open Messages directly
      textBtn.addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = href;
      });
    } else {
      // Desktop: show the number instead; hide the CTA button
      textBtn.setAttribute("hidden", "");
      if (fallbackRow) {
        fallbackRow.removeAttribute("hidden");
        if (displayNum) displayNum.textContent = formatPhone(phoneNumber);
      }
    }
  } else if (textBtn) {
    // No phone number configured yet
    textBtn.textContent = "Coming soon";
    textBtn.setAttribute("aria-disabled", "true");
    textBtn.style.opacity = "0.5";
    textBtn.style.pointerEvents = "none";
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Build an SMS URI. iOS supports `sms:+1XXX&body=Hey` but the & must be ;
   * on older iOS. We use the safe form.
   */
  function buildSmsUri(number) {
    const clean = number.replace(/\s/g, "");
    return "sms:" + clean;
  }

  /** Format E.164 → (XXX) XXX-XXXX for US numbers, or return as-is. */
  function formatPhone(e164) {
    const digits = e164.replace(/\D/g, "");
    if (digits.length === 11 && digits[0] === "1") {
      const d = digits.slice(1);
      return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
    }
    return e164;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
