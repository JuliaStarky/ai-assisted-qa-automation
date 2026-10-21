import type { TestInfo } from '@playwright/test';
import type { Result, NodeResult } from 'axe-core';

function formatNode(node: NodeResult): string {
  const target = Array.isArray(node.target) ? node.target.join(' ') : String(node.target);
  return `    ${target}${node.failureSummary ? `\n      ${node.failureSummary.trim()}` : ''}`;
}

export function formatAxeViolationsSummary(violations: Result[]): string {
  if (violations.length === 0) {
    return 'No WCAG violations reported.';
  }

  return violations
    .map((v) => {
      const nodes = v.nodes.map(formatNode).join('\n');
      return `[${v.impact ?? 'unknown'}] ${v.id}: ${v.help}\n${v.helpUrl}\n${nodes}`;
    })
    .join('\n\n');
}

/** Records a11y findings in the HTML/GitHub report without failing the test. */
export async function reportA11yFinding(
  testInfo: TestInfo,
  title: string,
  details: string,
  attachment?: { name: string; body: string; contentType: string },
): Promise<void> {
  const description = `${title}: ${details.split('\n')[0]}`.slice(0, 800);
  testInfo.annotations.push({ type: 'warning', description });

  try {
    await testInfo.attach(`${title}.txt`, {
      body: details,
      contentType: 'text/plain',
    });
    if (attachment) {
      await testInfo.attach(attachment.name, {
        body: attachment.body,
        contentType: attachment.contentType,
      });
    }
  } catch {
    testInfo.skip(true, `Could not attach a11y report for "${title}"`);
  }
}

export async function reportAxeViolations(testInfo: TestInfo, violations: Result[]): Promise<void> {
  const summary = formatAxeViolationsSummary(violations);
  await reportA11yFinding(testInfo, 'axe-violations', summary, {
    name: 'axe-violations.json',
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json',
  });
}
