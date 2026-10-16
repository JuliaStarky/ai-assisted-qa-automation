/**
 * Manual maintenance only — excluded from `npm test`.
 *
 * List programs (default):
 *   npm run test:manual:programs
 *
 * Delete first N programs (by list order from GET /api/programs):
 *   PROGRAMS_DELETE_COUNT=100 npm run test:manual:programs
 *
 * Delete all programs returned by GET:
 *   PROGRAMS_DELETE_ALL=1 npm run test:manual:programs
 *
 * Auth: DIDAXIS_API_TOKEN, or saved storageState from auth setup (Bearer captured on /programs).
 */
import fs from 'fs';
import path from 'path';
import { test, expect, type Page, type Request } from '@playwright/test';
import { goToPrograms } from '../../fixtures/didaxis.helpers';
import {
  deleteProgramById,
  fetchProgramIds,
  programsApiBaseUrl,
} from './lib/programs-api';

const baseUrl = programsApiBaseUrl();

async function resolveBearerToken(page: Page): Promise<string> {
  const envToken = process.env.DIDAXIS_API_TOKEN;
  if (envToken) {
    return envToken;
  }

  let sessionToken: string | undefined;
  const captureAuth = (request: Request) => {
    const auth = request.headers()['authorization'];
    if (auth?.startsWith('Bearer ')) {
      sessionToken = auth.slice('Bearer '.length);
    }
  };

  page.on('request', captureAuth);
  await goToPrograms(page);
  page.off('request', captureAuth);

  if (!sessionToken) {
    throw new Error(
      'No Bearer token captured on /programs. Run auth setup (npm test -- --project=setup) or set DIDAXIS_API_TOKEN.',
    );
  }
  return sessionToken;
}

function idsToDelete(programIds: string[]): string[] {
  const deleteAll = process.env.PROGRAMS_DELETE_ALL === '1' || process.env.PROGRAMS_DELETE_ALL === 'true';
  if (deleteAll) {
    return [...programIds];
  }

  const rawCount = process.env.PROGRAMS_DELETE_COUNT;
  if (!rawCount) {
    return [];
  }

  const count = Number.parseInt(rawCount, 10);
  if (!Number.isFinite(count) || count < 1) {
    throw new Error(`Invalid PROGRAMS_DELETE_COUNT: ${rawCount}`);
  }

  return programIds.slice(0, count);
}

function writeProgramIdsSnapshot(programIds: string[]): void {
  const outDir = path.resolve(process.cwd(), 'test-results');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'manual-program-ids.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify({ fetchedAt: new Date().toISOString(), count: programIds.length, ids: programIds }, null, 2),
  );
  console.log(`[programs-manual] Wrote ${programIds.length} id(s) to ${outPath}`);
}

test.describe.configure({ mode: 'serial' });

test('GET /api/programs — inventory and optional bulk delete', async ({ page }) => {
  const token = await resolveBearerToken(page);

  const programIds: string[] = await fetchProgramIds(token, baseUrl);
  console.log(`[programs-manual] GET /api/programs → ${programIds.length} program id(s)`);

  writeProgramIdsSnapshot(programIds);

  const targets = idsToDelete(programIds);
  if (targets.length === 0) {
    console.log(
      '[programs-manual] List-only run. To delete: PROGRAMS_DELETE_COUNT=100 or PROGRAMS_DELETE_ALL=1',
    );
    return;
  }

  console.log(`[programs-manual] Deleting ${targets.length} program(s)...`);

  const failures: string[] = [];
  let deleted = 0;

  for (const uuid of targets) {
    const status = await deleteProgramById(uuid, token, baseUrl);
    if (status === 200 || status === 404) {
      deleted += 1;
      console.log(`[programs-manual] DELETE ${uuid} → HTTP ${status}`);
    } else {
      failures.push(`${uuid}: HTTP ${status}`);
    }
  }

  console.log(`[programs-manual] Deleted ${deleted}/${targets.length} program(s)`);
  if (failures.length > 0) {
    throw new Error(`Delete failures: ${failures.join('; ')}`);
  }
});
