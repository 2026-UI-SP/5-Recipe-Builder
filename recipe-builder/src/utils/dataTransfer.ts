import pako from "pako";

const STORAGE_KEYS = [
  "pantry",
  "shoppingList",
  "recipes",
  "mealPlan",
  "darkMode",
  "openrouter-api-key",
  "has-seen-help",
];

const CHUNK_SIZE = 2000;

export function exportAppData(): string[] {
  const data: Record<string, unknown> = {};
  for (const key of STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
  }

  const json = JSON.stringify(data);
  const compressed = pako.deflate(new TextEncoder().encode(json));
  const base64 = btoa(Array.from(compressed, (b) => String.fromCharCode(b)).join(""));

  // Split into chunks
  const totalChunks = Math.ceil(base64.length / CHUNK_SIZE);
  const chunks: string[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const slice = base64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    chunks.push(`${i + 1}/${totalChunks}:${slice}`);
  }
  return chunks;
}

export function parseChunk(raw: string): { part: number; total: number; data: string } | null {
  const match = raw.match(/^(\d+)\/(\d+):(.+)$/s);
  if (!match) return null;
  return { part: parseInt(match[1]), total: parseInt(match[2]), data: match[3] };
}

export function reassembleAndImport(chunks: string[]): boolean {
  // Parse and sort
  const parsed = chunks.map(parseChunk).filter((c): c is NonNullable<typeof c> => c !== null);
  if (parsed.length === 0) return false;

  const total = parsed[0].total;
  if (parsed.length !== total) return false;

  parsed.sort((a, b) => a.part - b.part);
  const base64 = parsed.map((c) => c.data).join("");

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decompressed = pako.inflate(bytes);
    const json = new TextDecoder().decode(decompressed);
    const data = JSON.parse(json) as Record<string, unknown>;

    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
    return true;
  } catch {
    return false;
  }
}
