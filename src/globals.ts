declare const __LEVELS_JS__: any;
declare const k_tickMillis: number;

export const enum KeyCode {
    Left = 37,
    Up = 38,
    Right = 39,
    Down = 40,
    Enter = 13,
    Esc = 27,
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
    return secs + ':' + (centiString.length < 2 ? '0' : '') + centiString;
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

// ZzFXMicro - Zuper Zmall Zound Zynth - v1.1.8 ~ 884 bytes minified
// https://github.com/KilledByAPixel/ZzFX
declare const webkitAudioContext: any;
let zzfxX:any
let zzfxV:number=.1    // volume
export let zzfx: (...x:any[])=>void =       // play sound 
(p:any=1,k:any=.05,b:any=220,e=0,r=0,t=.1,q=0,D=1,u=0,y=0,v=0,z=0,l=0,E=0,A=0,F=0,c=0,w=1,m=0,B=0)=>{let
M=Math,R=44100,d=2*M.PI,G=u*=500*d/R/R,C=b*=(1-k+2*k*(M.random as any)(k=[]))*d/R,g=0,H=0,a=0,n=1,I=0
,J=0,f=0,x,h;e=R*e+9;m*=R;r*=R;t*=R;c*=R;y*=500*d/R**3;A*=d/R;v*=d/R;z*=R;l=R*l|0;for(h=e+m+
r+t+c|0;a<h;k[a++]=f)++J%(100*F|0)||(f=q?1<q?2<q?3<q?M.sin((g%d)**3):M.max(M.min(M.tan(g),1)
,-1):1-(2*g/d%2+2)%2:1-4*M.abs(M.round(g/d)-g/d):M.sin(g),f=(l?1-B+B*M.sin(d*a/l):1)*(0<f?1:
-1)*M.abs(f)**D*p*zzfxV*(a<e?a/e:a<e+m?1-(a-e)/m*(1-w):a<e+m+r?w:a<h-c?(h-a-c)/t*w:0),f=c?f/
2+(c>a?0:(a<h-c?1:(h-a)/c)*k[a-c|0]/2):f),x=(b+=u+=y)*M.cos(A*H++),g+=x-x*E*(1-1E9*(M.sin(a)
+1)%2),n&&++n>z&&(b+=v,C+=v,n=0),!l||++I%l||(b=C,u=G,n=n||1);p=zzfxX.createBuffer(1,h,R);p.
getChannelData(0).set(k);b=zzfxX.createBufferSource();b.buffer=p;b.connect(zzfxX.destination
);b.start();return b};zzfxX=new (window.AudioContext||webkitAudioContext) // audio context
