// Berechnet die Figur für die Körpermaß-Grafik (components/body-chart.tsx) aus Größe, Gewicht und Körpermaßen.
// Alles in cm; gezeichnet wird in einer viewBox 0 0 200 445 (Scheitel bei y=18, Boden bei y=428).
// Fehlende Maße werden aus Größe und Gewicht geschätzt, damit die Figur auch mit wenigen Angaben passt.
// Abweichungen vom Durchschnitt werden leicht verstärkt (AMP), sonst sähe man sie auf dem kleinen Bild kaum.
import type { MEASUREMENTS } from "@lib/schema.mjs";

export type MeasureKey = keyof typeof MEASUREMENTS;
type Pt = [number, number];

const TOP = 18;
const FLOOR = 428;
const CX = 100;
const AMP = 1.25;
const REF_HEIGHT = 178;
const REF_BMI = 23;

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** Glatter Pfad durch die Punkte (Catmull-Rom als kubische Bézierkurven) */
function smooth(points: Pt[], closed = true): string {
  const n = points.length;
  const at = (i: number) => (closed ? points[(i + n) % n] : points[Math.min(n - 1, Math.max(0, i))]);
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? `${d} Z` : d;
}

/** Punkte auf einer kubischen Bézierkurve (für fließende Übergänge, die smooth() dann nachzeichnet) */
function bezier(p0: Pt, c1: Pt, c2: Pt, p1: Pt, steps: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    pts.push([
      k[0] * p0[0] + k[1] * c1[0] + k[2] * c2[0] + k[3] * p1[0],
      k[0] * p0[1] + k[1] * c1[1] + k[2] * c2[1] + k[3] * p1[1],
    ]);
  }
  return pts;
}

const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [2 * CX - x, y] as Pt);

export type Build = "schlank" | "durchschnittlich" | "athletisch" | "kräftig";

export type BodyShape = {
  /** Umrisse (rechte und linke Körperhälfte aus Betrachtersicht) */
  parts: string[];
  head: { cx: number; cy: number; rx: number; ry: number };
  /** feine Linien für Muskeln bzw. Bauch */
  details: string[];
  guides: Record<MeasureKey, { d: string; labelAt: Pt }>;
  /** Mitte des Rumpfs, dort steht das Gewicht */
  torsoCenter: Pt;
  build: Build;
};

export function bodyShape({
  measurements = {},
  heightCm,
  weightKg,
}: {
  measurements?: Record<string, number | undefined>;
  heightCm?: number;
  weightKg?: number;
}): BodyShape {
  const valid = (v: number | undefined, lo: number, hi: number) => (v !== undefined && v >= lo && v <= hi ? v : undefined);
  const H = valid(heightCm, 120, 230) ?? REF_HEIGHT;
  const weight = valid(weightKg, 30, 250);
  const bmi = weight ? weight / (H / 100) ** 2 : REF_BMI;
  const f = H / REF_HEIGHT;
  const b = Math.sqrt(bmi / REF_BMI);

  // Durchschnitt für diese Größe (neutral) und Schätzung für dieses Gewicht (ref)
  const neutral = { chest: 98 * f, waist: 84 * f, hips: 98 * f, shoulder: 46 * f, neck: 38 * f };
  const ref = {
    chest: neutral.chest * b,
    waist: neutral.waist * b ** 1.5, // die Taille wächst mit dem Gewicht am stärksten
    hips: neutral.hips * b,
    shoulder: neutral.shoulder * b ** 0.3,
    neck: neutral.neck * b ** 0.8,
  };
  const m = (k: MeasureKey, lo: number, hi: number) => valid(measurements[k], lo, hi);
  const real = {
    chest: m("chest", 50, 200) ?? ref.chest,
    waist: m("waist", 40, 200) ?? ref.waist,
    hips: m("hips", 50, 200) ?? ref.hips,
    shoulder: m("shoulder", 25, 80) ?? ref.shoulder,
    neck: m("neck", 25, 70) ?? ref.neck,
    inseam: m("inseam", 0.35 * H, 0.55 * H) ?? 0.455 * H,
    sleeve: m("sleeve", 0.25 * H, 0.45 * H) ?? 0.35 * H,
    foot: m("foot", 18, 35) ?? 0.15 * H,
  };
  // Zum Zeichnen Abweichungen vom Durchschnitt verstärken
  const draw = (k: keyof typeof neutral) => neutral[k] + (real[k] - neutral[k]) * AMP;

  // Statur: V-Form (Brust zu Taille) bei normalem Gewicht = athletisch, Taille ≥ Brust oder hoher BMI = kräftig
  const vShape = real.chest / real.waist;
  const muscle = clamp((vShape - 1.1) / 0.18) * clamp((bmi - 20) / 4);
  const fat = Math.max(clamp((real.waist / real.chest - 0.93) / 0.17), clamp((bmi - 27) / 6));
  const slim = clamp((21 - bmi) / 3);
  const build: Build = fat > 0.5 ? "kräftig" : muscle > 0.45 ? "athletisch" : slim > 0.5 ? "schlank" : "durchschnittlich";

  // Umfang -> sichtbare Breite von vorn (der Rumpf ist breiter als tief)
  const W = {
    neck: (draw("neck") / Math.PI) * 1.05,
    shoulder: draw("shoulder") * 0.98,
    chest: (draw("chest") / Math.PI) * 1.2,
    waist: (draw("waist") / Math.PI) * 1.16,
    hips: (draw("hips") / Math.PI) * 1.18,
  };
  const upperArm = 9.5 * f * (bmi / REF_BMI) ** 0.75 * (1 + 0.4 * muscle);
  const forearm = upperArm * 0.82;
  const wrist = 5.6 * f * (bmi / REF_BMI) ** 0.3;

  const s = (FLOOR - TOP) / H; // px pro cm
  const X = (cm: number) => CX + cm * s;
  const Y = (frac: number) => TOP + frac * (FLOOR - TOP);

  // Höhen als Anteil der Körpergröße
  const y = {
    chin: 0.125,
    neck: 0.158,
    shoulder: 0.185,
    armpit: 0.235,
    chest: 0.27,
    belly: 0.36,
    waist: 0.42,
    crotch: 1 - real.inseam / H,
    ankle: 0.955,
  };
  const hipY = Math.min(0.49, y.crotch - 0.035);
  const kneeY = y.crotch + (y.ankle - y.crotch) * 0.52;

  // ---------- Kopf und Rumpf (rechte Hälfte, dann gespiegelt) ----------
  const headW = 15.5 * f * (1 + 0.15 * fat);
  const head = { cx: CX, cy: Y(0.064), rx: (headW / 2) * s, ry: 0.064 * (FLOOR - TOP) };

  const shoulderTip = W.shoulder / 2 + upperArm * 0.15;
  const torsoRight: Pt[] = [
    // Der Hals beginnt im Kopf (der Kiefer ist schmaler als der Hals), sonst stünden oben Ecken heraus.
    // Hals -> Nacken -> Schulterrundung als eine durchgehende Kurve: erst senkrecht, dann flach zur Schulter
    ...bezier(
      [X(W.neck / 2 - 1), Y(y.chin - 0.02)],
      [X(W.neck / 2 + 0.3 + 0.4 * fat), Y(y.neck + 0.012)],
      [X(W.neck / 2 + (shoulderTip - W.neck / 2) * 0.35), Y(y.shoulder - 0.012 - 0.006 * muscle)],
      [X(shoulderTip - 2.5), Y(y.shoulder + 0.002)],
      5,
    ),
    ...bezier(
      [X(shoulderTip - 2.5), Y(y.shoulder + 0.002)],
      [X(shoulderTip - 0.4), Y(y.shoulder + 0.004)],
      [X(shoulderTip - 0.3), Y(y.shoulder + 0.012)],
      [X(shoulderTip - 0.9), Y(y.shoulder + 0.03)],
      3,
    ).slice(1),
    [X(Math.max(W.chest / 2, shoulderTip - upperArm * 0.55)), Y(y.armpit)],
    [X(W.chest / 2), Y(y.chest)],
    // Bauch: zwischen Brust und Taille, bei viel Bauch etwas nach außen
    [X((W.chest + (W.waist - W.chest) * 0.6) / 2 + fat * 1.5), Y(y.belly)],
    [X(W.waist / 2), Y(y.waist)],
    [X(W.hips / 2), Y(hipY)],
    [X(W.hips / 2 - 1), Y(y.crotch)],
    [X(0), Y(y.crotch + 0.005)],
  ];
  // Oben im Kopf beginnen, damit der Hals senkrecht aus dem Kopf kommt (sonst wölbt die Glättung ihn oben aus)
  const torso: Pt[] = [[X(0), Y(y.chin - 0.045)], ...torsoRight, ...mirror(torsoRight.slice(0, -1)).reverse()];

  // ---------- Beine ----------
  const thigh = W.hips / 2 + 0.5;
  const legCenterTop = W.hips / 4;
  const legCenterAnkle = Math.max(5.5 * f, legCenterTop * 0.82);
  const knee = 10.5 * f * (bmi / REF_BMI) ** 0.6;
  const calf = knee * (1.08 + 0.1 * muscle);
  const ankle = 6.6 * f * (bmi / REF_BMI) ** 0.3;
  const legAt = (t: number) => legCenterTop + (legCenterAnkle - legCenterTop) * t; // Mitte des Beins (t: Hüfte -> Knöchel)
  const legY = (t: number) => hipY + (y.ankle - hipY) * t;
  const tKnee = (kneeY - hipY) / (y.ankle - hipY);
  const tCrotch = (y.crotch - hipY) / (y.ankle - hipY);
  const legRight: Pt[] = [
    [X(W.hips / 2), Y(hipY)],
    [X(legAt(tCrotch + 0.08) + thigh * 0.48), Y(legY(tCrotch + 0.08))],
    [X(legAt(tKnee) + knee / 2), Y(kneeY)],
    [X(legAt(tKnee + 0.18) + calf / 2), Y(legY(tKnee + 0.18))],
    [X(legCenterAnkle + ankle / 2), Y(y.ankle)],
    [X(legCenterAnkle - ankle / 2), Y(y.ankle)],
    [X(legAt(tKnee + 0.2) - calf * 0.42), Y(legY(tKnee + 0.2))],
    [X(legAt(tKnee) - knee / 2), Y(kneeY)],
    [X(Math.max(0.3, legAt(tCrotch + 0.1) - thigh * 0.45)), Y(legY(tCrotch + 0.1))],
    [X(0.4), Y(y.crotch + 0.004)],
  ];
  // Schuh: Fußlänge bestimmt, wie weit er von vorn gesehen nach außen ragt
  const footOut = real.foot * 0.2;
  const shoeRight: Pt[] = [
    [X(legCenterAnkle - ankle / 2 - 0.5), Y(y.ankle - 0.004)],
    [X(legCenterAnkle + ankle / 2 + 0.5), Y(y.ankle - 0.004)],
    [X(legCenterAnkle + ankle / 2 + footOut), Y(0.993)],
    [X(legCenterAnkle + ankle / 2 + footOut - 0.5), Y(1)],
    [X(legCenterAnkle - ankle / 2 - 1.2), Y(1)],
  ];

  // ---------- Arme: hängen schräg, damit sie den Rumpf nicht schneiden ----------
  // Die Armkappe liegt über der Schulterrundung des Rumpfs (außen bündig, oben im Rumpf verdeckt), so entsteht keine Kerbe
  const joint: Pt = [shoulderTip - upperArm * 0.45, H * (y.shoulder + 0.03)];
  const clearAt = Math.max(W.waist, W.hips) / 2 + forearm / 2 + 1.2;
  const angle = Math.max(0.12, Math.atan2(clearAt - joint[0], hipY * H - joint[1]));
  const dir: Pt = [Math.sin(angle), Math.cos(angle)];
  const nrm: Pt = [Math.cos(angle), -Math.sin(angle)];
  const along = (t: number, w: number): Pt => {
    const ax = joint[0] + dir[0] * real.sleeve * t;
    const ay = joint[1] + dir[1] * real.sleeve * t;
    return [X(ax + nrm[0] * w), TOP + (ay + nrm[1] * w) * s];
  };
  const armWidths: [number, number][] = [
    [-0.05, upperArm * 0.28],
    [0.03, upperArm * 0.5],
    [0.22, (upperArm / 2) * (1 + 0.12 * muscle)],
    [0.47, forearm * 0.47],
    [0.62, forearm / 2],
    [1, wrist / 2],
  ];
  const armRight: Pt[] = [
    ...armWidths.map(([t, w]) => along(t, w)),
    ...armWidths
      .slice()
      .reverse()
      .map(([t, w]) => along(t, -w)),
  ];
  const handLen = 0.1 * H;
  const hand = [0.25, 0.6, 1].flatMap((t) => [along(1 + (t * handLen) / real.sleeve, (wrist / 2) * (1.12 - 0.3 * t))]);
  const handRight: Pt[] = [along(1, wrist / 2), ...hand, along(1 + (1.05 * handLen) / real.sleeve, 0), ...[0.6, 0.25].map((t) => along(1 + (t * handLen) / real.sleeve, -(wrist / 2) * (1.15 - 0.3 * t))), along(1, -wrist / 2)];

  const parts = [
    smooth(torso),
    smooth(legRight),
    smooth(mirror(legRight)),
    smooth(shoeRight),
    smooth(mirror(shoeRight)),
    smooth(armRight),
    smooth(mirror(armRight)),
    smooth(handRight),
    smooth(mirror(handRight)),
  ];

  // ---------- Details: Brustmuskeln bzw. Bauch ----------
  const details: string[] = [];
  if (muscle > 0.35) {
    const py = Y(y.chest + 0.03);
    const w = (W.chest / 2) * 0.75;
    details.push(smooth([[X(-w), py - 4], [X(-w * 0.45), py + 2], [X(-1), py - 1]], false));
    details.push(smooth([[X(1), py - 1], [X(w * 0.45), py + 2], [X(w), py - 4]], false));
    details.push(`M${X(0)} ${Y(y.chest + 0.05)} L${X(0)} ${Y(y.waist - 0.02)}`);
  }
  if (fat > 0.35) {
    const w = (W.waist / 2) * 0.7;
    details.push(smooth([[X(-w), Y(y.waist - 0.01)], [X(0), Y(y.waist + 0.012)], [X(w), Y(y.waist - 0.01)]], false));
  }

  // ---------- Messlinien ----------
  const across = (frac: number, halfCm: number): string => `M${X(-halfCm)} ${Y(frac)} L${X(halfCm)} ${Y(frac)}`;
  const right = (frac: number, halfCm: number): Pt => [X(halfCm) + 4, Y(frac)];
  const neckY = y.chin + 0.022;
  const shoulderY = y.shoulder + 0.012;
  const elbow = along(0.47, 0);
  const wristPt = along(1, 0);
  const shoulderPt = along(0, 0);
  // knapp außen am Arm entlang
  const sleeveOut = (p: Pt, w: number): Pt => [p[0] + nrm[0] * (w / 2 + 1.2) * s, p[1] + nrm[1] * (w / 2 + 1.2) * s];
  const [s0, s1, s2] = [sleeveOut(shoulderPt, upperArm), sleeveOut(elbow, forearm), sleeveOut(wristPt, wrist)];
  const inseamTop: Pt = [X(legAt(tCrotch) - thigh * 0.3), Y(y.crotch + 0.012)];
  const inseamBottom: Pt = [X(legCenterAnkle - ankle / 2), Y(0.995)];
  const footLeft = X(legCenterAnkle - ankle / 2 - 1.2);
  const footRight = X(legCenterAnkle + ankle / 2 + footOut);

  const guides: BodyShape["guides"] = {
    neck: {
      d: `M${X(-W.neck / 2)} ${Y(neckY)} Q${X(0)} ${Y(neckY) + 6} ${X(W.neck / 2)} ${Y(neckY)}`,
      labelAt: right(neckY, W.neck / 2),
    },
    shoulder: { d: across(shoulderY, shoulderTip - 0.5), labelAt: right(shoulderY, shoulderTip) },
    chest: { d: across(y.chest, W.chest / 2), labelAt: right(y.chest, W.chest / 2) },
    waist: { d: across(y.waist, W.waist / 2), labelAt: right(y.waist, W.waist / 2) },
    hips: { d: across(hipY, W.hips / 2), labelAt: right(hipY, W.hips / 2) },
    sleeve: {
      d: `M${s0[0].toFixed(1)} ${s0[1].toFixed(1)} Q${(2 * s1[0] - (s0[0] + s2[0]) / 2).toFixed(1)} ${(2 * s1[1] - (s0[1] + s2[1]) / 2).toFixed(1)} ${s2[0].toFixed(1)} ${s2[1].toFixed(1)}`,
      labelAt: [s1[0] + 4, s1[1]],
    },
    inseam: {
      d: `M${inseamTop[0].toFixed(1)} ${inseamTop[1].toFixed(1)} L${inseamBottom[0].toFixed(1)} ${inseamBottom[1].toFixed(1)}`,
      labelAt: [X(legAt(0.6) + knee / 2) + 4, Y(legY(0.6))],
    },
    foot: { d: `M${footLeft.toFixed(1)} 437 L${footRight.toFixed(1)} 437`, labelAt: [footRight + 4, 437] },
  };

  return {
    parts,
    head,
    details,
    guides,
    torsoCenter: [CX, (Y(y.chest) + Y(y.waist)) / 2 + 4],
    build,
  };
}
