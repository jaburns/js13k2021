import { v2MulAdd, Bool, globalKeysDown, KeyCode, lerp, v2Lerp, Vec2, v2Reflect, radsLerp, v2Dot, v2Cross } from "./globals";
import { readWorldSample, requestWorldSample, worldSampleResult } from "./render";
import { SpriteState } from "./sprite";

declare const k_orbitSpeed: number;
declare const k_gravity: number;
declare const k_walkAccel: number;
declare const k_maxRunSpeed: number;
declare const k_jumpSpeed: number;
declare const k_stompSpeed: number;
declare const k_maxFallSpeed: number;
declare const k_turnAroundMultiplier: number;

export type GameState = {
    tick: number,
    cameraZoom: number,
    cameraPos: Vec2,
    spriteState: SpriteState,
    spriteScaleX: -1|1,

    playerPos: Vec2,
    playerVel: Vec2,
    playerRot: number,
    playerCanJump: Bool,
    playerStomped: Bool,

    orbitOrigin: Vec2 | 0, // Doubles as flag for if we're currently in orbit
    orbitRadius: number,
    orbitBigRadius: number, // Doubles as flag for if we've recently been in orbit
    orbitSquashTheta: number,
    orbitTheta: number,
    orbitOmega: number,
};

// We can just leave out falsy things whose initial values don't matter
export let newGameState = (): Partial<GameState> => ({
    tick: 0,
    cameraZoom: 1,
    cameraPos: [0, 0],
    spriteState: SpriteState.Rolling,
    spriteScaleX: 1,

    playerPos: [50, 0],
    playerVel: [0, 0],
    playerRot: 0,
});

export let lerpGameState = (a: GameState, b: GameState, t: number): GameState => ({
    tick: lerp(a.tick, b.tick, t),
    cameraZoom: lerp(a.cameraZoom, b.cameraZoom, t),
    cameraPos: v2Lerp(a.cameraPos, b.cameraPos, t),
    spriteState: b.spriteState,
    spriteScaleX: b.spriteScaleX,

    playerPos: v2Lerp(a.playerPos, b.playerPos, t),
    playerVel: b.playerVel,
    playerRot: radsLerp(a.playerRot, b.playerRot, t),
    playerCanJump: b.playerCanJump,
    playerStomped: b.playerStomped,

    orbitOrigin: b.orbitOrigin,
    orbitRadius: b.orbitRadius,
    orbitBigRadius: b.orbitBigRadius, 
    orbitSquashTheta: b.orbitSquashTheta,
    orbitTheta: b.orbitTheta,
    orbitOmega: b.orbitOmega,
});

let PLANET_POS: Vec2 = [110.0, -8.0];
let PLANET_R1 = 10.0;

export let tickGameState = (oldState: GameState): GameState => {
    let newState = lerpGameState(oldState, oldState, 0);
    let groundRot = 0;
    let playerFromPlanet: Vec2 | undefined;
    let playerDistFromPlanetSqr: number;

    newState.tick++;

    if( newState.orbitOrigin )
    {
        newState.orbitTheta += newState.orbitOmega;

        playerFromPlanet = v2MulAdd(
            [0,0],
            [Math.cos(newState.orbitTheta), Math.sin(newState.orbitTheta)],
            newState.orbitRadius
        );

        playerFromPlanet = [
              Math.cos(-newState.orbitSquashTheta)*playerFromPlanet[0]
            - Math.sin(-newState.orbitSquashTheta)*playerFromPlanet[1],
              Math.sin(-newState.orbitSquashTheta)*playerFromPlanet[0]
            + Math.cos(-newState.orbitSquashTheta)*playerFromPlanet[1]
        ];

        playerFromPlanet[1] *= newState.orbitBigRadius / newState.orbitRadius;

        playerFromPlanet = [
              Math.cos(newState.orbitSquashTheta)*playerFromPlanet[0]
            - Math.sin(newState.orbitSquashTheta)*playerFromPlanet[1],
              Math.sin(newState.orbitSquashTheta)*playerFromPlanet[0]
            + Math.cos(newState.orbitSquashTheta)*playerFromPlanet[1]
        ];

        newState.playerPos = v2MulAdd(playerFromPlanet, newState.orbitOrigin, 1);
        newState.cameraZoom = lerp(newState.cameraZoom, 0.75, 0.1);

        if( globalKeysDown[KeyCode.Up] ) {
            newState.playerVel = v2MulAdd(
                [0,-k_jumpSpeed],
                v2MulAdd(newState.playerPos, oldState.playerPos, -1),
                1 / k_orbitSpeed
            );
            newState.orbitOrigin = 0;
            newState.playerCanJump = Bool.False;
            newState.playerStomped = Bool.False;
        }
    }
    else
    {
        newState.cameraZoom = lerp(newState.cameraZoom, 1.0, 0.25);

        if( globalKeysDown[KeyCode.Up] && newState.playerCanJump ) {
            newState.playerVel[1] -= k_jumpSpeed;
            newState.playerCanJump = Bool.False;
        }

        if( !newState.playerCanJump && !newState.playerStomped && globalKeysDown[KeyCode.Down] ) {
            newState.playerVel[1] = k_stompSpeed;
            newState.playerStomped = Bool.True;
            newState.playerCanJump = Bool.False;
        }

        let walkAccel = globalKeysDown[KeyCode.Left] ? -k_walkAccel :
            globalKeysDown[KeyCode.Right] ? k_walkAccel : 0;

        if( walkAccel * newState.playerVel[0] < -.0001 ) {
            walkAccel *= k_turnAroundMultiplier;
        } else if (Math.abs(newState.playerVel[0]) > k_maxRunSpeed) {
            walkAccel = 0;
        }

        globalKeysDown[KeyCode.Left] && (newState.spriteScaleX = -1);
        globalKeysDown[KeyCode.Right] && (newState.spriteScaleX = 1);

        playerFromPlanet = v2MulAdd(newState.playerPos, PLANET_POS, -1);
        playerDistFromPlanetSqr = v2Dot(playerFromPlanet, playerFromPlanet);

        if( playerDistFromPlanetSqr > PLANET_R1*PLANET_R1 || newState.orbitBigRadius ) {
            newState.playerVel[0] += walkAccel;
            newState.playerVel[1] += k_gravity;
        }

        if( newState.playerVel[1] > k_maxFallSpeed ) {
            newState.playerVel[1] = k_maxFallSpeed;
        }

        newState.playerPos = v2MulAdd(newState.playerPos, newState.playerVel, 1);
        newState.playerPos[0] += newState.playerVel[0];
        newState.playerPos[1] += newState.playerVel[1];

        requestWorldSample(newState.playerPos);

        playerFromPlanet = v2MulAdd(newState.playerPos, PLANET_POS, -1);
        playerDistFromPlanetSqr = v2Dot(playerFromPlanet, playerFromPlanet);

        if( playerDistFromPlanetSqr < PLANET_R1*PLANET_R1 ) {
            if( !newState.orbitBigRadius && v2Dot(playerFromPlanet, newState.playerVel) > 0 ) {
                let R = Math.sqrt( playerDistFromPlanetSqr );
                newState.orbitOrigin = PLANET_POS;
                newState.orbitSquashTheta = 
                newState.orbitTheta = Math.atan2( playerFromPlanet[1], playerFromPlanet[0] );
                newState.orbitRadius = R;
                newState.orbitBigRadius = PLANET_R1;
                newState.orbitOmega = 
                    k_orbitSpeed * Math.sqrt(v2Dot(newState.playerVel, newState.playerVel)) / PLANET_R1
                    * Math.sign(v2Cross(newState.playerVel, playerFromPlanet));
            }
        } else {
            newState.orbitBigRadius = 0;
        }

        readWorldSample();
        let norm: Vec2 = [worldSampleResult[0], worldSampleResult[1]];

        if( worldSampleResult[2] < 1.5 ) {
            groundRot = Math.atan2(norm[0], -norm[1]);
        } else {
            groundRot = radsLerp(newState.playerRot, 0, 0.25);
        }
        if( worldSampleResult[2] < 1.0 ) {
            newState.playerVel = v2Reflect(newState.playerVel, norm, 0, 1);
            newState.playerPos = v2MulAdd(newState.playerPos, norm, 1.0 - worldSampleResult[2]);
            newState.playerCanJump = Bool.True;
            newState.playerStomped = Bool.False;
        }
    }

    if( newState.orbitOrigin || playerDistFromPlanetSqr! < PLANET_R1*PLANET_R1 && !newState.orbitBigRadius ) {
        newState.playerRot = radsLerp(newState.playerRot, Math.atan2(playerFromPlanet[0], -playerFromPlanet[1]), 0.75);
        newState.spriteState = SpriteState.Stomping;
    } else {
        newState.playerRot = groundRot;
        newState.spriteState = 
            newState.playerStomped ? SpriteState.Stomping
            : newState.playerCanJump ? SpriteState.Rolling 
            : SpriteState.Jumping;
    }

    newState.cameraPos[0] += (newState.playerPos[0] - newState.cameraPos[0]) * 0.5;
    newState.cameraPos[1] += (newState.playerPos[1] - newState.cameraPos[1]) * 0.5;

    return newState;
};

