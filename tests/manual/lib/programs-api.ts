const defaultBaseUrl = 'https://test.didaxis.studio';

export function programsApiBaseUrl(): string {
  return process.env.DIDAXIS_URL ?? defaultBaseUrl;
}

export type ProgramsListResponse = {
  data?: unknown;
};

export function parseProgramIdsFromListResponse(body: ProgramsListResponse): string[] {
  const { data } = body;
  if (!Array.isArray(data)) {
    return [];
  }

  const ids: string[] = [];
  for (const item of data) {
    if (item && typeof item === 'object' && 'id' in item && typeof (item as { id: unknown }).id === 'string') {
      ids.push((item as { id: string }).id);
    }
  }
  return ids;
}

export async function fetchProgramIds(token: string, baseUrl = programsApiBaseUrl()): Promise<string[]> {
  const response = await fetch(`${baseUrl}/api/programs`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GET /api/programs failed: HTTP ${response.status} ${text}`);
  }

  const body = (await response.json()) as ProgramsListResponse;
  return parseProgramIdsFromListResponse(body);
}

export async function deleteProgramById(
  uuid: string,
  token: string,
  baseUrl = programsApiBaseUrl(),
): Promise<number> {
  const response = await fetch(`${baseUrl}/api/programs/${uuid}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.status;
}
