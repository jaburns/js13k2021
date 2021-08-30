export const WIDTH = 1024;
export const HEIGHT = 768;
export const TICK_MS = 33;

export const enum KeyCode {
    Left = 'A',
    Up = 'W',
    Right = 'D',
    Down = 'S',
}

export let globalKeysDown: {[keyCode: string]: Bool} = {};
document.onkeydown = e => globalKeysDown[e.code[3]] = True;
document.onkeyup = e => globalKeysDown[e.code[3]] = False;

export const enum Bool { False, True }
export const False = Bool.False;
export const True = Bool.True;

export type Vec2 = [number, number];

export let lerp = (a: number, b: number, t: number): number =>
    a + t*(b-a);

export let v2Lerp = (a: Vec2, b: Vec2, t: number): Vec2 => 
    a.map((x,i)=>lerp(x,b[i],t)) as Vec2;

export let v2Add = (a: Vec2, b: Vec2, s: number): Vec2 =>
    a.map((x,i)=>x+s*b[i]) as Vec2;

export let v2Sub = (a: Vec2, b: Vec2): Vec2 =>
    a.map((x,i)=>x-b[i]) as Vec2;

export let v2Dot = (a: Vec2, b: Vec2): number =>
    a[0]*b[0] + a[1]*b[1];

export let v2Reflect = (a: Vec2, norm: Vec2, normFactor: number, tanFactor: number): Vec2 => {
    let tan: Vec2 = [norm[1], -norm[0]];
    let normComp = -v2Dot(a, norm) * normFactor;
    let tanComp = v2Dot(a, tan) * tanFactor;
    return v2Add([normComp*norm[0],normComp*norm[1]], tan, tanComp);
};

export let v2LenSqr = (a: Vec2): number => 
    v2Dot(a,a);

