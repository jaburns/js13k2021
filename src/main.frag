uniform sampler2D T;
uniform vec4 t;

void main() {
    vec2 uv = gl_FragCoord.xy/vec2(1024,768);
    uv.y = 1.0 - uv.y;
    float samp = texture2D(T, uv).r;
    vec3 colA = 0.5 + 0.5*cos(t.w+uv.xyx+vec3(0,2,4));
    vec3 colB = 0.5 + 0.5*cos(t.w+3.0+uv.xyx+vec3(0,2,4));

    //float zoom = cameraZoom * baseScale;
    float zoom = t.z * 21.0;
    vec2 worldPos = (gl_FragCoord.xy - (0.5*vec2(1024,768)));
    worldPos.y *= -1.0;
    worldPos = worldPos / zoom + t.xy;

    if( worldPos.y > 10.0 ) {
        samp = 1.0;
    }

    gl_FragColor = vec4(mix(colA,colB,samp),1.0);
}
