import {
  Scene,
  Camera,
  Mesh,
  VertexBuffer,
  PBRMaterial,
  StandardMaterial,
  DynamicTexture,
  Vector3,
} from "@babylonjs/core";
type V = { x: number; y: number; z: number; u: number; v: number };
type Face = {
  p: V[];
  depth: number;
  color: string;
  texture?: CanvasImageSource;
  tw?: number;
  th?: number;
};
/** CPU geometry inspection of the same Babylon scene. No PBR/shadow parity is claimed. */
export class CompatibilityRenderer {
  private ctx: CanvasRenderingContext2D;
  private last = 0;
  frames = 0;
  triangles = 0;
  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    canvas.width = 640;
    canvas.height = 360;
  }
  render(scene: Scene, camera: Camera, now: number) {
    if (now - this.last < 140) return;
    this.last = now;
    const c = this.ctx,
      w = this.canvas.width,
      h = this.canvas.height;
    const f = h / (2 * Math.tan(camera.fov / 2));
    c.fillStyle = camera.position.y > 0 ? "#b9d0d4" : "#504f4c";
    c.fillRect(0, 0, w, h);
    const view = camera.getViewMatrix(true).m;
    const faces: Face[] = [];
    for (const mesh of scene.meshes) {
      if (
        !(mesh instanceof Mesh) ||
        !mesh.isEnabled() ||
        !mesh.isVisible ||
        mesh.visibility === 0 ||
        !mesh.material
      )
        continue;
      mesh.computeWorldMatrix();
      const mat = mesh.material;
      const bounds = mesh.getBoundingInfo().boundingBox;
      const center = bounds.centerWorld;
      if (
        Vector3.Distance(center, camera.position) >
        bounds.extendSizeWorld.length() + 55
      )
        continue;
      const p = mesh.getVerticesData(VertexBuffer.PositionKind),
        idx = mesh.getIndices();
      if (!p || !idx) continue;
      const uv = mesh.getVerticesData(VertexBuffer.UVKind),
        m = mesh.getWorldMatrix().m;
      const verts: V[] = new Array(p.length / 3);
      for (let j = 0; j < p.length; j += 3) {
        const x = p[j],
          y = p[j + 1],
          z = p[j + 2];
        const wx = m[0] * x + m[4] * y + m[8] * z + m[12],
          wy = m[1] * x + m[5] * y + m[9] * z + m[13],
          wz = m[2] * x + m[6] * y + m[10] * z + m[14];
        verts[j / 3] = {
          x: view[0] * wx + view[4] * wy + view[8] * wz + view[12],
          y: view[1] * wx + view[5] * wy + view[9] * wz + view[13],
          z: view[2] * wx + view[6] * wy + view[10] * wz + view[14],
          u: uv?.[(j / 3) * 2] ?? 0,
          v: uv?.[(j / 3) * 2 + 1] ?? 0,
        };
      }
      const base =
        mat instanceof PBRMaterial
          ? (mat.metadata?.baseColor ?? mat.albedoColor)
          : (mat as StandardMaterial).diffuseColor;
      const rawTexture =
        mat instanceof StandardMaterial
          ? mat.diffuseTexture
          : (mat as PBRMaterial).albedoTexture;
      const texture =
        rawTexture instanceof DynamicTexture ? rawTexture : undefined;
      const alpha = mat instanceof PBRMaterial ? mat.alpha : 1;
      if (alpha < 0.5) continue;
      for (let k = 0; k < idx.length; k += 3) {
        let poly = [verts[idx[k]], verts[idx[k + 1]], verts[idx[k + 2]]];
        if (poly.every((v) => v.z < 0.08) || poly.every((v) => v.z > 55))
          continue;
        const a = poly[0],
          b = poly[1],
          d = poly[2];
        const nx = (b.y - a.y) * (d.z - a.z) - (b.z - a.z) * (d.y - a.y),
          ny = (b.z - a.z) * (d.x - a.x) - (b.x - a.x) * (d.z - a.z),
          nz = (b.x - a.x) * (d.y - a.y) - (b.y - a.y) * (d.x - a.x);
        const nl = Math.hypot(nx, ny, nz) || 1;
        if (poly.some((v) => v.z < 0.08)) {
          const out: V[] = [];
          for (let q = 0; q < 3; q++) {
            const a = poly[q],
              b = poly[(q + 1) % 3];
            if (a.z >= 0.08) out.push(a);
            if (a.z >= 0.08 !== b.z >= 0.08) {
              const t = (0.08 - a.z) / (b.z - a.z);
              out.push({
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t,
                z: 0.08,
                u: a.u + (b.u - a.u) * t,
                v: a.v + (b.v - a.v) * t,
              });
            }
          }
          poly = out;
        }
        const screen = poly.map((v) => ({
          ...v,
          x: w / 2 + (v.x * f) / v.z,
          y: h / 2 - (v.y * f) / v.z,
        }));
        if (
          screen.every((v) => v.x < 0) ||
          screen.every((v) => v.x > w) ||
          screen.every((v) => v.y < 0) ||
          screen.every((v) => v.y > h)
        )
          continue;
        const shade =
          0.62 + 0.25 * Math.abs(ny / nl) + 0.12 * Math.max(0, -nz / nl);
        const color = `rgb(${Math.round(base.r * 255 * shade)},${Math.round(base.g * 255 * shade)},${Math.round(base.b * 255 * shade)})`;
        faces.push({
          p: screen,
          depth: poly.reduce((s, v) => s + v.z, 0) / poly.length,
          color,
          texture: texture?.getContext().canvas as
            CanvasImageSource | undefined,
          tw: texture?.getSize().width,
          th: texture?.getSize().height,
        });
      }
    }
    const output = c.getImageData(0, 0, w, h),
      pixels = output.data,
      depths = new Float32Array(w * h);
    depths.fill(Infinity);
    const textures = new Map<CanvasImageSource, ImageData>();
    for (const face of faces) {
      let tex: ImageData | undefined;
      if (face.texture) {
        tex = textures.get(face.texture);
        if (!tex) {
          const tc = (face.texture as HTMLCanvasElement).getContext("2d")!;
          tex = tc.getImageData(0, 0, face.tw!, face.th!);
          textures.set(face.texture, tex);
        }
      }
      const rgb = face.color.match(/\d+/g)!.map(Number);
      for (let fan = 1; fan < face.p.length - 1; fan++) {
        const [a, b, d] = [face.p[0], face.p[fan], face.p[fan + 1]];
        const den = (b.y - d.y) * (a.x - d.x) + (d.x - b.x) * (a.y - d.y);
        if (Math.abs(den) < 0.001) continue;
        const left = Math.max(0, Math.floor(Math.min(a.x, b.x, d.x))),
          right = Math.min(w - 1, Math.ceil(Math.max(a.x, b.x, d.x))),
          top = Math.max(0, Math.floor(Math.min(a.y, b.y, d.y))),
          bottom = Math.min(h - 1, Math.ceil(Math.max(a.y, b.y, d.y)));
        for (let y = top; y <= bottom; y++)
          for (let x = left; x <= right; x++) {
            const wa =
                ((b.y - d.y) * (x + 0.5 - d.x) +
                  (d.x - b.x) * (y + 0.5 - d.y)) /
                den,
              wb =
                ((d.y - a.y) * (x + 0.5 - d.x) +
                  (a.x - d.x) * (y + 0.5 - d.y)) /
                den,
              wc = 1 - wa - wb;
            if (wa < 0 || wb < 0 || wc < 0) continue;
            const inv = wa / a.z + wb / b.z + wc / d.z,
              z = 1 / inv,
              at = y * w + x;
            if (z >= depths[at]) continue;
            depths[at] = z;
            const offset = at * 4;
            if (tex) {
              const u =
                  ((wa * a.u) / a.z + (wb * b.u) / b.z + (wc * d.u) / d.z) * z,
                v =
                  ((wa * a.v) / a.z + (wb * b.v) / b.z + (wc * d.v) / d.z) * z,
                tx = Math.max(
                  0,
                  Math.min(tex.width - 1, Math.floor(u * tex.width)),
                ),
                ty = Math.max(
                  0,
                  Math.min(tex.height - 1, Math.floor((1 - v) * tex.height)),
                ),
                ti = (ty * tex.width + tx) * 4;
              pixels[offset] = tex.data[ti];
              pixels[offset + 1] = tex.data[ti + 1];
              pixels[offset + 2] = tex.data[ti + 2];
            } else {
              pixels[offset] = rgb[0];
              pixels[offset + 1] = rgb[1];
              pixels[offset + 2] = rgb[2];
            }
            pixels[offset + 3] = 255;
          }
      }
    }
    c.putImageData(output, 0, 0);
    this.frames++;
    this.triangles = faces.length;
  }
}
