function rotate(mat: number[][]): number[][] {
  const n = mat.length;
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => mat[n - 1 - c][r]),
  );
}

function mirror(mat: number[][]): number[][] {
  return mat.map((row) => row.slice().reverse());
}

function canonicalize(mat: number[][]): string {
  const map = new Map<number, number>();
  let next = 0;
  return mat
    .map((row) =>
      row
        .map((id) => {
          if (!map.has(id)) map.set(id, next++);
          return map.get(id);
        })
        .join(","),
    )
    .join(";");
}

export function puzzleSignature(regions: number[][]): string {
  const forms = [regions];
  let cur = regions;
  for (let i = 0; i < 3; i++) {
    cur = rotate(cur);
    forms.push(cur);
  }
  for (const form of [...forms]) forms.push(mirror(form));
  return forms.map(canonicalize).sort()[0];
}
