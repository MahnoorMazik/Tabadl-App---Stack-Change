export function documentMimeMatchesDeclared(buffer: Buffer, declaredMime: string): boolean {
  if (declaredMime === "application/pdf") {
    return buffer.length >= 5 && buffer.slice(0, 5).toString("utf8") === "%PDF-";
  }

  if (declaredMime === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (declaredMime === "image/jpeg" || declaredMime === "image/jpg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  return true;
}
