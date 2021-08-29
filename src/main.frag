uniform sampler2D T;
uniform float t;

void main() {
    vec2 uv = gl_FragCoord.xy/vec2(1024,768);
    uv.y = 1.0 - uv.y;
    float samp = texture2D(T, uv).r;
    vec3 colA = 0.5 + 0.5*cos(t+uv.xyx+vec3(0,2,4));
    vec3 colB = 0.5 + 0.5*cos(t+3.0+uv.xyx+vec3(0,2,4));
    gl_FragColor = vec4(mix(colA,colB,samp),1.0);
}
