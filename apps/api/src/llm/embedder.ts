/**
 * Embedding 抽象 (引き継ぎドキュメント §12.1)。
 *
 * RAG の埋め込み生成を Provider 差分から切り離す。
 * 本リポジトリは mock を既定とし、API キーなしで RAG を学べるようにする。
 */
export interface Embedder {
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

export const EMBEDDING_DIM = 1536;

/**
 * 決定的な mock Embedder。
 *
 * 文字バイグラムをハッシュして 1536 次元のバケットへ加算し、L2 正規化する。
 * 同じ語を共有するテキスト同士の cosine 類似度が高くなるため、
 * 外部 API なしでも「意味の近さ」をそれらしく再現でき、RAG の動作を学べる。
 */
export class MockEmbedder implements Embedder {
  readonly dimensions = EMBEDDING_DIM;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => embedOne(t, this.dimensions));
  }
}

function embedOne(text: string, dim: number): number[] {
  const vec = new Array<number>(dim).fill(0);
  for (const token of tokens(text)) {
    const h = hash(token);
    const idx = h % dim;
    // 符号もハッシュから決め、打ち消し合いで情報量を増やす。
    vec[idx]! += (h & 1) === 0 ? 1 : -1;
  }
  // L2 正規化（ゼロベクトルはそのまま返す）。
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

/** 空白区切りの語 + 文字バイグラム。日本語でも重なりが出るようにする。 */
function tokens(text: string): string[] {
  const normalized = text.toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  const bigrams: string[] = [];
  const compact = normalized.replace(/\s+/g, "");
  for (let i = 0; i < compact.length - 1; i++) {
    bigrams.push(compact.slice(i, i + 2));
  }
  return [...words, ...bigrams];
}

/** 決定的な FNV-1a ハッシュ（32bit, 非負）。 */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** number[] を pgvector のリテラル文字列 '[v1,v2,...]' に変換する。 */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

/** Embedder ファクトリ。現状は mock 固定（#4 の方針）。openai は将来追加。 */
export function createEmbedder(): Embedder {
  return new MockEmbedder();
}

/** アプリ全体で共有する Embedder。 */
export const embedder: Embedder = createEmbedder();
