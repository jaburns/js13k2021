uniform sampler2D T;
uniform sampler2D S;
uniform sampler2D BG0;
uniform sampler2D BG1;
uniform sampler2D BG2;
uniform vec4 t;
uniform vec4 s;
uniform vec4 r;

// ==================================================================================================
// Noise
//
float hash(vec2 p) {
    p = 17.*fract( p*.3183099+.1 );
    return fract( p.x*p.y*(p.x+p.y) );
}
float noiseFn(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);
    f = f*f*(3.-2.*f);
    return mix(
        mix(hash(i+vec2(0,0)), hash(i+vec2(1,0)), f.x),
        mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x),
        f.y
    );
}
float noise(vec2 q) {
    mat2 m = mat2(.88,.48,-.48,.88);
    float f = .5*noiseFn( q *= 8. );
    f += .25*noiseFn( q = m*q*2.01 );
    f += .125*noiseFn( q = m*q*2.02 );
    f += .0625*noiseFn( q = m*q*2.03 );
    return f;
}
float periodicNoise(vec2 q) {
    q.x = .25*sin(q.x);
    return noise(q);
}

// ==================================================================================================
// SDFs + Levels
//
float roundMerge(float a, float b) {
    return max(min(a, b), 0.) - length(min(vec2(a, b), 0.)); 
}
float sdCircle(vec2 P, float x, float y, float r) {
    return length(P - vec2(x, y)) - r;
}
float sdRotatedBox(vec2 P, float x, float y, float w, float h, float th) {
    vec2 d = abs(P - vec2(x,y)) - vec2(w,h) * .5;
    return length(max(d,0.)) + min(max(d.x,d.y),0.);
}
float sdCapsule(vec2 p, float x0, float y0, float ra, float x1, float y1, float rb) {
    vec2 pa = vec2(x0, y0),
         pb = vec2(x1, y1) - pa;
    p -= pa;
    float h = dot(pb,pb),
          b = ra-rb;
    vec2 q = vec2( dot(p,vec2(pb.y,-pb.x)), dot(p,pb) )/h,
         c = vec2(sqrt(h-b*b),b);
    q.x = abs(q.x);
    float k = c.x*q.y - c.y*q.x,
          n = dot(q,q);
    return k < 0.0 ? sqrt(h*(n            )) - ra :
           k > c.x ? sqrt(h*(n+1.0-2.0*q.y)) - rb :
                     dot(c,q)                - ra;
}
vec2 M(vec2 p){return p;} 
__LEVELS_GLSL__
float mc(vec2 p){vec2 m=M(p);return min(m.x,m.y);}
vec4 sampleWorld(vec2 p, float delta) { // Result: xy -> normal ; z -> dist ; w -> on/off, negative -> rubber
    vec2 eps = vec2(delta, 0);
    vec2 center = M(p + eps.yx);
    float a = mc(p - eps.xy), b = mc(p + eps.xy), c = mc(p - eps.yx), d = min(center.x, center.y);
    return vec4(
        normalize(vec2(b - a, d - c)),
        d,
        .25*(float(a<=0.)+float(b<=0.)+float(c<=0.)+float(d<=0.)) * (center.y < center.x ? -1. : 1.)
    );
}

const vec3 i_PURPLE_SPACE = vec3(.12,.08,.12);

// ==================================================================================================
// Main
//
vec3 sampleBackground(float a, float b, vec2 worldPosBg) {
    return vec3(1,.9,.7) * smoothstep(a,b, noise(0.1 * worldPosBg)) +
        vec3(.7,.9,1) * smoothstep(a,b, noise(0.1 * worldPosBg+9.)) +
        i_PURPLE_SPACE * noise(.0015 * worldPosBg+5.);
}

vec3 sampleBackground0(vec2 worldPosBg) {
    worldPosBg /= .2; worldPosBg /= 2048.; worldPosBg += 0.5;
    return texture2D(BG0, worldPosBg).rgb;
}
vec3 sampleBackground1(vec2 worldPosBg) {
    worldPosBg /= .2; worldPosBg /= 2048.; worldPosBg += 0.5;
    return texture2D(BG1, worldPosBg).rgb;
}
vec3 sampleBackground2(vec2 worldPosBg) {
    worldPosBg /= .2; worldPosBg /= 2048.; worldPosBg += 0.5;
    return texture2D(BG2, worldPosBg).rgb;
}
/*
 
worldPosBg = .2*(gl_FragCoord.xy - 0.5*vec(W,H)) + .2*t.xy;
/.2

gl_FragCoord.xy - 0.5*vec(W,H) + t.xy


*/
void main() {
//    if( t.z == 0.0 ) {
//        vec2 samp = M(t.xy);
//        gl_FragColor = gl_FragCoord.x < 1.
//            ? vec4(sampleWorld(t.xy, .01).xyz, samp.y<samp.x ? 1. : 0.)
//            : sampleWorld(t.xy + vec2(0,.5), .01);
//    } else {
        vec2 worldPos = gl_FragCoord.xy - 0.5*vec2(k_fullWidth,k_fullHeight),
             uv = gl_FragCoord.xy/vec2(k_fullWidth,k_fullHeight),
             worldPosBg;
        uv.y = 1.0 - uv.y;
        worldPos.y *= -1.0;
        worldPosBg = .2*worldPos + .2*t.xy;
        worldPos = worldPos / t.z / k_baseScale + t.xy;

#ifdef BG
        //gl_FragColor = vec4(gl_FragCoord.x/2048., gl_FragCoord.y/2048.,0.,1.);
        gl_FragColor = vec4(sampleBackground(t.x, t.y, worldPosBg),1);
#else

        vec4 itemCanvasSample = texture2D(T, uv),
             playerCanvasSample = texture2D(S, uv),
             world = sampleWorld(worldPos, .5 / t.z / k_baseScale);

        vec3 color = vec3(0);

        // ----- Background+world color ---------------

//        if( world.w != 0.0 ) {
//            float edge = pow(max(0.,1.+.5*world.z),3.);
//            if( world.w < 0.0 ) {
//                color = -world.w * (.1+.25*edge) * vec3(.5);
//            } else {
//                vec2 v = vec2(.3,0.);
//                vec2 p = edge > .01 ? worldPosBg + 20.*world.xy*edge : worldPosBg;
//                color = 
//                    .25 * sampleBackground0(p + v.xy) +
//                    .25 * sampleBackground0(p - v.xy) +
//                    .25 * sampleBackground0(p + v.yx) +
//                    .25 * sampleBackground0(p - v.yx);
//
//                vec2 p1 = edge > .01
//                    ? .05*worldPos + .2*vec2(world.y,-world.x)*edge
//                    : .05*worldPos;
//
//                float stripe = fract(2.*(sin(p1.x)+p1.y));
//
//                vec3 baseColor = (.5+.5*smoothstep(.2,.3,stripe)*smoothstep(.8,.7,stripe))*r.rgb;
//                color += world.w * (.1+.5*edge)*baseColor;
//            }
//        } else {
        {
            color = sampleBackground0(worldPosBg);
        }

        // ----- Item color ---------------

        vec2 itemP = 2.*itemCanvasSample.gb-1.;
        float itemD = length(itemP);
        float itemR = max(0.,1.-itemD);
        if( itemCanvasSample.r > 25./255. ) {
            color += itemR * exp(-3.*itemD)*8. * i_PURPLE_SPACE;
            if (s.w > 0.5) {
                float amount = clamp((itemCanvasSample.r - 30./255.) / (30./255.), 0., 1.);
                color += amount * itemR * exp(-10.*length(itemP))*5. * sampleBackground1(8.*vec2(atan(itemP.y, itemP.x) + 0.05*t.w, 5.*(itemR - 0.05*t.w)));
            }
        } else if( itemCanvasSample.r > 15./255. ) {
            color -= pow(itemR,2.);
            vec2 sampP = vec2(atan(itemP.y, itemP.x) + 0.05*t.w, 1.*(itemR - 0.01*t.w));
            vec3 samp = i_PURPLE_SPACE * mix(periodicNoise(sampP),periodicNoise(sampP+vec2(3.14/2.,0)),.5);
            color += (1.-exp(-5.*itemD)) * itemR * 10.*samp;
        } else if( itemCanvasSample.r > 5./255. ) {
            color += smoothstep(0.,.3,itemR)*10.*vec3(1,1,.5)*exp(-(8.+2.*sin(.5*t.w+(worldPos.x+worldPos.y)))*itemD);
        }

        // ----- Player color ---------------

        float playerAmount = playerCanvasSample.r;
        vec3 doge = vec3(playerAmount) + vec3(1,1,.5) * pow(.5*max(0.,2.-length(vec2(.08,.05)*(worldPos - vec2(155,42)))),2.75+.25*sin(.3*t.w));
        float ddoge = clamp(length(doge),0.,1.);
        color = mix(color,doge,ddoge);

        // ----- Text color ---------------

        if( playerCanvasSample.b > 0. ) {
            color = clamp(color, 0., 1.);
        }
        color += (
            vec3(.3)+
            sampleBackground2(worldPos+9.+0.05*t.w)
        ) * (playerCanvasSample.g + .75*playerCanvasSample.b);
        if(playerCanvasSample.b > 0. &&  playerCanvasSample.b < .5 ) {
            color = mix( color, (10.*playerCanvasSample.b)*i_PURPLE_SPACE, .5 );
        }

        // --------------------------------------
       
        gl_FragColor = vec4(min(vec3(1),color) * s.z, 1);
//  }
#endif
}
