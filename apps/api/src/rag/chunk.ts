/**
 * Markdown を embedding 用のチャンクに分割する (引き継ぎドキュメント §12.2)。
 *
 * 見出し・空行で段落に割り、maxChars を超えないように貪欲に詰める。
 * 隣接チャンクに overlap 文字を重ねて、境界をまたぐ文脈の取りこぼしを減らす。
 * 純粋関数なので DB 非依存でテストできる。
 */
export type ChunkOptions = {
  maxChars?: number;
  overlap?: number;
};

export function chunkMarkdown(content: string, options: ChunkOptions = {}): string[] {
  const maxChars = options.maxChars ?? 600;
  const overlap = options.overlap ?? 80;

  // 空行で段落に分割し、前後の空白を落とす。
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let buffer = "";

  const flush = () => {
    if (buffer.trim().length > 0) chunks.push(buffer.trim());
  };

  for (const para of paragraphs) {
    // 単一段落が maxChars を超える場合は固定長で割る。
    if (para.length > maxChars) {
      flush();
      buffer = "";
      for (let i = 0; i < para.length; i += maxChars - overlap) {
        chunks.push(para.slice(i, i + maxChars));
      }
      continue;
    }
    if (buffer.length + para.length + 2 > maxChars) {
      flush();
      // overlap 分だけ前チャンク末尾を引き継ぐ。
      buffer = overlap > 0 ? buffer.slice(-overlap) : "";
    }
    buffer = buffer.length > 0 ? `${buffer}\n\n${para}` : para;
  }
  flush();

  return chunks;
}
