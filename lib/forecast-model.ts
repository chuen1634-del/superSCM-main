export type CoverageInput = { trainWindowOk: boolean | null; testWindowOk: boolean | null };
export type CoverageStatus = 'READY' | 'INVALID' | 'UNCONFIGURED';

export function coverageStatus(input: CoverageInput): CoverageStatus {
  if (input.trainWindowOk === null || input.testWindowOk === null) return 'UNCONFIGURED';
  return input.trainWindowOk && input.testWindowOk ? 'READY' : 'INVALID';
}
