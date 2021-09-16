declare const __LEVELS_JS__: any;
declare const k_tickMillis: number;

export const enum KeyCode {
    Left = 37,
    Up = 38,
    Right = 39,
    Down = 40,
    Enter = 13,
    Esc = 27,
    Retry = 82,
}

export let curLevelObjectData: any;

export let loadLevelData = (idx: number) => {
    curLevelObjectData = (__LEVELS_JS__)[idx];
};

export let globalKeysDown: {[keyCode: string]: Bool} = {};
document.onkeydown = e => {
    if( ([37,38,39,40]).indexOf(e.which) >= 0 ) e.preventDefault();
    if( !e.repeat ) globalKeysDown[e.which] = Bool.True;
};
document.onkeyup = e => globalKeysDown[e.which] = Bool.False;

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

export let ticksToTime = (ticks: number): string => {
    if(!ticks) return '';
    let centis = (Math.max(0,(ticks|0) - 10) * k_tickMillis) / 10;
    let secs = (centis / 100)|0;
    let centiString = ((centis|0)%100).toString();
    return secs + '.' + (centiString.length < 2 ? '0' : '') + centiString;
};

export let v2Reflect = (a: Vec2, norm: Vec2, normFactor: number, tanFactor: number): Vec2 => {
    let tan: Vec2 = [norm[1], -norm[0]];
    let normComp = -v2Dot(a, norm) * normFactor;
    let tanComp = v2Dot(a, tan) * tanFactor;
    return v2MulAdd([normComp*norm[0],normComp*norm[1]], tan, tanComp);
};

let clamp01 = (x: number) =>
    x < 0 ? 0 : x > 1 ? 1 : x;
export let smoothstep = (edge0: number, edge1: number, x: number) => {
    x = clamp01((x - edge0) / (edge1 - edge0));
    return x * x * (3 - 2 * x);
};

// ZzFXMicro - Zuper Zmall Zound Zynth - v1.1.8
// https://github.com/KilledByAPixel/ZzFX

declare const webkitAudioContext: any;
let zzfxV = .3;    // volume
let zzfxR = 44100; // sample rate
let zzfxX = new (window.AudioContext||webkitAudioContext); // audio context
export let zzfxP = (samples:any[])=>  // play samples
{
    console.log(samples);

    // create buffer and source
    let buffer = zzfxX.createBuffer(1, samples.length, zzfxR), 
        source = zzfxX.createBufferSource();

    // copy samples to buffer and play
    buffer.getChannelData(0).set(samples);
    source.buffer = buffer;
    source.connect(zzfxX.destination);
    source.start();
    return source;
}
export let zzfxG = // generate samples
(
    // parameters
    volume = 1, randomness = .05, frequency = 220, attack = 0, sustain = 0,
    release = .1, shape = 0, shapeCurve = 1, slide = 0, deltaSlide = 0,
    pitchJump = 0, pitchJumpTime = 0, repeatTime = 0, noise = 0, modulation = 0,
    bitCrush = 0, delay = 0, sustainVolume = 1, decay = 0, tremolo = 0
)=>
{
    // init parameters
    let PI2 = Math.PI*2,
    sign = (v:number) => v>0?1:-1,
    startSlide = slide *= 500 * PI2 / zzfxR / zzfxR,
    startFrequency = frequency *= (1 + randomness*2*Math.random() - randomness) 
        * PI2 / zzfxR,
    b=[], t=0, tm=0, i=0, j=1, r=0, c=0, s=0, f, length;
        
    // scale by sample rate
    attack = attack * zzfxR + 9; // minimum attack to prevent pop
    decay *= zzfxR;
    sustain *= zzfxR;
    release *= zzfxR;
    delay *= zzfxR;
    deltaSlide *= 500 * PI2 / zzfxR**3;
    modulation *= PI2 / zzfxR;
    pitchJump *= PI2 / zzfxR;
    pitchJumpTime *= zzfxR;
    repeatTime = repeatTime * zzfxR | 0;

    // generate waveform
    for(length = attack + decay + sustain + release + delay | 0;
        i < length; b[i++] = s)
    {
        if (!(++c%(bitCrush*100|0)))                      // bit crush
        {
            s = shape? shape>1? shape>2? shape>3?         // wave shape
                Math.sin((t%PI2)**3) :                    // 4 noise
                Math.max(Math.min(Math.tan(t),1),-1):     // 3 tan
                1-(2*t/PI2%2+2)%2:                        // 2 saw
                1-4*Math.abs(Math.round(t/PI2)-t/PI2):    // 1 triangle
                Math.sin(t);                              // 0 sin
                
            s = (repeatTime ?
                    1 - tremolo + tremolo*Math.sin(PI2*i/repeatTime) // tremolo
                    : 1) *
                sign(s)*(Math.abs(s)**shapeCurve) *       // curve 0=square, 2=pointy
                volume * zzfxV * (                        // envelope
                i < attack ? i/attack :                   // attack
                i < attack + decay ?                      // decay
                1-((i-attack)/decay)*(1-sustainVolume) :  // decay falloff
                i < attack  + decay + sustain ?           // sustain
                sustainVolume :                           // sustain volume
                i < length - delay ?                      // release
                (length - i - delay)/release *            // release falloff
                sustainVolume :                           // release volume
                0);                                       // post release
 
            s = delay ? s/2 + (delay > i ? 0 :            // delay
                (i<length-delay? 1 : (length-i)/delay) *  // release delay 
                b[i-delay|0]/2) : s;                      // sample delay
        }

        f = (frequency += slide += deltaSlide) *          // frequency
            Math.cos(modulation*tm++);                    // modulation
        t += f - f*noise*(1 - (Math.sin(i)+1)*1e9%2);     // noise

        if (j && ++j > pitchJumpTime)       // pitch jump
        {
            frequency += pitchJump;         // apply pitch jump
            startFrequency += pitchJump;    // also apply to start
            j = 0;                          // reset pitch jump time
        }

        if (repeatTime && !(++r % repeatTime)) // repeat
        {
            frequency = startFrequency;     // reset frequency
            slide = startSlide;             // reset slide
            j = j || 1;                     // reset pitch jump time
        }
    }
    
    return b;
}







// ----- SDFs -----

let v2Lift1 = (fn: (a: number) => number) => (a: Vec2): Vec2 => a.map(fn) as Vec2;
let v2Lift2 = (fn: (a: number, b: number) => number) => (a: Vec2, b: Vec2): Vec2 => [fn(a[0], b[0]), fn(a[1], b[1])];
let v2Length = (v: Vec2): number => Math.sqrt(v2Dot(v, v));
let max = Math.max;
let v2Min = v2Lift2(Math.min);
let v2Max = v2Lift2(max);
let v2Abs = v2Lift1(Math.abs);
let v2Sub = (a: Vec2, b: Vec2): Vec2 => v2MulAdd(a, b, -1);
let v2Scale = (a: Vec2, b: number): Vec2 => v2MulAdd([0,0], a, b);

let roundMerge = (a: number, b: number): number =>
    Math.max(Math.min(a, b), 0) - v2Length(v2Min([a, b], [0,0])); 

let sdCircle = (P: Vec2, x: number, y: number, r: number): number =>
    v2Length(v2Sub(P, [x,y])) - r;

let sdRotatedBox = (P: Vec2, x: number, y: number, w: number, h: number, _th: number): number => {
    let d = v2MulAdd(v2Abs(v2Sub(P, [x,y])), [w,h], -0.5);
    return v2Length(v2Max(d,[0,0])) + Math.min(Math.max(d[0],d[1]),0.);
};

let sdCapsule = (p: Vec2, x0: number, y0: number, ra: number, x1: number, y1: number, rb: number): number => {
    let pa: Vec2 = [x0, y0],
        pb: Vec2 = v2Sub([x1, y1] , pa);
    p = v2Sub(p, pa);
    let h: number = v2Dot(pb,pb),
        b: number = ra-rb;
    let q: Vec2 = v2Scale([ v2Dot(p,[pb[1],-pb[0]]), v2Dot(p,pb) ], 1/h),
        c: Vec2 = [Math.sqrt(h-b*b),b];
    q[0] = Math.abs(q[0]);
    let k: number = c[0]*q[1] - c[1]*q[0],
        n: number = v2Dot(q,q);
    return k < 0.0  ? Math.sqrt(h*(n             )) - ra :
           k > c[0] ? Math.sqrt(h*(n+1.0-2.0*q[1])) - rb :
                      v2Dot(c,q)                    - ra ;
};

let levelSdf_M0 = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, 11.43, 101.05, 192., 200., 0.));
    d[0] = roundMerge(d[0], sdCircle(p, 111.93, 78.66, 50.));
    d[0] = roundMerge(d[0], sdCapsule(p, 26.58, -2.89, 25., 127.67, -4.64, 25.));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_M1 = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, 19.38, 52.48, 50., 100., 0.));
    d[0] = max(d[0], -sdRotatedBox(p, 72.93, 52.48, 30., 100., 0.));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_M2 = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, -6.05, 55.81, 100., 125., 0.));
    d[0] = roundMerge(d[0], sdRotatedBox(p, -17.47, -12.52, 50., 30., 0.));
    d[0] = roundMerge(d[0], sdCapsule(p, -61.74, -2.12, 10., -15.66, -2.12, 10.));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_M3 = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, -0.07, 97.01, 150., 250., 0.));
    d[0] = roundMerge(d[0], sdCapsule(p, 47.90, -32.40, 20., -48.89, -32.43, 20.));
    d[0] = roundMerge(d[0], sdRotatedBox(p, -11.32, -17.57, 40., 40., 0.));
    d[0] = roundMerge(d[0], sdCapsule(p, -16.80, -1.87, 10., -50.28, -11.81, 20.));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_M4 = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, 70.66, 77.64, 150., 150., 0.));
    d[0] = roundMerge(d[0], sdRotatedBox(p, 65.84, 55.43, 31., 150., 0.));
    d[0] = roundMerge(d[0], sdCapsule(p, 106.59, -4.28, 20., 23.88, -4.59, 20.));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_M5 = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, 44.34, 48.78, 98.10, 94.01, 0.));
    d[0] = roundMerge(d[0], sdCircle(p, 44.24, 1.15, 40.99));
    d[0] = max(d[0], -sdCircle(p, 43.92, -6.14, 31.58));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_M6 = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, -81.57, 63.30, 186.89, 121.37, 0.));
    d[0] = max(d[0], -sdRotatedBox(p, -179.33, 81.59, 50., 84.77, 0.));
    d[0] = max(d[0], -sdRotatedBox(p, 86.89, 3.76, 154.40, 245.33, 0.));
    d[0] = roundMerge(d[0], sdRotatedBox(p, -91.59, -3.02, 50., 35.76, 0.));
    d[0] = roundMerge(d[0], sdCircle(p, -24.02, 0.77, 17.11));
    d[0] = roundMerge(d[0], sdCircle(p, -47.70, 4.65, 13.44));
    d[0] = roundMerge(d[0], sdCircle(p, -143.51, 28.24, 21.01));
    d[0] = roundMerge(d[0], sdCircle(p, -66.33, 11.06, 15.48));
    d[0] = roundMerge(d[0], sdCircle(p, -118.47, 18.92, 14.61));
    d[0] = roundMerge(d[0], sdCircle(p, -93.42, 19.80, 19.27));
    d[0] = roundMerge(d[0], sdCircle(p, -168.27, 34.65, 14.02));
    d[0] = roundMerge(d[0], sdRotatedBox(p, -137.50, -0.18, 88.66, 56.58, 0.));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_M7 = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, 4.15, 43.37, 300., 300., 0.));
    d[0] = roundMerge(d[0], sdCircle(p, 34.45, 6.64, 17.83));
    d[0] = roundMerge(d[0], sdCircle(p, -37.15, 10.44, 17.83));
    d[0] = roundMerge(d[0], sdCapsule(p, 0.90, 38.33, 33.77, -0.17, 2.73, 19.00));
    d[0] = max(d[0], -sdCapsule(p, 0.09, 6.28, 3.37, 0.23, 28.86, 22.00));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_M8 = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, 34.88, 30.21, 94.56, 56.00, 0.));
    d[0] = max(d[0], -sdRotatedBox(p, 72.57, 18.35, 39.11, 79.54, 0.));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_M9 = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, 18.02, 57.64, 50., 110., 0.));
    d[0] = max(d[0], -sdRotatedBox(p, 89.57, 42., 50., 110., 0.));
    d[0] = max(d[0], -sdRotatedBox(p, 99.50, -32.11, 30., 10., 0.));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_MA = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, 32.26, 57.50, 78.48, 110.29, 0.));
    d[0] = max(d[0], -sdRotatedBox(p, 204.79, 72.98, 170.10, 145.49, 0.));
    d[0] = max(d[0], -sdRotatedBox(p, 238.47, -62.76, 103.20, 132.51, 0.));
    d[0] = roundMerge(d[0], sdCircle(p, 186.82, -14.81, 19.64));
    d[0] = roundMerge(d[0], sdRotatedBox(p, 69.71, 1.22, 45.61, 15.62, 0.));
    d[0] = roundMerge(d[0], sdCapsule(p, 109.87, -3.83, 13.73, 137.12, 13.48, 14.86));
    d[0] = roundMerge(d[0], sdCapsule(p, 53.80, 24.17, 18.27, 98.27, 0.24, 7.));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_MB = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, -37.78, 111.78, 150., 250., 0.));
    d[0] = roundMerge(d[0], sdCapsule(p, 10.19, -17.63, 20., -112.46, -17.07, 20.));
    d[0] = roundMerge(d[0], sdRotatedBox(p, -49.04, 0.05, 40., 46.01, 0.));
    d[0] = roundMerge(d[0], sdCapsule(p, -67.50, 15.40, 19.97, -121.84, 15.23, 20.));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_MC = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, 21.99, 7.92, 300., 300., 0.));
    d[0] = roundMerge(d[0], sdCapsule(p, -2.96, -14.13, 16.57, 39.05, -13.99, 16.22));
    d[0] = roundMerge(d[0], sdCapsule(p, 17.30, 4.69, 16.91, 17.84, -31.63, 16.83));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_MD = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, 45.89, 34.25, 100.82, 64.41, 0.));
    d[0] = max(d[0], -sdRotatedBox(p, 139.23, -50.95, 97.76, 83.02, 0.));
    d[0] = roundMerge(d[0], sdCapsule(p, 112.32, -8.00, 18.32, 164.92, -7.38, 19.13));
    d[0] = roundMerge(d[0], sdCapsule(p, 76.77, 1.57, 15.46, 109.60, 12.15, 4.75));
    d[0] = roundMerge(d[0], sdCapsule(p, 47.63, -4.25, 15.90, 18.00, -9.89, 17.89));
    d[0] = max(d[0], -sdCapsule(p, 115.26, -5.19, 9.10, 163.80, -5.30, 12.67));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_ME = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, 53.48, 38.82, 129.68, 73.84, 0.));
    d[0] = max(d[0], -sdRotatedBox(p, 213.53, -15.55, 113.32, 182.21, 0.));
    d[0] = roundMerge(d[0], sdCircle(p, 163.85, 16.56, 18.59));
    d[0] = roundMerge(d[0], sdCapsule(p, 99.87, 18.08, 27.15, 76.56, -22.49, 13.31));
    d[0] = roundMerge(d[0], sdRotatedBox(p, 63.62, 6.32, 93.34, 17.12, 0.));
    d[0] = roundMerge(d[0], sdCapsule(p, 36.04, 18.81, 20.75, 58.99, -23.85, 5.62));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_MF = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, -0.48, 30.21, 23.82, 56.00, 0.));
    d[1] = max(d[1], -sdRotatedBox(p, 17.31, 30.83, 9.17, 47.52, 0.));
    d[0] = max(d[0], -sdRotatedBox(p, 36.35, 23.07, 26.20, 69.39, 0.));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_MG = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, 26.00, 31.55, 76.82, 58.69, 0.));
    d[0] = max(d[0], -sdRotatedBox(p, -33.82, 19.82, 50., 82.48, 0.));
    d[0] = roundMerge(d[0], sdCircle(p, -33.82, -22.67, 23.90));
    d[0] = roundMerge(d[0], sdCapsule(p, 73.44, -2.32, 19.03, 23.69, -2.18, 18.90));
    d[1] = max(d[1], -sdRotatedBox(p, -34.06, -28.47, 9.41, 7.92, 0.));
    d[1] = max(d[1], -sdRotatedBox(p, 75.73, 7.27, 11.45, 10.56, 0.));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_MH = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, 71.31, 40.04, 154.04, 75.27, 0.));
    d[0] = roundMerge(d[0], sdRotatedBox(p, 123.01, -0.08, 62.94, 23.22, 0.));
    d[0] = roundMerge(d[0], sdCapsule(p, 90.44, 6.87, 15.38, 26.29, 0.37, 21.91));
    d[1] = max(d[1], -sdCircle(p, 120.34, -5.81, 7.));
    d[1] = max(d[1], -sdCircle(p, 91.29, -22.92, 7.));
    d[1] = max(d[1], -sdCircle(p, 63.25, -38.83, 7.));
    d[1] = max(d[1], -sdCircle(p, 32.02, -52.75, 7.));
    return [-1-d[0],-1-d[1]];
}
let levelSdf_MI = (p: Vec2): Vec2 => {
    let d: Vec2 = [-10000, -10000];
    d[0] = max(d[0], -sdRotatedBox(p, 39.98, 43.37, 104.77, 130.66, 0.));
    d[0] = max(d[0], -sdRotatedBox(p, 184.77, 3.19, 124.61, 211.16, 0.));
    d[1] = max(d[1], -sdRotatedBox(p, 116.24, -48.67, 10., 10., 0.));
    d[1] = max(d[1], -sdCircle(p, 95.28, -75.10, 7.));
    d[0] = max(d[0], -sdRotatedBox(p, 306.31, -200.32, 185.13, 157.26, 0.));
    d[1] = max(d[1], -sdRotatedBox(p, 100.28, -157.86, 10., 10., 0.));
    d[0] = roundMerge(d[0], sdCapsule(p, 209.81, -101.05, 84.85, 281.55, -102.25, 23.59));
    d[0] = roundMerge(d[0], sdCapsule(p, 98.67, -22.99, 16.65, 73.85, -23.84, 17.34));
    d[0] = roundMerge(d[0], sdRotatedBox(p, 4.31, -20.09, 50., 44.52, 0.));
    d[0] = roundMerge(d[0], sdCapsule(p, 39.92, 1.43, 16.33, 39.04, -32.99, 18.53));
    d[0] = max(d[0], -sdCapsule(p, 149.39, -163.71, 5.00, 226.38, -163.59, 4.88));
    return [-1-d[0],-1-d[1]];
}
let levelSdfs = [
    levelSdf_M0,
    levelSdf_M1,
    levelSdf_M2,
    levelSdf_M3,
    levelSdf_M4,
    levelSdf_M5,
    levelSdf_M6,
    levelSdf_M7,
    levelSdf_M8,
    levelSdf_M9,
    levelSdf_MA,
    levelSdf_MB,
    levelSdf_MC,
    levelSdf_MD,
    levelSdf_ME,
    levelSdf_MF,
    levelSdf_MG,
    levelSdf_MH,
    levelSdf_MI,
];
export let sampleLevel = (level: number, p: Vec2): number[] => {
    let center0 = (levelSdfs[level])(p);
    let center1 = Math.min(center0[0], center0[1]);

    let norma0 = (levelSdfs[level])([p[0]-.01,p[1]]);
    let normb0 = (levelSdfs[level])([p[0]+.01,p[1]]);
    let normc0 = (levelSdfs[level])([p[0],p[1]-.01]);
    let normd0 = (levelSdfs[level])([p[0],p[1]+.01]);
    let norma1 = Math.min(norma0[0], norma0[1]);
    let normb1 = Math.min(normb0[0], normb0[1]);
    let normc1 = Math.min(normc0[0], normc0[1]);
    let normd1 = Math.min(normd0[0], normd0[1]);
    let normVec: Vec2 = [normb1 - norma1, normd1 - normc1];
    normVec = v2MulAdd([0,0], normVec, 1 / v2Length(normVec));

    let xnorma0 = (levelSdfs[level])([p[0]-.01,p[1]+.5]);
    let xnormb0 = (levelSdfs[level])([p[0]+.01,p[1]+.5]);
    let xnormc0 = (levelSdfs[level])([p[0],p[1]+.49]);
    let xnormd0 = (levelSdfs[level])([p[0],p[1]+.51]);
    let xnorma1 = Math.min(xnorma0[0], xnorma0[1]);
    let xnormb1 = Math.min(xnormb0[0], xnormb0[1]);
    let xnormc1 = Math.min(xnormc0[0], xnormc0[1]);
    let xnormd1 = Math.min(xnormd0[0], xnormd0[1]);
    let xnormVec: Vec2 = [xnormb1 - xnorma1, xnormd1 - xnormc1];
    xnormVec = v2MulAdd([0,0], xnormVec, 1 / v2Length(xnormVec));

    return [
        normVec[0],
        normVec[1],
        center1,
        center0[1] < center0[0] ? 1 : 0,
        xnormVec[0],
        xnormVec[1],
    ];
};

