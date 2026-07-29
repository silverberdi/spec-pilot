import type { SecretDetectorId, SecretFindingDto } from '@specpilot/shared-contracts';
import {
  SECRET_DETECTOR_IDS,
  SECRET_SCAN_ENTROPY_MAX_POSITIVES_PER_FILE,
  SECRET_SCAN_ENTROPY_MIN_LENGTH,
  SECRET_SCAN_ENTROPY_THRESHOLD,
} from '@specpilot/shared-contracts';

const PATTERN_DETECTORS: ReadonlyArray<{
  detectorId: Exclude<SecretDetectorId, 'high_entropy_token'>;
  pattern: RegExp;
}> = [
  { detectorId: 'aws_access_key', pattern: /AKIA[0-9A-Z]{16}/g },
  {
    detectorId: 'generic_api_key_assignment',
    pattern:
      /(api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"\r\n]{12,}['"]/gi,
  },
  {
    detectorId: 'private_key_block',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
  { detectorId: 'github_pat', pattern: /ghp_[A-Za-z0-9]{36}/g },
  { detectorId: 'slack_token', pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
];

const ENTROPY_CANDIDATE = /[A-Za-z0-9+/=_-]{32,}/g;

const DETECTOR_ORDER = new Map<SecretDetectorId, number>(
  SECRET_DETECTOR_IDS.map((id, index) => [id, index]),
);

export function shannonEntropy(token: string): number {
  if (token.length === 0) {
    return 0;
  }
  const freq = new Map<string, number>();
  for (const ch of token) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  let entropy = 0;
  const len = token.length;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Detect secrets in text. Returns path+detectorId only — never match text.
 */
export function detectSecretsInText(
  path: string,
  text: string,
): SecretFindingDto[] {
  const found = new Set<SecretDetectorId>();

  for (const detector of PATTERN_DETECTORS) {
    detector.pattern.lastIndex = 0;
    if (detector.pattern.test(text)) {
      found.add(detector.detectorId);
    }
  }

  let entropyPositives = 0;
  ENTROPY_CANDIDATE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ENTROPY_CANDIDATE.exec(text)) !== null) {
    const token = match[0];
    if (token.length < SECRET_SCAN_ENTROPY_MIN_LENGTH) {
      continue;
    }
    if (shannonEntropy(token) >= SECRET_SCAN_ENTROPY_THRESHOLD) {
      found.add('high_entropy_token');
      entropyPositives += 1;
      if (entropyPositives >= SECRET_SCAN_ENTROPY_MAX_POSITIVES_PER_FILE) {
        break;
      }
    }
  }

  return [...found]
    .sort(
      (a, b) => (DETECTOR_ORDER.get(a) ?? 99) - (DETECTOR_ORDER.get(b) ?? 99),
    )
    .map((detectorId) => ({ path, detectorId }));
}

export function sortFindings(findings: SecretFindingDto[]): SecretFindingDto[] {
  return findings.slice().sort((a, b) => {
    if (a.path < b.path) {
      return -1;
    }
    if (a.path > b.path) {
      return 1;
    }
    return (
      (DETECTOR_ORDER.get(a.detectorId) ?? 99) -
      (DETECTOR_ORDER.get(b.detectorId) ?? 99)
    );
  });
}
