import { gzipSync } from "node:zlib";

/** A gzipped tarball like GitHub's: a global pax header carrying the commit, then regular files under "<owner>-<repo>-<sha>/". */
export function makeTarball(files: Record<string, string>, commit: string, top = "acme-app-" + commit.slice(0, 7)): Buffer {
  const blocks: Buffer[] = [];
  const header = (name: string, size: number, type: string) => {
    const h = Buffer.alloc(512);
    h.write(name, 0, 100, "utf8");
    h.write("0000644\0", 100);
    h.write("0000000\0", 108);
    h.write("0000000\0", 116);
    h.write(size.toString(8).padStart(11, "0") + "\0", 124);
    h.write("00000000000\0", 136);
    h.write("        ", 148); // checksum placeholder
    h.write(type, 156);
    h.write("ustar\0", 257);
    h.write("00", 263);
    let sum = 0;
    for (const b of h) sum += b;
    h.write(sum.toString(8).padStart(6, "0") + "\0 ", 148);
    return h;
  };
  const add = (name: string, data: Buffer, type: string) => {
    blocks.push(header(name, data.length, type), data, Buffer.alloc((512 - (data.length % 512)) % 512));
  };
  add("pax_global_header", Buffer.from(`52 comment=${commit}\n`), "g");
  for (const [path, text] of Object.entries(files)) add(`${top}/${path}`, Buffer.from(text, "utf8"), "0");
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}
