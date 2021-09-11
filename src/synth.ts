import {zzfx} from "./globals";

const s_audioBufferSize: number = 1024;
const s_audioSampleRate: number = 22050;
const s_tempo: number = 0.45;

let _sampleOffset = 0;
let _songPos: number;

let biquadLPF = () =>
{
    let x1: number = 0;
    let x2: number = 0;
    let y1: number = 0;
    let y2: number = 0;
    let c02: number = 0;
    let c1: number = 0;
    let c3: number = 0;
    let c4: number = 0;

    return ( freq: number, x: Float32Array, y: Float32Array ) =>
    {
        let omega = 2 * Math.PI * freq / s_audioSampleRate;
        let sn = Math.sin(omega);
        let cs = Math.cos(omega);
        let alpha = sn * Math.sinh(Math.log(2) * omega / sn);

        let b1 = 1 - cs;
        let b02 = b1 / 2;
        let a0 = 1 + alpha;
        let a1 = -2 * cs;
        let a2 = 1 - alpha;

        c02 = b02 / a0;
        c1 = b1 / a0;
        c3 = a1 / a0;
        c4 = a2 / a0;

        y[0] = c02*x[0] + c1*x1   + c02*x2 - c3*y1 - c4*y2;
        y[1] = c02*x[1] + c1*x[0] + c02*x1 - c3*y[0] - c4*y1;

        for (let i = 2; i < s_audioBufferSize; ++i)
            y[i] = c02*x[i] + c1*x[i-1] + c02*x[i-2] - c3*y[i-1] - c4*y[i-2];

        x1 = x[s_audioBufferSize - 1];
        x2 = x[s_audioBufferSize - 2];

        y1 = y[s_audioBufferSize - 1];
        y2 = y[s_audioBufferSize - 2];
    };
};

let clamp01 = (x: number) =>
    x < 0 ? 0 : x > 1 ? 1 : x;
let clamp11 = (x: number) =>
    x < -1 ? -1 : x > 1 ? 1 : x;

let smoothstep = (edge0: number, edge1: number, x: number) =>
{
    x = clamp01((x - edge0) / (edge1 - edge0));
    return x * x * (3 - 2 * x);
};

let saw = ( t: number ) =>
    1 - 2 * ((t % (2 * Math.PI)) / (2 * Math.PI));

let tri = ( t: number ) =>
    1 - 2*Math.abs(1 - 2 * ((t % (2 * Math.PI)) / (2 * Math.PI)));

let sqr = ( t: number ) =>
    saw(t) > 0.5 ? 1 : -1;

let sym = ( time: number, tempo: number, a: number, b: number ) =>
    a * (1-2*Math.random()) * Math.exp( -b*(time%tempo) );

let taylorSquareWave = ( x: number, i: number, imax: number ): number =>
{
    let result = 0;
    for( ; i <= imax; i += 2 )
        result += 4 / Math.PI / i * Math.sin( i * x );
    return result;
};

let mainLpf = biquadLPF();

let bufNoise = new Float32Array( s_audioBufferSize );
let bufNoiseOut = new Float32Array( s_audioBufferSize );
let bufBass = new Float32Array( s_audioBufferSize );

let audioTick = ( y: Float32Array ) =>
{
    if( _sampleOffset < 0 )
    {
        _sampleOffset = 0;
        return;
    } 

    for (let i = 0; i < s_audioBufferSize; ++i) {
        let t = (_sampleOffset + i) / s_audioSampleRate;
        bufNoise[i] = 2*Math.random() - 1;
        bufBass[i] = Math.sin( 110 * t * 2 * Math.PI ) * Math.sin( 0.1 * t );
        bufBass[i] += .5*Math.sin( 110 * t * 2 * Math.PI * (Math.pow(2,3/12)) ) * Math.sin( 0.19 * t );
        bufBass[i] += .8*Math.cos( 110 * t * 2 * Math.PI * (Math.pow(2,5/12)) ) * Math.sin( 0.39 * t );
        bufBass[i] += Math.sin( 35 * t * 2 * Math.PI ) * Math.cos( 0.07 * t );
    }

    mainLpf( 150 + 25 * Math.sin(0.00002*_sampleOffset), bufNoise, bufNoiseOut );

    for (let i = 0; i < s_audioBufferSize; ++i) {
        y[i] = 1.5*bufNoiseOut[i] + 0.3*Math.min(1,Math.max(-1,bufBass[i]));
    }


    _sampleOffset += s_audioBufferSize;
};

export let startAudio = () =>
{
    let ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: s_audioSampleRate }) as AudioContext;
    let node = ctx.createScriptProcessor( s_audioBufferSize, 0, 1 );
    node.connect( ctx.destination );
    node.onaudioprocess = e => audioTick( e.outputBuffer.getChannelData( 0 ));
    startAudio = () => {};
};
