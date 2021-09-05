import { v2MulAdd, Bool, globalKeysDown, KeyCode, lerp, v2Lerp, Vec2, v2Reflect, radsLerp, v2Dot, v2Cross } from "./globals";
import { readWorldSample, requestWorldSample, worldSampleResult } from "./render";
import { SpriteState } from "./sprite";

declare const k_orbitSpeed: number;
declare const k_gravity: number;
declare const k_walkAccel: number;
declare const k_walkDecel: number;
declare const k_maxRunSpeed: number;
declare const k_jumpSpeed: number;
declare const k_stompSpeed: number;
declare const k_lateJumpTicks: number;
declare const k_maxFallSpeed: number;
declare const k_velocityLpfSize: number;
declare const k_turnAroundMultiplier: number;

export type GameState = {
    tick: number,
    cameraZoom: number,
    cameraPos: Vec2,
    spriteState: SpriteState,
    spriteScaleX: -1|1,
    playerPos: Vec2,
    playerRot: number,
};

let playerCanJump: number;
let playerStomped: Bool;
let playerVel: Vec2 = [0, 0];

let orbitOrigin: Vec2 | 0; // Doubles as flag for if we're currently in orbit
let orbitRadius: number;
let orbitBigRadius: number; // Doubles as flag for if we've recently been in orbit
let orbitSquashTheta: number;
let orbitTheta: number;
let orbitOmega: number;
let velocityLpf: Vec2[] = [];

// We can just leave out falsy things whose initial values don't matter
export let newGameState = (): GameState => ({
    tick: 0,
    cameraZoom: 1,
    cameraPos: [0, 0],
    spriteState: SpriteState.Rolling,
    spriteScaleX: 1,
    playerPos: [0, 0],
    playerRot: 0,
});

export let lerpGameState = (a: GameState, b: GameState, t: number): GameState => ({
    tick: lerp(a.tick, b.tick, t),
    cameraZoom: lerp(a.cameraZoom, b.cameraZoom, t),
    cameraPos: v2Lerp(a.cameraPos, b.cameraPos, t),
    spriteState: b.spriteState,
    spriteScaleX: b.spriteScaleX,
    playerPos: v2Lerp(a.playerPos, b.playerPos, t),
    playerRot: radsLerp(a.playerRot, b.playerRot, t),
});

let PLANET_POS: Vec2 = [110.0, -8.0];
let PLANET_R1 = 10.0;

export let tickGameState = (oldState: GameState): GameState => {
    let newState = lerpGameState(oldState, oldState, 0);
    let groundRot = 0;
    let playerFromPlanet: Vec2 | undefined;
    let playerDistFromPlanetSqr: number;

    newState.tick++;

    if( orbitOrigin )
    {
        orbitTheta += orbitOmega;

        playerFromPlanet = v2MulAdd(
            [0,0],
            [Math.cos(orbitTheta), Math.sin(orbitTheta)],
            orbitRadius
        );

        playerFromPlanet = [
              Math.cos(-orbitSquashTheta)*playerFromPlanet[0]
            - Math.sin(-orbitSquashTheta)*playerFromPlanet[1],
              Math.sin(-orbitSquashTheta)*playerFromPlanet[0]
            + Math.cos(-orbitSquashTheta)*playerFromPlanet[1]
        ];

        playerFromPlanet[1] *= orbitBigRadius / orbitRadius;

        playerFromPlanet = [
              Math.cos(orbitSquashTheta)*playerFromPlanet[0]
            - Math.sin(orbitSquashTheta)*playerFromPlanet[1],
              Math.sin(orbitSquashTheta)*playerFromPlanet[0]
            + Math.cos(orbitSquashTheta)*playerFromPlanet[1]
        ];

        newState.playerPos = v2MulAdd(playerFromPlanet, orbitOrigin, 1);
        newState.cameraZoom = lerp(newState.cameraZoom, 0.75, 0.1);

        playerVel = v2MulAdd(
            [0,0],
            v2MulAdd(newState.playerPos, oldState.playerPos, -1),
            1 / k_orbitSpeed
        );

        if( globalKeysDown[KeyCode.Up] ) {
            playerVel[1] -= k_jumpSpeed;
            orbitOrigin = 0;
            playerCanJump = 0;
            playerStomped = Bool.False;
        }
    }
    else
    {
        newState.cameraZoom = lerp(newState.cameraZoom, 1.0, 0.25);

        if( globalKeysDown[KeyCode.Up] && playerCanJump ) {
            playerVel[1] -= k_jumpSpeed;
            playerCanJump = 0;
        }

        if( !playerCanJump && !playerStomped && globalKeysDown[KeyCode.Down] ) {
            playerVel[1] = k_stompSpeed;
            playerStomped = Bool.True;
        }

        let walkAccel = globalKeysDown[KeyCode.Left] ? -k_walkAccel :
            globalKeysDown[KeyCode.Right] ? k_walkAccel : 0;

        if( walkAccel * playerVel[0] < -.0001 ) {
            walkAccel *= k_turnAroundMultiplier;
        } else if (Math.abs(playerVel[0]) > k_maxRunSpeed) {
            walkAccel = 0;
        }

        if( playerCanJump && !globalKeysDown[KeyCode.Left] && !globalKeysDown[KeyCode.Right] ) {
            if( Math.abs(playerVel[0]) > k_walkDecel ) {
                walkAccel = -Math.sign(playerVel[0]) * k_walkDecel;
            } else {
                walkAccel = -playerVel[0];
            }
        }

        globalKeysDown[KeyCode.Left] && (newState.spriteScaleX = -1);
        globalKeysDown[KeyCode.Right] && (newState.spriteScaleX = 1);

        playerFromPlanet = v2MulAdd(newState.playerPos, PLANET_POS, -1);
        playerDistFromPlanetSqr = v2Dot(playerFromPlanet, playerFromPlanet);

        if( playerDistFromPlanetSqr > PLANET_R1*PLANET_R1 || orbitBigRadius ) {
            playerVel[0] += walkAccel;
            playerVel[1] += k_gravity;
        }

        if( playerVel[1] > k_maxFallSpeed ) {
            playerVel[1] = k_maxFallSpeed;
        }

        newState.playerPos = v2MulAdd(newState.playerPos, playerVel, 1);
        newState.playerPos[0] += playerVel[0];
        newState.playerPos[1] += playerVel[1];

        requestWorldSample(newState.playerPos);

        playerFromPlanet = v2MulAdd(newState.playerPos, PLANET_POS, -1);
        playerDistFromPlanetSqr = v2Dot(playerFromPlanet, playerFromPlanet);

        if( playerDistFromPlanetSqr < PLANET_R1*PLANET_R1 ) {
            if( !orbitBigRadius && v2Dot(playerFromPlanet, playerVel) > 0 ) {
                let R = Math.sqrt( playerDistFromPlanetSqr );
                orbitOrigin = PLANET_POS;
                orbitSquashTheta = 
                orbitTheta = Math.atan2( playerFromPlanet[1], playerFromPlanet[0] );
                orbitRadius = R;
                orbitBigRadius = PLANET_R1;
                orbitOmega = 
                    k_orbitSpeed * Math.sqrt(v2Dot(playerVel, playerVel)) / PLANET_R1
                    * Math.sign(v2Cross(playerVel, playerFromPlanet));
            }
        } else {
            orbitBigRadius = 0;
        }

        readWorldSample();
        let norm: Vec2 = [worldSampleResult[0], worldSampleResult[1]];

        if( worldSampleResult[2] < 1.5 ) {
            groundRot = Math.atan2(norm[0], -norm[1]);
        } else {
            groundRot = radsLerp(newState.playerRot, 0, 0.25);
            if( playerCanJump > 0 ) playerCanJump--;
        }
        if( worldSampleResult[2] < 1.0 ) {
            playerVel = v2Reflect(playerVel, norm, 0, 1);
            newState.playerPos = v2MulAdd(newState.playerPos, norm, 1.0 - worldSampleResult[2]);
            playerCanJump = k_lateJumpTicks;
            playerStomped = Bool.False;
        }
    }
        

    if( orbitOrigin || playerDistFromPlanetSqr! < PLANET_R1*PLANET_R1 && !orbitBigRadius ) {
        newState.playerRot = radsLerp(newState.playerRot, Math.atan2(playerFromPlanet[0], -playerFromPlanet[1]), 0.75);
        newState.spriteState = SpriteState.Stomping;
    } else {
        newState.playerRot = groundRot;
        newState.spriteState = 
            playerStomped ? SpriteState.Stomping
            : playerCanJump ? SpriteState.Rolling 
            : SpriteState.Jumping;
    }

    velocityLpf.push([playerVel[0], playerVel[1]]);
    if( velocityLpf.length > k_velocityLpfSize ) velocityLpf.shift();
    let velSum = velocityLpf.reduce((x,v)=>v2MulAdd(x,v,1),[0,0]);

    newState.cameraZoom = 1;
    newState.cameraPos = v2MulAdd( [newState.playerPos[0], newState.playerPos[1]], velSum, 10 / k_velocityLpfSize );

    return newState;
};

