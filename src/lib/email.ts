import "server-only";

/** Slanje mejlova preko Resend REST API-ja (bez SDK-a). */

export function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY nije podešen");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Captain Cook <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) throw new Error(`Resend greška ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

export function resetEmail(name: string, link: string) {
  const safeName = escapeHtml(name);
  const subject = "Nova lozinka za Captain Cook";
  const text = [
    `Zdravo ${name},`,
    "",
    "Neko (nadamo se ti) je zatražio novu lozinku za Captain Cook.",
    `Otvori ovaj link da postaviš novu lozinku (važi 1 sat):`,
    link,
    "",
    "Ako nisi ti tražio, slobodno ignoriši ovaj mejl — lozinka ostaje ista.",
  ].join("\n");
  const html = `<!doctype html>
<html lang="sr"><body style="margin:0;background:#f7f3ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1a17">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:24px;padding:32px">
        <tr><td>
          <div style="width:48px;height:48px;border-radius:16px;background:linear-gradient(135deg,#ff6a3d,#ffb547);text-align:center;line-height:48px;font-size:24px">👨‍🍳</div>
          <h1 style="font-size:22px;margin:20px 0 8px">Nova lozinka</h1>
          <p style="font-size:15px;line-height:1.6;color:#4a443e;margin:0 0 24px">
            Zdravo ${safeName}, neko (nadamo se ti) je zatražio novu lozinku za Captain Cook. Klikni na dugme da je postaviš. Link važi <b>1 sat</b>.
          </p>
          <a href="${escapeHtml(link)}" style="display:inline-block;background:#f0562b;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 24px;border-radius:14px">Postavi novu lozinku</a>
          <p style="font-size:13px;line-height:1.6;color:#7a7168;margin:24px 0 0">
            Ako nisi ti tražio, ignoriši ovaj mejl — lozinka ostaje ista.<br>
            Dugme ne radi? Otvori: <a href="${escapeHtml(link)}" style="color:#f0562b;word-break:break-all">${escapeHtml(link)}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return { subject, html, text };
}
