import { Bool, globalKeysDown, KeyCode, TICK_MS } from './globals';
import { GameState, lerpGameState, newGameState, tickGameState } from "./state";
import { initRender, renderState } from "./render";
import { tickSprite } from './sprite';

let accTime = 0;
let prevNow = performance.now();

let curState = newGameState() as GameState;
let prevState = newGameState() as GameState;

let tick = () => {
    prevState = curState;
    curState = tickGameState(curState);
    tickSprite(curState.spriteState);
};

let frame = () => {
    requestAnimationFrame(frame);

    let newNow = performance.now();
    let dt = Math.min( newNow - prevNow, 1000 );
    accTime += dt;
    prevNow = newNow;

    while( accTime > TICK_MS ) {
        accTime -= TICK_MS;
        tick();
        globalKeysDown[KeyCode.Up] = globalKeysDown[KeyCode.Down] = Bool.False;
    }

    renderState(lerpGameState(prevState, curState, accTime / TICK_MS));
};

initRender();
frame();
