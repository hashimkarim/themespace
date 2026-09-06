import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
const size = 96,
  data = Buffer.alloc(size * (size * 4 + 1));
function inBox(x, y, left, top, right, bottom, r) {
  const dx = Math.max(left + r - x, 0, x - (right - r)),
    dy = Math.max(top + r - y, 0, y - (bottom - r));
  return (
    x >= left &&
    x <= right &&
    y >= top &&
    y <= bottom &&
    dx * dx + dy * dy <= r * r
  );
}
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    let c = [0, 0, 0, 0];
    if (inBox(x, y, 10, 8, 66, 65, 16)) c = [165, 156, 216, 255];
    if (inBox(x, y, 28, 28, 88, 88, 17)) c = [255, 255, 255, 255];
    if (inBox(x, y, 33, 33, 83, 83, 12)) c = [107, 99, 169, 255];
    for (let i = 0; i < 4; i++) data[y * (size * 4 + 1) + 1 + x * 4 + i] = c[i];
  }
function crc(buf) {
  let crc = 0xffffffff;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name, value) {
  const type = Buffer.from(name),
    payload = Buffer.concat([type, value]),
    size = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  size.writeUInt32BE(value.length);
  checksum.writeUInt32BE(crc(payload));
  return Buffer.concat([size, payload, checksum]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 6;
writeFileSync(
  "public/favicon.png",
  Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(data)),
    chunk("IEND", Buffer.alloc(0)),
  ]),
);
