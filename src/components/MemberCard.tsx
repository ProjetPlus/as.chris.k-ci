import { useEffect, useState, forwardRef } from "react";
import QRCode from "qrcode";
import type { DbMember, DbSettings } from "@/db/database";
import { fullName } from "@/lib/memberWorkflow";
import { fmtDate } from "@/pages/pageUtils";
import { OFFICIAL_ASCHRISK_LOGO_URL } from "@/assets/aschriskOfficialLogo";
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

// AS.CHRIS.K palette (extracted from the official logo)
const BORDEAUX = "#7A1F2B";
const BORDEAUX_DARK = "#571018";
const OR = "#D4A94C";
const GREEN = "#16895A";
const BLUE = "#0B6EA8";
const BLUE_LABEL = "#0F3D6E";
const CREME = "#FBF7F1";
const CREME_2 = "#F0E3D2";
const INK = "#241410";

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
    background: `linear-gradient(160deg, #FFFFFF 0%, ${CREME} 45%, ${CREME_2} 100%)`,
    color: INK,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
    borderRadius: 20,
    boxShadow: "0 12px 32px rgba(0,0,0,.14)",
  };

  return (
    <div ref={ref} style={wrapperStyle} data-side={side}>
      {/* Guilloché-style security lines */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.07,
        backgroundImage: `repeating-linear-gradient(115deg, ${BORDEAUX} 0 1px, transparent 1px 9px)`,
      }} />
      {/* Bordeaux left spine */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 12, background: `linear-gradient(180deg, ${BORDEAUX_DARK}, ${BORDEAUX} 45%, ${OR})` }} />

      {/* Header */}
      <div style={{ position: "absolute", top: 0, left: 12, right: 0, height: 116, background: "linear-gradient(90deg, #FFFFFF 0%, #FFFFFF 60%, rgba(255,255,255,0) 100%)" }} />
      <div style={{ position: "absolute", top: 12, left: 28, right: 24, height: 92, display: "flex", alignItems: "center", gap: 16 }}>
        <img src={OFFICIAL_ASCHRISK_LOGO_URL} alt="" crossOrigin="anonymous" style={{ height: 92, width: 90, objectFit: "contain", background: "transparent" }} />
        <div style={{ flex: 1, lineHeight: 1.08 }}>
          <div style={{ fontWeight: 900, fontSize: 30, color: BORDEAUX_DARK, letterSpacing: 1 }}>{assoc}</div>
          <div style={{ fontWeight: 800, fontSize: 12.5, color: BLUE_LABEL, marginTop: 5, letterSpacing: 0.4 }}>
            ASSOCIATION DES CHRÉTIENS DE KOUASSIKANKRO
          </div>
          <div style={{ fontSize: 9.5, color: GREEN, marginTop: 3, letterSpacing: 1.5, fontWeight: 800 }}>
            MUTUELLE FUNÉRAIRE · CÔTE D'IVOIRE
          </div>
        </div>
        <img src={flag} alt="" crossOrigin="anonymous" style={{ height: 58, width: 88, objectFit: "cover", borderRadius: 4, border: `2px solid ${OR}` }} />
      </div>
      <div style={{ position: "absolute", top: 116, left: 12, right: 0, height: 7, background: `linear-gradient(90deg, ${BORDEAUX_DARK}, ${OR} 40%, ${GREEN} 72%, ${BLUE})` }} />

      {side === "front" ? <FrontBody member={member} /> : <BackBody member={member} qr={qr} settings={settings} />}

      {/* Footer */}
      <div style={{
        position: "absolute", bottom: 0, left: 12, right: 0, height: 26,
        background: `linear-gradient(90deg, ${BORDEAUX_DARK} 0%, ${BORDEAUX} 70%, ${OR} 100%)`,
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px",
        color: "#FFFFFF", fontSize: 9.5, letterSpacing: 1.8, fontWeight: 700,
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
      {/* Title banner */}
      <div style={{
        position: "absolute", top: 136, left: 28,
        background: `linear-gradient(90deg, ${BORDEAUX_DARK}, ${BORDEAUX})`, color: "#FFFFFF",
        padding: "9px 26px", borderRadius: 3,
        fontWeight: 900, fontSize: 26, letterSpacing: 2,
      }}>CARTE DE MEMBRE</div>

      {/* Photo */}
      <div style={{
        position: "absolute", top: 138, right: 30, width: 176, height: 220,
        borderRadius: 6, background: "#E8E6E1", border: `3px solid ${BLUE}`,
        overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {photo ? (
          <img src={photo} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ color: BORDEAUX, fontWeight: 800, fontSize: 13, letterSpacing: 2 }}>PHOTO</span>
        )}
      </div>

      {/* Identity rows */}
      <div style={{ position: "absolute", top: 200, left: 30, right: 240, display: "grid", gap: 7 }}>
        <Row label="NOM" value={clean(member.last_name).toUpperCase()} strong />
        <Row label="PRÉNOMS" value={clean(member.first_name).toUpperCase()} strong />
        <Row label="N° MEMBRE" value={clean(member.member_id)} mono />
        <Row label="CAMPEMENT" value={clean(member.campement)} />
        <Row label="SOUS-PRÉF." value={clean(member.sous_prefecture)} />
        <Row label="TÉLÉPHONE" value={clean(member.phone)} />
        <Row label="ADHÉSION" value={fmtDate(member.registration_date)} />
      </div>

      {/* Signature under photo */}
      <div style={{ position: "absolute", top: 372, right: 30, width: 176, textAlign: "center" }}>
        <div style={{ fontSize: 8.5, color: BLUE_LABEL, letterSpacing: 1.2, fontWeight: 800 }}>COORDONNATEUR GÉNÉRAL</div>
        <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Brush Script MT', cursive", fontSize: 24, color: BORDEAUX_DARK }}>
          AS.CHRIS.K
        </div>
        <div style={{ borderTop: `1.5px solid ${BORDEAUX}` }} />
      </div>
    </>
  );
}

function Row({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "132px 1fr", alignItems: "baseline", columnGap: 10 }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: BLUE_LABEL, letterSpacing: 0.4 }}>{label} :</div>
      <div style={{
        fontSize: strong ? 17 : 15, fontWeight: strong ? 900 : 700, color: INK,
        fontFamily: mono ? "'JetBrains Mono', monospace" : undefined, lineHeight: 1.15,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{value || "—"}</div>
    </div>
  );
}

function BackBody({ member, qr, settings }: { member: DbMember; qr: string; settings: DbSettings }) {
  return (
    <>
      <div style={{
        position: "absolute", top: 140, left: 34, right: 30,
        fontSize: 11.5, lineHeight: 1.5, color: INK, textAlign: "justify",
      }}>
        Cette carte identifie un membre actif de l'Association des Chrétiens de Kouassikankro (AS.CHRIS.K).
        Sa présentation est requise pour toute opération liée aux cotisations, obsèques et prestations de
        l'association. En cas de perte, prévenir le secrétariat au {clean(settings.phone)}.
      </div>

      {/* Large QR */}
      {qr && (
        <div style={{
          position: "absolute", top: 216, left: 34, width: 288, height: 288,
          background: "#FFFFFF", padding: 6, borderRadius: 6, border: `3px solid ${OR}`,
        }}>
          <img src={qr} alt="" style={{ width: "100%", height: "100%", display: "block" }} />
        </div>
      )}

      <div style={{ position: "absolute", top: 220, right: 30, width: 456, display: "grid", gap: 14 }}>
        <Field label="N° MEMBRE" value={clean(member.member_id)} mono big />
        <Field label="TITULAIRE" value={clean(fullName(member)).toUpperCase()} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="ÉMISE LE" value={fmtDate(member.registration_date)} small />
          <Field label="STATUT" value={clean(member.status).toUpperCase()} small />
        </div>
        <div style={{ fontSize: 10, color: INK, opacity: 0.65 }}>
          Scanner le QR code pour vérifier l'appartenance du membre.
        </div>
      </div>
    </>
  );
}

function Field({ label, value, mono, big, small }: { label: string; value: string; mono?: boolean; big?: boolean; small?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: BLUE_LABEL, letterSpacing: 1.4, fontWeight: 800 }}>{label}</div>
      <div style={{
        fontSize: big ? 22 : small ? 12.5 : 16, fontWeight: 800, color: big ? BORDEAUX : INK,
        fontFamily: mono ? "'JetBrains Mono', monospace" : undefined, marginTop: 2,
      }}>{value || "—"}</div>
    </div>
  );
}
