import {
  YosemiteDecimal,
  VScale,
  WI,
} from '@openbeta/sandbag';                         // :contentReference[oaicite:0]{index=0}

export type ClimbKind = 'sport' | 'trad' | 'tr' | 'boulder' | 'ice';

/** low-to-high numeric span for a single grade string */
export function scoreRangeForGrade(
  grade: string,
  kind: ClimbKind,
): [number, number] {
  const scale =
    kind === 'boulder' ? VScale
  : kind === 'ice'     ? WI
                       : YosemiteDecimal;

  const rng = scale.getScore(grade);
  if (!rng?.length) throw new Error(`Bad grade: ${grade}`);
  return [rng[0], rng[1]];
}

/** average – handy when you just need one number */
export function scoreForGrade(
  grade: string,
  kind: ClimbKind,
): number {
  const [lo, hi] = scoreRangeForGrade(grade, kind);
  return (lo + hi) / 2;
}
