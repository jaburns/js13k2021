attribute vec4 a;
uniform vec4 P0, P1;

void main()
{
    gl_Position = P0+P1*a;
}
