import { Bool, globalKeysDown, KeyCode, TICK_MS } from './globals';
import { GameState, lerpGameState, newGameState, tickGameState } from "./state";
import { initRender, loadLevel, renderState } from "./render";
import { tickSprite } from './sprite';

let accTime = 0;
let prevNow = performance.now();

let curState: GameState;
let prevState: GameState;

curState = prevState = newGameState();

let tick = () => {
    prevState = curState;
    curState = tickGameState(curState);
    tickSprite(curState.spriteState);
};

//let heldSpace = false;

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

    //if( globalKeysDown[KeyCode.Space] && !heldSpace ) {
    //    heldSpace = true;
    //    curState = prevState = newGameState();
    //    loadLevel(Math.round(Math.random()));
    //}
    //if( !globalKeysDown[KeyCode.Space] ) {
    //    heldSpace = false;
    //}

    renderState(lerpGameState(prevState, curState, accTime / TICK_MS));
};

initRender();
loadLevel(Math.floor(Math.random()));
frame();
