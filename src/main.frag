uniform sampler2D T;
uniform vec4 t;
uniform vec4 s;

// ==================================================================================================
float hash(vec3 p)
{
    p = 17.*fract( p*0.3183099+.1 );
    return fract( p.x*p.y*p.z*(p.x+p.y+p.z) );
}

float noise( in vec3 x )
{
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);

    return mix(mix(mix( hash(i+vec3(0,0,0)), 
                        hash(i+vec3(1,0,0)),f.x),
                   mix( hash(i+vec3(0,1,0)), 
                        hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix( hash(i+vec3(0,0,1)), 
                        hash(i+vec3(1,0,1)),f.x),
                   mix( hash(i+vec3(0,1,1)), 
                        hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float noisee(vec2 pos) {
    mat3 m = mat3( 0.00,  0.80,  0.60,
                    -0.80,  0.36, -0.48,
                    -0.60, -0.48,  0.64 );
    vec3 q = 8.0*vec3(pos,0); // .01*t.w);
    float f = 0.5000*noise( q ); q = m*q*2.01;
          f += 0.2500*noise( q ); q = m*q*2.02;
          f += 0.1250*noise( q ); q = m*q*2.03;
          f += 0.0625*noise( q ); q = m*q*2.01;
    return f;
}

// ==================================================================================================

float roundMerge(float a, float b) {
    return max(min(a, b), 0.) - length(min(vec2(a, b), 0.)); 
}
float sdCircle(vec2 P, float x, float y, float r) {
    return length(P - vec2(x, y)) - r;
}
float sdRotatedBox(vec2 P, float x, float y, float w, float h, float th) {
    const float i_CORNER_RADIUS = 0.;
    vec2 p = P - vec2(x,y);
    vec2 b = vec2(w,h)*.5 - i_CORNER_RADIUS;
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0) - i_CORNER_RADIUS;
}
float sdCapsule(vec2 p, float x0, float y0, float ra, float x1, float y1, float rb) {
    vec2 pa = vec2(x0, y0);
    vec2 pb = vec2(x1, y1);
    p -= pa;
    pb -= pa;
    float h = dot(pb,pb);
    vec2 q = vec2( dot(p,vec2(pb.y,-pb.x)), dot(p,pb) )/h;
    q.x = abs(q.x);
    float b = ra-rb;
    vec2 c = vec2(sqrt(h-b*b),b);
    float k = c.x*q.y - c.y*q.x; 
    float m = dot(c,q);
    float n = dot(q,q);
         if( k < 0.0 ) return sqrt(h*(n            )) - ra;
    else if( k > c.x ) return sqrt(h*(n+1.0-2.0*q.y)) - rb;
                       return m                       - ra;
}

float M(vec2 p){return p;}
__LEVELS_GLSL__

// ==================================================================================================

// Returns the world normal vector at some world space point p
vec2 getNorm(vec2 p) {
    vec2 eps = vec2(1e-4, 0);
    return normalize(vec2(
        M(p - eps.xy) - M(p + eps.xy),
        M(p - eps.yx) - M(p + eps.yx)));
}

vec3 getWorldColor(vec2 p) {
    float d = M(p);
    vec2 n = getNorm(p);

    float edge = pow(max(0.,1.+.5*d),3.);


    float x = smoothstep(.45,.55,noisee(
        edge > .01
            ? .05*p - .1*vec2(n.y,-n.x)*edge - .1*n*edge
            : .05*p
    ));

//    vec3 c = vec3(1,0,.5);
//    if(n.y > 0.5 && d > -1.) {
//        c = vec3(0,1,.5);
//    }
//
    vec3 cc = vec3(.5,1,.8);
    vec3 c = mix(.8*cc,cc,x);

    c *= .25+.5*(1.-edge);
    return c;
}

vec3 background(vec2 p) {
    return 
        vec3(1,.9,.7) * smoothstep(.73,.9, noisee(0.1 * p))
        +
        vec3(.7,.9,1) * smoothstep(.73,.9, noisee(0.1 * p+9.))
        +
        vec3(.12,.08,.12) * noisee(.0015 * p+5.);
}

void main() {
    if( t.z == 0.0 ) {
        gl_FragColor = vec4(-getNorm(t.xy), M(t.xy), 0.0);
        return;
    }

    float zoom = t.z * k_baseScale;
    vec2 worldPos = (gl_FragCoord.xy - (0.5*vec2(k_fullWidth,k_fullHeight)));
    worldPos.y *= -1.0;
    vec2 worldPosZ = .2*worldPos + .2*t.xy;
    worldPos = worldPos / zoom + t.xy;



    vec2 uv = gl_FragCoord.xy/vec2(k_fullWidth,k_fullHeight);
    uv.y = 1.0 - uv.y;
    vec4 canvasSample = texture2D(T, uv);
    float characterAmount = canvasSample.r <= .48 ? canvasSample.r / .48 : 0.;
    float time = t.w * 0.2;
    vec3 colA = 0.5 + 0.5*cos(time+100.*uv.xyx+vec3(0,2,4));

    vec2 d = vec2(-0.25,0.25) / zoom;
    float worldAmount = 0.25 * (
        float(M(worldPos + d.xx) <= 0.0) +
        float(M(worldPos + d.xy) <= 0.0) +
        float(M(worldPos + d.yx) <= 0.0) +
        float(M(worldPos + d.yy) <= 0.0)
    );

    vec3 worldColor = worldAmount > 0.0 ? getWorldColor(worldPos) : vec3(1,0,1);

    const vec2 i_PLANET_POS = vec2(110.0, -8.0);
    const float i_PLANET_R0 = 2.0;
    const float i_PLANET_R1 = 10.0;

    if( length(worldPos - i_PLANET_POS) < i_PLANET_R0 ) {
        worldAmount = 1.0;
    }

    float dd = (length(worldPos - i_PLANET_POS) - i_PLANET_R0) / (i_PLANET_R1 - i_PLANET_R0);
    if( worldAmount < 0.1 && dd <= 1.0 ) {
        worldAmount = 0.3 * (1.0 - dd);
    }

    vec3 bg = background(worldPosZ);
    //vec3 player = .5+.5*colA;
    vec3 player = vec3(1);//.5+.5*colA;


    vec2 dd = worldPos - s.xy;
    //dd.y *= .75;
    vec3 glow = vec3(1,1,.5) * pow(.5*max(0.,2.-length(dd)),2.75+.25*sin(.3*t.w));

    vec3 color = glow + mix(mix(bg, worldColor, worldAmount), player, characterAmount);

    if( canvasSample.r > 0.5 ) {
        if( canvasSample.r < 0.51 ) {
            color += (s.w > 0.5 ? vec3(0,1,0) : vec3(1,0,0)) * max(0.,1.-length(2.*canvasSample.gb-1.));
        } else {
            color += vec3(0,.5,1) * max(0.,1.-length(2.*canvasSample.gb-1.));
        }
    }
   
    gl_FragColor = vec4(color *s.z, 1);
}
