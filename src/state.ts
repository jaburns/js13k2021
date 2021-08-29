import {globalKeysDown, KeyCode, lerp, lerpVec2, Vec2} from "./globals";
import {SpriteState} from "./sprite";

export type GameState = {
    tick: number,
    cameraZoom: number,
    cameraPos: Vec2,
    spriteState: SpriteState,
};

export let newGameState = (): GameState => ({
    tick: 0,
    cameraZoom: 1,
    cameraPos: [0, 0],
    spriteState: SpriteState.Rolling,
});

export let lerpGameState = (a: GameState, b: GameState, t: number): GameState => ({
    tick: b.tick,
    cameraZoom: lerp(a.cameraZoom, b.cameraZoom, t),
    cameraPos: lerpVec2(a.cameraPos, b.cameraPos, t),
    spriteState: b.spriteState,
});

export let tickGameState = (oldState: GameState): GameState => {
    let newState = lerpGameState(oldState, oldState, 0);

    newState.tick++;

    if( globalKeysDown[KeyCode.Up] )
        newState.spriteState = SpriteState.Jumping;
    else if( globalKeysDown[KeyCode.Down] )
        newState.spriteState = SpriteState.Stomping;
    else
        newState.spriteState = SpriteState.Rolling;

    newState.cameraPos = [Math.cos(newState.tick/10), Math.sin(newState.tick/10)];
    //newState.cameraPos = [newState.tick, newState.tick];

    return newState;
};

