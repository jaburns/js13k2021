import {v2Add, Bool, False, globalKeysDown, KeyCode, lerp, v2Lerp, True, Vec2, v2Dot} from "./globals";
import {readWorldSample, requestWorldSample, worldSampleResult} from "./render";
import {SpriteState} from "./sprite";

export type GameState = {
    tick: number,
    cameraZoom: number,
    cameraPos: Vec2,
    spriteState: SpriteState,
    spriteScaleX: -1|1,

    playerPos: Vec2,
    playerVel: Vec2,
};

export let newGameState = (): GameState => ({
    tick: 0,
    cameraZoom: 1,
    cameraPos: [0, 0],
    spriteState: SpriteState.Rolling,
    spriteScaleX: 1,

    playerPos: [100, 0],
    playerVel: [0, 0],
});

export let lerpGameState = (a: GameState, b: GameState, t: number): GameState => ({
    tick: lerp(a.tick, b.tick, t),
    cameraZoom: lerp(a.cameraZoom, b.cameraZoom, t),
    cameraPos: v2Lerp(a.cameraPos, b.cameraPos, t),
    spriteState: b.spriteState,
    spriteScaleX: b.spriteScaleX,

    playerPos: v2Lerp(a.playerPos, b.playerPos, t),
    playerVel: v2Lerp(a.playerVel, b.playerVel, t),
});

export let tickGameState = (oldState: GameState): GameState => {
    let newState = lerpGameState(oldState, oldState, 0);

    newState.tick++;

    if( globalKeysDown[KeyCode.Up] ) {
        newState.playerVel[1] = -1;
        newState.spriteState = SpriteState.Jumping;
    }

    if( globalKeysDown[KeyCode.Left] ) {
        newState.playerVel[0] -= 0.01;
        newState.spriteScaleX = -1;
    }
    else if( globalKeysDown[KeyCode.Right] ) {
        newState.playerVel[0] += 0.01;
        newState.spriteScaleX = 1;
    }
    else {
        newState.playerVel[0] *= 0.95;
    }

    newState.playerVel[1] += 0.1;

    newState.playerPos = v2Add(1, newState.playerPos, newState.playerVel);
    newState.playerPos[0] += newState.playerVel[0];
    newState.playerPos[1] += newState.playerVel[1];

    requestWorldSample(newState.playerPos);
    readWorldSample();

    if( worldSampleResult[2] < 1.0 ) {
        let norm: Vec2 = [worldSampleResult[0], worldSampleResult[1]];
        newState.playerVel = v2Add(v2Dot(newState.playerVel, norm), newState.playerVel, newState.playerVel);
        newState.playerPos = v2Add(1.0 - worldSampleResult[2], newState.playerPos, norm);
        newState.spriteState = SpriteState.Rolling;

        console.log(worldSampleResult[0], worldSampleResult[1]);
    }

    newState.cameraPos[0] += (newState.playerPos[0] - newState.cameraPos[0]) * 0.5;
    newState.cameraPos[1] += (newState.playerPos[1] - newState.cameraPos[1]) * 0.5;

    return newState;
};

