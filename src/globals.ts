export const WIDTH = 1024;
export const HEIGHT = 768;
export const TICK_MS = 33;

export const enum KeyCode {
    Left = 37,
    Up = 38,
    Right = 39,
    Down = 40,
}

export const enum Bool { False, True }
export const False = Bool.False;
export const True = Bool.True;

export type Vec2 = [number, number];

export let globalKeysDown: {[keyCode: number]: Bool} = {};
document.onkeydown = e => globalKeysDown[e.which] = True;
document.onkeyup = e => globalKeysDown[e.which] = False;

export let lerp = (a: number, b: number, t: number): number =>
    a + t*(b-a);

export let lerpVec2 = (a: Vec2, b: Vec2, t: number): Vec2 => 
    a.map((x,i)=>lerp(x,b[i],t)) as Vec2;
