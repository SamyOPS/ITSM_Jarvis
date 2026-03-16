import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function parseLine(line: string): [string, string] | null {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine.startsWith('#')) {
    return null;
  }

  const separatorIndex = trimmedLine.indexOf('=');

  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmedLine.slice(0, separatorIndex).trim();
  const value = trimmedLine.slice(separatorIndex + 1).trim();

  if (!key) {
    return null;
  }

  return [key, value];
}

export function loadEnvFile(): void {
  const envFilePath = join(process.cwd(), '.env');

  if (!existsSync(envFilePath)) {
    return;
  }

  const fileContent = readFileSync(envFilePath, 'utf-8');

  for (const line of fileContent.split(/\r?\n/)) {
    const parsedEntry = parseLine(line);

    if (!parsedEntry) {
      continue;
    }

    const [key, value] = parsedEntry;

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
