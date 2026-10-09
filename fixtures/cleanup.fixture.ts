import { test as base, expect, type Request } from '@playwright/test';

const baseUrl = process.env.DIDAXIS_URL ?? 'https://test.didaxis.studio';

const programsToDelete = new Set<string>();
let sessionBearerToken: string | undefined;

export type TrackProgram = (uuid: string) => void;

function captureBearerFromRequest(request: Request) {
  const auth = request.headers()['authorization'];
  if (auth?.startsWith('Bearer ')) {
    sessionBearerToken = auth.slice('Bearer '.length);
  }
}

export const test = base.extend<{ trackProgram: TrackProgram; _authForCleanup: void }>({
  _authForCleanup: [
    async ({ page }, use) => {
      page.on('request', captureBearerFromRequest);
      await use();
      page.off('request', captureBearerFromRequest);
    },
    { auto: true },
  ],

  trackProgram: async ({}, use) => {
    await use((uuid: string) => {
      if (!uuid) {
        throw new Error('trackProgram: uuid is required');
      }
      programsToDelete.add(uuid);
    });
  },
});

export { expect };

async function deleteTrackedPrograms(): Promise<void> {
  if (programsToDelete.size === 0) {
    return;
  }

  const token = process.env.DIDAXIS_API_TOKEN ?? sessionBearerToken;
  if (!token) {
    console.warn('[api-cleanup] Skipping delete: set DIDAXIS_API_TOKEN or log in so a Bearer token is captured');
    return;
  }

  const uuids = [...programsToDelete];
  const failures: string[] = [];

  for (const uuid of uuids) {
    const response = await fetch(`${baseUrl}/api/programs/${uuid}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok || response.status === 404) {
      programsToDelete.delete(uuid);
      console.log(`[api-cleanup] DELETE ${uuid} → HTTP ${response.status}`);
    } else {
      failures.push(`${uuid}: HTTP ${response.status}`);
    }
  }

  if (failures.length > 0) {
    console.warn(`[api-cleanup] Failed to delete: ${failures.join(', ')}`);
  } else {
    console.log(`[api-cleanup] Deleted ${uuids.length} program(s)`);
  }
}

test.afterAll(async () => {
  await deleteTrackedPrograms();
});
