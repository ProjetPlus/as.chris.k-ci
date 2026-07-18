import { useEffect, useState, forwardRef } from "react";
import QRCode from "qrcode";
import type { DbMember, DbSettings } from "@/db/database";
import { fullName } from "@/lib/memberWorkflow";
import { fmtDate } from "@/pages/pageUtils";
import logo from "@/assets/logo-aschrisk.png";
import flag from "@/assets/flag-civ.png";

// Card size: CR-80 landscape. Rendered at fixed pixel size for pixel-perfect
// html2canvas capture; the same DOM is used for on-screen preview and PDF.
export const CARD_W_MM = 85.6;
export const CARD_H_MM = 53.98;
// Render at 4x mm to px (~101 dpi) then let html2canvas upscale with its scale option.
export const CARD_W_PX = 856;
export const CARD_H_PX = 540;

const clean = (v: unknown) => String(v ?? "").replace(/\//g, " ");

export const memberQrPayload = (member: Pick<DbMember, "member_id" | "first_name" | "last_name">) =>
  JSON.stringify({ member_id: clean(member.member_id), name: clean(fullName(member)) });

type Props = {
  member: DbMember;
  settings: DbSettings;
  side: "front" | "back";
  scale?: number; // visual scale for on-screen preview
};

export const MemberCard = forwardRef<HTMLDivElement, Props>(function MemberCard(
  { member, settings, side, scale = 1 },
  ref,
) {
  const [qr, setQr] = useState("");
  useEffect(() => {
    let m = true;
    QRCode.toDataURL(memberQrPayload(member), { margin: 0, width: 256, color: { dark: "#3B1F14", light: "#FFFFFF" } })
      .then((d) => m && setQr(d));
    return () => { m = false; };
  }, [member]);

  const assoc = clean(settings.association_name || "AS.CHRIS.K").toUpperCase();

  // AS.CHRIS.K palette
  const bordeaux = "#C4654A";
  const bordeauxDark = "#8B3E28";
  const or = "#D4A94C";
  const creme = "#FAF5EE";
  const ink = "#2A1810";
  const bandPale = "#F3E4D5";

  const wrapperStyle: React.CSSProperties = {
    width: CARD_W_PX,
    height: CARD_H_PX,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    background: creme,
    color: ink,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    boxShadow: "0 12px 32px rgba(0,0,0,.14)",
  };

  return (
    <div ref={ref} style={wrapperStyle} data-side={side}>
      {/* Decorative curved band */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 100% 0%, ${bandPale} 0%, ${bandPale} 30%, transparent 31%)`,
      }} />
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 96,
        background: `linear-gradient(90deg, ${bordeauxDark} 0%, ${bordeaux} 70%, ${bordeaux} 100%)`,
      }} />
      <div style={{ position: "absolute", top: 96, left: 0, right: 0, height: 4, background: or }} />

      {/* Header row */}
      <div style={{ position: "absolute", top: 12, left: 24, right: 24, display: "flex", alignItems: "center", gap: 14, height: 72 }}>
        <img src={logo} alt="" crossOrigin="anonymous" style={{ height: 68, width: 68, objectFit: "contain", background: "#fff", borderRadius: 10, padding: 4 }} />
        <div style={{ flex: 1, color: "#fff", lineHeight: 1.1 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 22, letterSpacing: 0.4 }}>{assoc}</div>
          <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4, letterSpacing: 1.2 }}>ASSOCIATION DES CHRÉTIENS DE KOUASSIKANKRO</div>
        </div>
        <img src={flag} alt="" crossOrigin="anonymous" style={{ height: 44, width: 66, objectFit: "cover", borderRadius: 4, border: "2px solid #fff", boxShadow: "0 2px 4px rgba(0,0,0,.2)" }} />
      </div>

      {side === "front" ? <FrontBody member={member} qr={qr} /> : <BackBody member={member} qr={qr} settings={settings} />}

      {/* Footer band */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 32,
        background: `linear-gradient(90deg, ${bordeaux} 0%, ${bordeauxDark} 100%)`,
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px",
        color: "#fff", fontSize: 11, letterSpacing: 1.4, fontWeight: 600,
      }}>
        <span>{side === "front" ? "CARTE OFFICIELLE" : "RÉPUBLIQUE DE CÔTE D'IVOIRE"}</span>
        <span>AS.CHRIS.K</span>
      </div>
    </div>
  );
});

function FrontBody({ member, qr }: { member: DbMember; qr: string }) {
  const or = "#D4A94C";
  const bordeaux = "#C4654A";
  const ink = "#2A1810";
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: bordeaux, letterSpacing: 1, textTransform: "uppercase" };
  const value: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: ink, marginTop: 2 };

  const photo = member.photo && !member.photo.startsWith("data:")
    ? `${member.photo}${member.photo.includes("?") ? "&" : "?"}v=${encodeURIComponent(member.updated_at || "")}`
    : member.photo;

  return (
    <>
      {/* Badge CARTE DE MEMBRE */}
      <div style={{
        position: "absolute", top: 118, left: 24,
        background: bordeaux, color: "#fff",
        padding: "8px 18px", borderRadius: 6,
        fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 16, letterSpacing: 2,
        boxShadow: "0 3px 6px rgba(0,0,0,.15)",
      }}>CARTE DE MEMBRE</div>

      {/* Photo */}
      <div style={{
        position: "absolute", top: 118, right: 24, width: 150, height: 190,
        borderRadius: 8, background: "#fff", border: `3px solid ${or}`,
        overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 10px rgba(0,0,0,.15)",
      }}>
        {photo ? (
          <img src={photo} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ color: bordeaux, fontWeight: 700, fontSize: 12, letterSpacing: 2 }}>PHOTO</span>
        )}
      </div>

      {/* Info fields */}
      <div style={{ position: "absolute", top: 176, left: 28, right: 200, display: "grid", gap: 8 }}>
        <Field label="NOM" value={clean(member.last_name).toUpperCase()} />
        <Field label="PRÉNOMS" value={clean(member.first_name).toUpperCase()} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="N° MEMBRE" value={clean(member.member_id)} mono />
          <Field label="ADHÉSION" value={fmtDate(member.registration_date)} />
        </div>
        <Field label="CAMPEMENT" value={clean(member.campement)} />
      </div>

      {/* QR bottom-left */}
      {qr && (
        <div style={{ position: "absolute", bottom: 46, right: 28, width: 78, height: 78, background: "#fff", padding: 4, borderRadius: 6, border: `2px solid ${or}` }}>
          <img src={qr} alt="" style={{ width: "100%", height: "100%" }} />
        </div>
      )}
    </>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const bordeaux = "#C4654A";
  const ink = "#2A1810";
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: bordeaux, letterSpacing: 1.2, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginTop: 1, fontFamily: mono ? "'JetBrains Mono', monospace" : undefined, lineHeight: 1.15 }}>{value || "—"}</div>
    </div>
  );
}

function BackBody({ member, qr, settings }: { member: DbMember; qr: string; settings: DbSettings }) {
  const bordeaux = "#C4654A";
  const or = "#D4A94C";
  const ink = "#2A1810";
  return (
    <>
      <div style={{ position: "absolute", top: 130, left: 32, right: 32, fontSize: 12, lineHeight: 1.55, color: ink, textAlign: "center" }}>
        Cette carte identifie un membre actif de l'Association des Chrétiens de Kouassikankro (AS.CHRIS.K). Sa présentation est requise pour toute opération liée aux cotisations, obsèques et prestations de l'association. En cas de perte, prévenir le secrétariat au {clean(settings.phone)}.
      </div>

      <div style={{ position: "absolute", bottom: 96, left: 32, display: "flex", alignItems: "center", gap: 14 }}>
        {qr && (
          <div style={{ width: 96, height: 96, background: "#fff", padding: 4, borderRadius: 6, border: `2px solid ${or}` }}>
            <img src={qr} alt="" style={{ width: "100%", height: "100%" }} />
          </div>
        )}
        <div>
          <div style={{ fontSize: 10, color: bordeaux, letterSpacing: 1.4, fontWeight: 700 }}>N° MEMBRE</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: ink }}>{clean(member.member_id)}</div>
          <div style={{ fontSize: 10, color: ink, marginTop: 4, opacity: 0.75 }}>Émise le {fmtDate(member.registration_date)}</div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 46, right: 32, textAlign: "center" }}>
        <div style={{ width: 180, borderTop: `1.5px solid ${bordeaux}`, paddingTop: 4, fontSize: 10, color: ink, letterSpacing: 1, fontWeight: 600 }}>
          COORDONNATEUR GÉNÉRAL
        </div>
      </div>
    </>
  );
}
