import { gl_COLOR_BUFFER_BIT } from "./glConsts";

declare const DEBUG: boolean;
declare const g: WebGLRenderingContext;

if( DEBUG ) {
    console.log('hello debug');
} else {
    console.log('hello release');
}

g.viewport(0,0,1,1);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);
g.viewport(0,0,1,1);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);
g.viewport(0,0,1,1);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);
g.clearColor(1,0,0,1);
g.clear(gl_COLOR_BUFFER_BIT);

