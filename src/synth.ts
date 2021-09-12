const s_audioBufferSize: number = 4096;
const s_audioSampleRate: number = 11025;

let _sampleOffset = 0;

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

let mainLpf = biquadLPF();

let bufNoise = new Float32Array( s_audioBufferSize );
let bufNoiseOut = new Float32Array( s_audioBufferSize );
let bufBass = new Float32Array( s_audioBufferSize );

let vol: number = 0;

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
        bufBass[i] =  0.75*Math.sin( 195          * t * Math.PI ) * Math.sin( 0.1  * t );
        bufBass[i] += 0.75*Math.sin( 218.88009942 * t * Math.PI ) * Math.cos( 0.19 * t ); /*195*(Math.pow(2,2/12))*/
        bufBass[i] += 0.75*Math.sin( 260.29377156 * t * Math.PI ) * Math.sin( 0.39 * t ); /*195*(Math.pow(2,5/12))*/
        bufBass[i] += 0.25*Math.sin( 390          * t * Math.PI ) * Math.sin( 0.03 * t );
    }

    mainLpf( 150 + 25 * Math.sin(0.00002*_sampleOffset), bufNoise, bufNoiseOut );

    for (let i = 0; i < s_audioBufferSize; ++i) {
        y[i] = vol * 0.3 * ( 0.5*bufNoiseOut[i] + 0.3*bufBass[i]); // Math.min(1,Math.max(-1,bufBass[i]));
    }

    if( vol < 1 ) vol += 0.1;
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
