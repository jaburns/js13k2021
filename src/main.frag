uniform sampler2D T;
uniform sampler2D S;
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
float M(vec2 p){return p;} 
__LEVELS_GLSL__
vec4 sampleWorld(vec2 p, float delta) { // Result: xy -> normal ; z -> dist ; w -> on/off
    vec2 eps = vec2(delta, 0);
    float a = M(p - eps.xy), b = M(p + eps.xy), c = M(p - eps.yx), d = M(p + eps.yx);
    return vec4(
        normalize(vec2(b - a, d - c)),
        M(p),
        .25*(float(a<=0.)+float(b<=0.)+float(c<=0.)+float(d<=0.))
    );
}


// ==================================================================================================
// Main
//
vec3 sampleBackground(vec2 worldPosBg) {
    return 
        vec3(1,.9,.7) * smoothstep(.73,.9, noise(0.1 * worldPosBg)) +
        vec3(.7,.9,1) * smoothstep(.73,.9, noise(0.1 * worldPosBg+9.)) +
        vec3(.12,.08,.12) * noise(.0015 * worldPosBg+5.);
}

void main() {
    if( t.z == 0.0 ) {
        gl_FragColor = gl_FragCoord.x < 1.
            ? sampleWorld(t.xy, .01)
            : sampleWorld(t.xy + vec2(0,.5), .01);
    } else {
        vec2 worldPos = (gl_FragCoord.xy - (0.5*vec2(k_fullWidth,k_fullHeight))),
             uv = gl_FragCoord.xy/vec2(k_fullWidth,k_fullHeight),
             worldPosBg;
        uv.y = 1.0 - uv.y;
        worldPos.y *= -1.0;
        worldPosBg = .2*worldPos + .2*t.xy;
        worldPos = worldPos / t.z / k_baseScale + t.xy;

        vec4 itemCanvasSample = texture2D(T, uv),
             playerCanvasSample = texture2D(S, uv),
             world = sampleWorld(worldPos, .5 / t.z / k_baseScale);

        vec3 color = vec3(0);

        // ----- World color ---------------

        if( world.w > 0.0 ) {
            float edge = pow(max(0.,1.+.5*world.z),3.);
            float x = smoothstep(.45,.55,noise(
                edge > .01
                    ? .05*worldPos + .1*vec2(world.y,-world.x)*edge + .1*world.xy*edge
                    : .05*worldPos
            ));
            color = mix(.8*r.rgb,r.rgb,x);
            color *= .25+.5*(1.-edge);
        }

        // ----- Background color ---------------

        color = mix(sampleBackground(worldPosBg), color, world.w);

        // ----- Item color ---------------
        
        if( itemCanvasSample.r > 25./255. ) {
            color -= vec3(1) * max(0.,1.-length(2.*itemCanvasSample.gb-1.));
        } else if( itemCanvasSample.r > 15./255. ) {
            color += (s.w > 0.5 ? vec3(0,1,0) : vec3(1,0,0)) * max(0.,1.-length(2.*itemCanvasSample.gb-1.));
        } else if( itemCanvasSample.r > 5./255. ) {
            color += vec3(0,.5,1) * max(0.,1.-length(2.*itemCanvasSample.gb-1.));
        }

        // ----- Player color ---------------

        float playerAmount = playerCanvasSample.r;
        color += vec3(playerAmount) + vec3(1,1,.5) * pow(.5*max(0.,2.-length(worldPos - s.xy)),2.75+.25*sin(.3*t.w));

        // ----- Message color ---------------

        color += 10.*sampleBackground(worldPosBg+t.w) * playerCanvasSample.g;

        // --------------------------------------
       
        gl_FragColor = vec4(min(vec3(1),color) * s.z, 1);
    }
}
