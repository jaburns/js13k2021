export const TICK_MS = 33;

export const enum KeyCode {
    Left = 'L',
    Up = 'U',
    Right = 'R',
    Down = 'D',
}

export let globalKeysDown: {[keyCode: string]: Bool} = {};
document.onkeydown = e => globalKeysDown[e.code[5]] = Bool.True;
document.onkeyup = e => globalKeysDown[e.code[5]] = Bool.False;

export const enum Bool { False, True }

// https://gist.github.com/shaunlebron/8832585
export let radsLerp = (a: number, b: number, t: number): number => (
    b = (b-a) % (2*Math.PI), a + t*(2*b%(2*Math.PI) - b)
);

export type Vec2 = [number, number];

export let lerp = (a: number, b: number, t: number): number =>
    a + t*(b-a);

export let v2Lerp = (a: Vec2, b: Vec2, t: number): Vec2 => 
    a.map((x,i)=>lerp(x,b[i],t)) as Vec2;

export let v2MulAdd = (a: Vec2, b: Vec2, s: number): Vec2 =>
    a.map((x,i)=>x+s*b[i]) as Vec2;

export let v2Dot = (a: Vec2, b: Vec2): number =>
    a[0]*b[0] + a[1]*b[1];

export let v2Cross = (a: Vec2, b: Vec2): number =>
    a[1]*b[0] - a[0]*b[1];

export let v2Reflect = (a: Vec2, norm: Vec2, normFactor: number, tanFactor: number): Vec2 => {
    let tan: Vec2 = [norm[1], -norm[0]];
    let normComp = -v2Dot(a, norm) * normFactor;
    let tanComp = v2Dot(a, tan) * tanFactor;
    return v2MulAdd([normComp*norm[0],normComp*norm[1]], tan, tanComp);
};

