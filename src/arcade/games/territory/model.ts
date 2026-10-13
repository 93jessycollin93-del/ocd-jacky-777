// Direction helpers shared by the rules and the bots. 0 right, 1 down, 2 left, 3 up.
export const DX = [1, 0, -1, 0];
export const DY = [0, 1, 0, -1];
export const opposite = (d: number) => (d + 2) & 3;
