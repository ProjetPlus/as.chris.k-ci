import { useEffect, useState, forwardRef } from "react";
import QRCode from "qrcode";
import type { DbMember, DbSettings } from "@/db/database";
import { fullName } from "@/lib/memberWorkflow";
import { fmtDate } from "@/pages/pageUtils";
import logo from "@/assets/logo-aschrisk.png";
import flag from "@/assets/flag-civ.png";

// CR-80 landscape rendered at fixed pixel size for pixel-perfect html2canvas capture.
export const CARD_W_MM = 85.6;
export const CARD_H_MM = 53.98;
export const CARD_W_PX = 856;
export const CARD_H_PX = 540;

const clean = (v: unknown) => String(v ?? "").replace(/\//g, " ");

export const memberQrPayload = (member: Pick<DbMember, "member_id" | "first_name" | "last_name">) =>
  JSON.stringify({ member_id: clean(member.member_id), name: clean(fullName(member)) });

type Props = {
  member: DbMember;
  settings: DbSettings;
  side: "front" | "back";
  scale?: number;
};

// AS.CHRIS.K palette (from logo)
const BORDEAUX = "#7A1F2B";      // trunk color
const BORDEAUX_DARK = "#5A0F1D";
const OR = "#D4A94C";
const CREME = "#FAF5EE";
const CREME_2 = "#F3E4D5";
const INK = "#2A1810";
const BLUE_LABEL = "#0F3D6E";    // similar to reference card labels

export const MemberCard = forwardRef<HTMLDivElement, Props>(function MemberCard(
  { member, settings, side, scale = 1 },
  ref,
) {
  const [qr, setQr] = useState("");
  useEffect(() => {
    let m = true;
    QRCode.toDataURL(memberQrPayload(member), {
      margin: 1,
      width: 1024,
      errorCorrectionLevel: "H",
      color: { dark: "#000000", light: "#FFFFFF" },
    }).then((d) => m && setQr(d));
    return () => { m = false; };
  }, [member]);

  const assoc = clean(settings.association_name || "AS.CHRIS.K").toUpperCase();

  const wrapperStyle: React.CSSProperties = {
    width: CARD_W_PX,
    height: CARD_H_PX,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    background: CREME,
    color: INK,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    boxShadow: "0 12px 32px rgba(0,0,0,.14)",
  };

  return (
    <div ref={ref} style={wrapperStyle} data-side={side}>
      {/* Subtle guilloché-like corner */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 100% 0%, ${CREME_2} 0%, ${CREME_2} 28%, transparent 29%)`,
      }} />

      {/* Top header band */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 92,
        background: `linear-gradient(90deg, ${BORDEAUX_DARK} 0%, ${BORDEAUX} 100%)`,
      }} />
      <div style={{ position: "absolute", top: 92, left: 0, right: 0, height: 4, background: OR }} />

      {/* Header content */}
      <div style={{ position: "absolute", top: 10, left: 22, right: 22, display: "flex", alignItems: "center", gap: 14, height: 74 }}>
        <img src={logo} alt="" crossOrigin="anonymous" style={{ height: 72, width: 72, objectFit: "contain" }} />
        <div style={{ flex: 1, color: "#fff", lineHeight: 1.1 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 20, letterSpacing: 0.4 }}>{assoc}</div>
          <div style={{ fontSize: 10, opacity: 0.9, marginTop: 4, letterSpacing: 1.4 }}>MUTUELLE FUNÉRAIRE · CÔTE D'IVOIRE</div>
        </div>
        <img src={flag} alt="" crossOrigin="anonymous" style={{ height: 42, width: 62, objectFit: "cover", borderRadius: 3, border: "2px solid #fff", boxShadow: "0 2px 4px rgba(0,0,0,.2)" }} />
      </div>

      {side === "front" ? <FrontBody member={member} /> : <BackBody member={member} qr={qr} settings={settings} />}

      {/* Footer band */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 28,
        background: `linear-gradient(90deg, ${BORDEAUX} 0%, ${BORDEAUX_DARK} 100%)`,
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px",
        color: "#fff", fontSize: 10, letterSpacing: 1.6, fontWeight: 600,
      }}>
        <span>{side === "front" ? "CARTE OFFICIELLE DE MEMBRE" : "RÉPUBLIQUE DE CÔTE D'IVOIRE"}</span>
        <span>AS.CHRIS.K</span>
      </div>
    </div>
  );
});

function FrontBody({ member }: { member: DbMember }) {
  const photo = member.photo && !member.photo.startsWith("data:")
    ? `${member.photo}${member.photo.includes("?") ? "&" : "?"}v=${encodeURIComponent(member.updated_at || "")}`
    : member.photo;

  return (
    <>
      {/* Badge CARTE DE MEMBRE */}
      <div style={{
        position: "absolute", top: 110, left: 22,
        background: BORDEAUX, color: "#fff",
        padding: "7px 16px", borderRadius: 5,
        fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 15, letterSpacing: 2.4,
        boxShadow: "0 3px 6px rgba(0,0,0,.15)",
      }}>CARTE DE MEMBRE</div>

      {/* Photo box (top right) */}
      <div style={{
        position: "absolute", top: 108, right: 22, width: 140, height: 178,
        borderRadius: 6, background: "#fff", border: `3px solid ${OR}`,
        overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 10px rgba(0,0,0,.15)",
      }}>
        {photo ? (
          <img src={photo} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ color: BORDEAUX, fontWeight: 700, fontSize: 11, letterSpacing: 2 }}>PHOTO</span>
        )}
      </div>

      {/* Info block */}
      <div style={{ position: "absolute", top: 158, left: 26, right: 180, display: "grid", gap: 6 }}>
        <Row label="NOM" value={clean(member.last_name).toUpperCase()} />
        <Row label="PRÉNOMS" value={clean(member.first_name).toUpperCase()} />
        <Row label="N° MEMBRE" value={clean(member.member_id)} mono />
        <Row label="CAMPEMENT" value={clean(member.campement)} />
        <Row label="SOUS-PRÉF." value={clean(member.sous_prefecture)} />
        <Row label="TÉLÉPHONE" value={clean(member.phone)} />
        <Row label="ADHÉSION" value={fmtDate(member.registration_date)} />
      </div>

      {/* Signature (under photo) */}
      <div style={{
        position: "absolute", top: 296, right: 22, width: 140, textAlign: "center",
      }}>
        <div style={{ borderTop: `1px solid ${BORDEAUX}`, paddingTop: 4, fontSize: 9, color: INK, letterSpacing: 1, fontWeight: 700 }}>
          COORDONNATEUR GÉNÉRAL
        </div>
      </div>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", alignItems: "baseline", columnGap: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: BLUE_LABEL, letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: INK, fontFamily: mono ? "'JetBrains Mono', monospace" : undefined, lineHeight: 1.15 }}>{value || "—"}</div>
    </div>
  );
}

function BackBody({ member, qr, settings }: { member: DbMember; qr: string; settings: DbSettings }) {
  return (
    <>
      <div style={{
        position: "absolute", top: 112, left: 26, right: 26,
        fontSize: 11.5, lineHeight: 1.55, color: INK, textAlign: "justify",
      }}>
        Cette carte identifie un membre actif de l'Association des Chrétiens de Kouassikankro (AS.CHRIS.K).
        Sa présentation est requise pour toute opération liée aux cotisations, obsèques et prestations de
        l'association. En cas de perte, prévenir le secrétariat au {clean(settings.phone)}.
      </div>

      {/* Big QR on the left */}
      {qr && (
        <div style={{
          position: "absolute", bottom: 44, left: 26, width: 210, height: 210,
          background: "#fff", padding: 8, borderRadius: 8, border: `3px solid ${OR}`,
          boxShadow: "0 4px 10px rgba(0,0,0,.10)",
        }}>
          <img src={qr} alt="" style={{ width: "100%", height: "100%" }} />
        </div>
      )}

      {/* Member details on the right */}
      <div style={{ position: "absolute", bottom: 60, right: 26, width: 380, display: "grid", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: BLUE_LABEL, letterSpacing: 1.4, fontWeight: 700 }}>N° MEMBRE</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: BORDEAUX }}>{clean(member.member_id)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: BLUE_LABEL, letterSpacing: 1.4, fontWeight: 700 }}>TITULAIRE</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{clean(fullName(member)).toUpperCase()}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: BLUE_LABEL, letterSpacing: 1.2, fontWeight: 700 }}>ÉMISE LE</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: INK }}>{fmtDate(member.registration_date)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: BLUE_LABEL, letterSpacing: 1.2, fontWeight: 700 }}>STATUT</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: INK, textTransform: "capitalize" }}>{clean(member.status)}</div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: INK, opacity: 0.7, marginTop: 4 }}>
          Scanner ce QR code pour vérifier l'appartenance du membre.
        </div>
      </div>
    </>
  );
}
