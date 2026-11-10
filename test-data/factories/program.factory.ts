import { faker } from '@faker-js/faker';

export type ProgramDraft = {
  name: string;
  description: string;
};

/** Happy-path program fields. The suffix keeps the name unique across workers. */
export function buildProgram(overrides: Partial<ProgramDraft> = {}): ProgramDraft {
  const suffix = faker.string.alphanumeric(8);
  return {
    name: overrides.name ?? `Web Development ${suffix}`,
    description: overrides.description ?? faker.lorem.sentence(),
  };
}
