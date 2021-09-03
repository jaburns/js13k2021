uniform sampler2D T;
uniform vec4 t;

// ==================================================================================================
float hash(vec3 p)  // replace this by something better
{
    p  = fract( p*0.3183099+.1 );
    p *= 17.0;
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
    vec3 q = 8.0*vec3(pos,0);
    float f = 0.5000*noise( q ); q = m*q*2.01;
          f += 0.2500*noise( q ); q = m*q*2.02;
          f += 0.1250*noise( q ); q = m*q*2.03;
          f += 0.0625*noise( q ); q = m*q*2.01;
    return f;
}

// ==================================================================================================

// ==================================================================================================
float rounderge(float a, float b) { return max(min(a, b), 0.) - length(min(vec2(a, b), 0.)); }
float sdCircle(vec2 P, float x, float y, float r) {
    return length(P - vec2(x, y)) - r;
}
float sdRotatedBox(vec2 P, float x, float y, float w, float h, float th)
{
    vec2 p = P - vec2(x,y);
    vec2 b = vec2(w,h)*.5;
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}
float cro(in vec2 a, in vec2 b ) { return a.x*b.y - a.y*b.x; }
float sdCapsule(vec2 p, float x0, float y0, float ra, float x1, float y1, float rb) {
    vec2 pa = vec2(x0, y0);
    vec2 pb = vec2(x1, y1);


    p  -= pa;
    pb -= pa;
    float h = dot(pb,pb);
    vec2  q = vec2( dot(p,vec2(pb.y,-pb.x)), dot(p,pb) )/h;
    
    //-----------
    
    q.x = abs(q.x);
    
    float b = ra-rb;
    vec2  c = vec2(sqrt(h-b*b),b);
    
    float k = cro(c,q);
    float m = dot(c,q);
    float n = dot(q,q);
    
         if( k < 0.0 ) return sqrt(h*(n            )) - ra;
    else if( k > c.x ) return sqrt(h*(n+1.0-2.0*q.y)) - rb;
                       return m                       - ra;
}

float map(vec2 p) {
    float d = -10000.;
    d = max(d, -sdCircle(p, 69.89, 4.24, 5.));
    d = max(d, -sdRotatedBox(p, 90.15, 16.36, 200., 20., 0.));
    d = max(d, -sdRotatedBox(p, 69.99, 6.80, 50., 10., 0.));
    d = max(d, -sdCapsule(p, 12.8227216534601, -22.193172092527096, 5., 32.357565959879146, -13.083325408725779, 7.));
    d = rounderge(d, sdCircle(p, 81.56, -1.47, 8.));
    return -d;
}
// ==================================================================================================


// Returns the world normal vector at some world space point p
vec2 getNorm(vec2 p)
{
    vec2 eps = vec2(1e-4, 0);
    return normalize(vec2(
        map(p - eps.xy) - map(p + eps.xy),
        map(p - eps.yx) - map(p + eps.yx)));
}

void main() {
    if( t.z == 0.0 ) {
        gl_FragColor = vec4(-getNorm(t.xy), map(t.xy), 0.0);
        return;
    }

    float zoom = t.z * k_baseScale;
    vec2 worldPos = (gl_FragCoord.xy - (0.5*vec2(k_fullWidth,k_fullHeight)));
    worldPos.y *= -1.0;
    worldPos = worldPos / zoom + t.xy;

    vec2 uv = gl_FragCoord.xy/vec2(k_fullWidth,k_fullHeight);
    uv.y = 1.0 - uv.y;
    float samp = texture2D(T, uv).r;
    float time = t.w * 0.02;
    vec3 colA = 0.5 + 0.5*cos(time+uv.xyx+vec3(0,2,4));

    vec2 d = vec2(-0.25,0.25) / zoom;
    samp += 0.25 * (
        float(map(worldPos + d.xx) <= 0.0) +
        float(map(worldPos + d.xy) <= 0.0) +
        float(map(worldPos + d.yx) <= 0.0) +
        float(map(worldPos + d.yy) <= 0.0)
    );

    const vec2 i_PLANET_POS = vec2(110.0, -8.0);
    const float i_PLANET_R0 = 2.0;
    const float i_PLANET_R1 = 10.0;

    if( length(worldPos - i_PLANET_POS) < i_PLANET_R0 ) {
        samp = 1.0;
    }

    float dd = (length(worldPos - i_PLANET_POS) - i_PLANET_R0) / (i_PLANET_R1 - i_PLANET_R0);
    if( samp < 0.1 && dd <= 1.0 ) {
        samp = 0.3 * (1.0 - dd);
    }

    vec3 bg = colA * smoothstep(0.6,0.9, noisee(0.1 * (worldPos - 0.5*t.xy)));

    gl_FragColor = vec4(
        mix(bg, 1.0 - colA, min(1.0,samp)),
        1.0
    );
}
