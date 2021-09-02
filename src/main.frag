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

// Merge two signed distances together while smoothing sharp edges in their negative space
float roundMerge(float a, float b)
{
    return -length(min(vec2(a, b), 0.)) + max(min(a, b), 0.);
}

// For every integer x, this gives some pseudorandom value in the range [0,1)
float rand(float x)
{
    return fract(sin(k_track+11.*floor(x+11.)) * (22.+k_track));
}

// Signed distance function for the divot closest to p.x + b. Parameter p is in world space
float divot(vec2 p, float b)
{
    // Pick a random radius for the divot
    float r = .7 + .6*rand(p.x + b);

    // Move in to the local space of the divot, offset vertically by some random amount
    p = vec2(
        abs( mod(p.x+.5,1.) - b ),
        p.y + rand(p.x+b+9.)*k_track/7. + .5 - k_track/10.
    );

    // Uneven capsule distance function https://www.shadertoy.com/view/4lcBWn
    return dot(p, vec2(.3,.95)) < 0.
        ? length(p) - r
        : dot(p, vec2(.95,-.3)) - r;
}

// Total signed distance function for the world. Parameter p is in world space
float map(vec2 p)
{
    p *= 0.1;
    p.y *= -1.0;

    return -min(
        // Cliff at the start of the level
        p.x - .7*p.y - 3., 

        // The three closest divots to p
        roundMerge(
            roundMerge(
                divot(p,  .5),
                divot(p, -.5)
            ),
            divot(p, 1.5)
        )
    ) / 0.1;
}

// Returns the world normal vector at some world space point p
vec2 getNorm(vec2 p)
{
    vec2 eps = vec2(1e-4, 0);
    return normalize(vec2(
        map(p - eps.xy) - map(p + eps.xy),
        map(p - eps.yx) - map(p + eps.yx)));
}

// ==================================================================================================


void main() {
    if( t.z == 0.0 ) {
        gl_FragColor = vec4(-getNorm(t.xy), map(t.xy), 0.0);
        return;
    }

    float zoom = t.z * 21.0; // cameraZoom * baseScale;
    vec2 worldPos = (gl_FragCoord.xy - (0.5*vec2(k_fullWidth,k_fullHeight)));
    worldPos.y *= -1.0;
    worldPos = worldPos / zoom + t.xy;

    vec2 uv = gl_FragCoord.xy/vec2(k_fullWidth,k_fullHeight);
    uv.y = 1.0 - uv.y;
    float samp = texture2D(T, uv).r;
    float time = t.w * 0.02;
    vec3 colA = 0.5 + 0.5*cos(time+uv.xyx+vec3(0,2,4));
    vec3 colB = 1.0 - colA; // 0.5 + 0.5*cos(time+3.0+uv.xyx+vec3(0,2,4));

    float mapDist = map(worldPos);

    if( mapDist < 0.0 ){
        samp = 1.0;
    }

    const vec2 i_PLANET_POS = vec2(110.0, -8.0);
    const float i_PLANET_R0 = 2.0;
    const float i_PLANET_R1 = 10.0;

    if( length(worldPos - i_PLANET_POS) < i_PLANET_R0 )
        samp = 1.0;

    float dd = (length(worldPos - i_PLANET_POS) - i_PLANET_R0) / (i_PLANET_R1 - i_PLANET_R0);
    if( samp < 0.1 && dd <= 1.0 ) {
        samp = 0.3 * (1.0 - dd);
    }

    vec3 bg = colA * smoothstep(0.6,0.9, noisee(0.1 * (worldPos - 0.5*t.xy)));

    gl_FragColor = vec4(
        mix(bg, colB, samp),
        1.0
    );
}
