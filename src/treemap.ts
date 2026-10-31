// Squarified treemap (Bruls, Huizing, van Wijk). Input must be sorted by value, descending.
export interface Placed<T> {
  item: T;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function squarify<T>(items: { item: T; value: number }[], W: number, H: number): Placed<T>[] {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return [];
  const scale = (W * H) / total;
  const nodes = items.map((i) => ({ item: i.item, area: i.value * scale }));
  const out: Placed<T>[] = [];

  const worst = (areas: number[], side: number): number => {
    const s = areas.reduce((a, b) => a + b, 0);
    const max = Math.max(...areas);
    const min = Math.min(...areas);
    return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
  };

  let x = 0;
  let y = 0;
  let w = W;
  let h = H;
  let i = 0;
  while (i < nodes.length) {
    const side = Math.min(w, h);
    const row = [nodes[i++]];
    while (i < nodes.length) {
      const cur = row.map((n) => n.area);
      if (worst([...cur, nodes[i].area], side) > worst(cur, side)) break;
      row.push(nodes[i++]);
    }
    const sum = row.reduce((s, n) => s + n.area, 0);
    if (w >= h) {
      // Lay the row as a column on the left edge.
      const colW = sum / h;
      let cy = y;
      for (const n of row) {
        const nh = n.area / colW;
        out.push({ item: n.item, x, y: cy, w: colW, h: nh });
        cy += nh;
      }
      x += colW;
      w -= colW;
    } else {
      const rowH = sum / w;
      let cx = x;
      for (const n of row) {
        const nw = n.area / rowH;
        out.push({ item: n.item, x: cx, y, w: nw, h: rowH });
        cx += nw;
      }
      y += rowH;
      h -= rowH;
    }
  }
  return out;
}

export type Dir = 'left' | 'right' | 'up' | 'down';

// Nearest tile centre in a direction; perpendicular drift is penalised so focus tracks rows/columns.
export function neighbour<T>(tiles: Placed<T>[], from: number, dir: Dir): number {
  const a = tiles[from];
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  let best = from;
  let bestScore = Infinity;
  tiles.forEach((t, idx) => {
    if (idx === from) return;
    const dx = t.x + t.w / 2 - ax;
    const dy = t.y + t.h / 2 - ay;
    const along = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
    if (along <= 0.01) return;
    const across = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
    const score = along + across * 2;
    if (score < bestScore) {
      bestScore = score;
      best = idx;
    }
  });
  return best;
}
