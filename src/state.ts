import { v2MulAdd, Bool, globalKeysDown, KeyCode, lerp, v2Lerp, Vec2, v2Reflect, radsLerp, v2Dot, v2Cross, curLevelObjectData, zzfx } from "./globals";
import { readWorldSample, requestWorldSample, worldSampleResult } from "./render";
import { SpriteState } from "./sprite";

declare const k_orbitSpeed: number;
declare const k_orbitBoost: number;
declare const k_gravitySuppressionTicks: number;
declare const k_gravity: number;
declare const k_walkAccel: number;
declare const k_walkDecel: number;
declare const k_maxRunSpeed: number;
declare const k_jumpSpeed: number;
declare const k_pumpGravity: number;
declare const k_stompSpeed: number;
declare const k_lateJumpTicks: number;
declare const k_maxFallSpeed: number;
declare const k_velocityLpfSize: number;
declare const k_turnAroundMultiplier: number;

export type GameState = {
    tick: number,
    fade: number,
    cameraZoom: number,
    cameraPos: Vec2,
    spriteState: SpriteState,
    spriteScaleX: -1|1,
    playerPos: Vec2,
    playerRot: number,
    playerEndState: PlayerEndState,
    canBeDone: number,
};

export const enum PlayerEndState {
    Alive,
    Dead,
    Won,
}

let playerCanJump: number;
let stompKeyDown: Bool;
let playerVel: Vec2;
let playerFromPlanet: Vec2 | 0;
let playerLandedOnce: Bool;
let zoomed: Bool;
let soundIndex: number;

let orbitOrigin: Vec2 | 0; // Doubles as flag for if we're currently in orbit
let orbitRadius: number; // Doubles as flag for if we've recently been in orbit
let orbitTheta: number;
let orbitOmega: number;
let gravitySuppressionCountdown: number;

let norm: Vec2;

let velocityLpf: Vec2[];

export let newGameState = (): GameState => (
    playerVel = [0,0],
    soundIndex =
    zoomed = 
    playerLandedOnce =
    stompKeyDown =
    playerCanJump =
    gravitySuppressionCountdown = 
    playerFromPlanet =
    orbitOrigin = 0,
    velocityLpf = [],
    {
        tick: 0,
        fade: 0,
        cameraZoom: 1.5,
        cameraPos: [0, 0],
        spriteState: SpriteState.Rolling,
        spriteScaleX: 1,
        playerPos: [0, 0],
        playerRot: 0,
        playerEndState: PlayerEndState.Alive,
        canBeDone: 0,
    }
);

export let lerpGameState = (a: GameState, b: GameState, t: number): GameState => ({
    tick: lerp(a.tick, b.tick, t),
    fade: lerp(a.fade, b.fade, t),
    cameraZoom: lerp(a.cameraZoom, b.cameraZoom, t),
    cameraPos: v2Lerp(a.cameraPos, b.cameraPos, t),
    spriteState: b.spriteState,
    spriteScaleX: b.spriteScaleX,
    playerPos: v2Lerp(a.playerPos, b.playerPos, t),
    playerRot: radsLerp(a.playerRot, b.playerRot, t),
    playerEndState: b.playerEndState,
    canBeDone: lerp(a.canBeDone, b.canBeDone, t),
});

export let tickGameState = (oldState: GameState, curLevel: number): GameState => {
    let newState = lerpGameState(oldState, oldState, 0);
    let groundRot = 0;

    newState.tick++;
    if( gravitySuppressionCountdown > 0 )
        gravitySuppressionCountdown--;

    if( newState.playerEndState == PlayerEndState.Alive ) {
        if( newState.fade < 1 ) {
            newState.fade += 0.1;
        }
    } else {
        if( newState.fade >= 0 ) {
            newState.fade -= 0.1;
        }
    }

    if( newState.playerEndState == PlayerEndState.Won )
    {
        newState.playerPos[0] += playerVel[0];
        newState.playerPos[1] += playerVel[1];
    }
    else
    {
        if( orbitOrigin )
        {
            orbitTheta += orbitOmega;

            playerFromPlanet = v2MulAdd(
                [0,0],
                [Math.cos(orbitTheta), Math.sin(orbitTheta)],
                orbitRadius
            );

            newState.playerPos = v2MulAdd(playerFromPlanet, orbitOrigin, 1);

            playerVel = v2MulAdd(
                [0,0],
                v2MulAdd(newState.playerPos, oldState.playerPos, -1),
                1 / k_orbitSpeed
            );

            if( globalKeysDown[KeyCode.Up] ) {
                zzfx(...[1.47,,115,.02,.07,,1,.37,6.3,,,,,,,,.03,.79,.01]); // Shoot 368
                playerVel = v2MulAdd( [0,0], playerVel, k_orbitBoost);
                //playerVel[1] -= k_jumpSpeed;
                orbitOrigin = 0;
                playerCanJump = 0;
                gravitySuppressionCountdown = k_gravitySuppressionTicks;
            }
        }
        else
        {
            let walkAccel = 0;

            if( newState.playerEndState == PlayerEndState.Alive )
            {
                if( globalKeysDown[KeyCode.Up] && playerCanJump ) {
                    playerVel[1] -= k_jumpSpeed;
                    playerCanJump = 0;
                    zzfx(...[1.43,,1487,,.03,.12,,.61,45,2.5,,.03,,.7,,.2,.05]);
                }

                if( globalKeysDown[KeyCode.Down] && !stompKeyDown ) {
                    zzfx(...[,,359,.05,,.05,1,2.62,-0.5,,,,,,39,,,,,.06]); // Random 295
                    if( playerVel[1] < k_stompSpeed ) {
                        playerVel[1] = k_stompSpeed;
                    }
                }

                walkAccel = globalKeysDown[KeyCode.Left] ? -k_walkAccel :
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
            }

            if( !playerFromPlanet || orbitRadius ) {
                if( playerCanJump && Math.sign(norm[0]) == Math.sign( walkAccel )) {
                    walkAccel *= v2Dot([0,-1], norm);
                }
                playerVel[0] += walkAccel;
                if( !gravitySuppressionCountdown )
                    playerVel[1] += k_gravity + (globalKeysDown[KeyCode.Down]|0) * k_pumpGravity;
            }

            if( playerVel[1] > k_maxFallSpeed ) {
                playerVel[1] = k_maxFallSpeed;
            }

            newState.playerPos = v2MulAdd(newState.playerPos, playerVel, 1);
            newState.playerPos[0] += playerVel[0];
            newState.playerPos[1] += playerVel[1];

            requestWorldSample(newState.playerPos);

            playerFromPlanet = 0;
            for( let i = 0; i < curLevelObjectData.length; ++i ) {
                if( curLevelObjectData[i][0] == 2 ) { 
                    let planetPos: Vec2 = [curLevelObjectData[i][1], curLevelObjectData[i][2]];
                    let playerFromPlanet0 = v2MulAdd(newState.playerPos, planetPos, -1);
                    let playerDistFromPlanetSqr = v2Dot(playerFromPlanet0, playerFromPlanet0);

                    if( playerDistFromPlanetSqr < curLevelObjectData[i][4]*curLevelObjectData[i][4] ) {
                        playerFromPlanet = playerFromPlanet0;

                        if( !orbitRadius && v2Dot(playerFromPlanet, playerVel) > 0 ) {
                            let R = Math.sqrt( playerDistFromPlanetSqr );
                            zzfx(...[1.08,,79,.05,.49,.67,,.45,,,1,.1,.16,,,.1,,.64,.04,.28]); // Powerup 370 - Mutation 1
                            orbitOrigin = planetPos;
                            orbitTheta = Math.atan2( playerFromPlanet[1], playerFromPlanet[0] );
                            orbitRadius = R;
                            orbitOmega = 
                                k_orbitSpeed * Math.sqrt(v2Dot(playerVel, playerVel)) / R
                                * Math.sign(v2Cross(playerVel, playerFromPlanet));
                        }
                    }
                }
            }
            if( !playerFromPlanet ) {
                orbitRadius = 0;
            }

            readWorldSample();
            norm = [worldSampleResult[0], worldSampleResult[1]];

            if( playerCanJump || norm[1] < -0.1 ) {
                if( worldSampleResult[2] < 1.5 ) {
                    groundRot = Math.atan2(worldSampleResult[4], -worldSampleResult[5]);
                } else {
                    groundRot = radsLerp(newState.playerRot, 0, 0.25);
                    if( playerCanJump > 0 ) playerCanJump--;
                }
                if( worldSampleResult[2] < 1.0 ) {
                    if( !playerCanJump ) {
                        if( playerLandedOnce ) {
                            //zzfx(...[1.03,,100,,.03,.08,4,1.17,8.6,-0.4,,,,,,.1,,.78,.03,.45]);
                            zzfx(...[2,,80,.01,.03,.18,1,.3,-0.2,-11.6,,,,,,,,,.01]); // Random 289
                            //zzfx(...[1.48,,348,,,.4,3,2.1,,,,,,.6,9,.6,.04,,,.44]); // Explosion 193
                        } else {
                            playerLandedOnce = Bool.True;
                        }
                    }
                    playerVel = v2Reflect(playerVel, norm, 0, 1);
                    newState.playerPos = v2MulAdd(newState.playerPos, norm, 1.0 - worldSampleResult[2]);
                    playerCanJump = k_lateJumpTicks;
                }
            } else {
                groundRot = radsLerp(newState.playerRot, 0, 0.25);
                if( worldSampleResult[2] < 1.0 ) {
                    playerVel = v2Reflect(playerVel, norm, 0, 1);
                    newState.playerPos = v2MulAdd(newState.playerPos, norm, 1.0 - worldSampleResult[2]);
                }
            }
        }

        if( orbitOrigin || playerFromPlanet && !orbitRadius ) {
            newState.playerRot = radsLerp(newState.playerRot, Math.atan2((playerFromPlanet as any)[0], -(playerFromPlanet as any)[1]), 0.75);
            newState.spriteState = SpriteState.Stomping;
        } else {
            newState.playerRot = groundRot;
            newState.spriteState = 
                playerCanJump ? SpriteState.Rolling :
                globalKeysDown[KeyCode.Down] ? SpriteState.Stomping :
                SpriteState.Jumping;
        }

        if( newState.playerPos[1] > 20 ) {
            newState.playerEndState = PlayerEndState.Dead;
        }
    }

    velocityLpf.push([playerVel[0], playerVel[1]]);
    if( velocityLpf.length > k_velocityLpfSize ) velocityLpf.shift();
    let velSum = velocityLpf.reduce((x,v)=>v2MulAdd(x,v,1),[0,0]);
    if(v2Dot(playerVel,playerVel) > .5*.5) {
        zoomed = Bool.True;
    }
    if( zoomed && newState.cameraZoom > 0.7 ) {
        newState.cameraZoom -= 0.01;
    }

    newState.cameraPos = v2MulAdd( [newState.playerPos[0], newState.playerPos[1]], velSum, 10 / k_velocityLpfSize );
    newState.cameraPos[1] = Math.min(newState.cameraPos[1], 10);

    if( curLevelObjectData.filter((x:any)=>!x[0]).length<1 ) {
        newState.canBeDone++;
    }

    for( let i = 0; i < curLevelObjectData.length; ++i ) {
        let ddd = v2MulAdd(newState.playerPos, curLevelObjectData[i].slice(1), -1);
        let dot = v2Dot(ddd, ddd);
        if(curLevelObjectData[i][0] == 1) {
            if(newState.playerEndState == PlayerEndState.Won) {
                playerVel = v2MulAdd([0,0], playerVel, 0.8);
            }
            if(newState.canBeDone && dot < 3*3 && newState.playerEndState != PlayerEndState.Won) {
                zzfx(...[2,0,1,.1,.3,1,3,.6,,.6,30+5*(curLevel%2),,.35,,,,.18,.78,.1,.46]); // Music 200
                newState.playerEndState = PlayerEndState.Won;
            }
        }
        if(!curLevelObjectData[i][0]) {
            if(dot < 4*4) {
                curLevelObjectData[i][1] += ddd[0] * Math.min(1, .5 / dot);
                curLevelObjectData[i][2] += ddd[1] * Math.min(1, .5 / dot);
            }
            if(dot < 3) {
                let f = 180*Math.pow(2, ([0,2,5,7])[soundIndex] / 12);
                soundIndex = (soundIndex + 1) % 4;
                zzfx(...[,0,f,.05,,.25,1,1.67,,,,,,,9,.1,,.71,.15]);
                curLevelObjectData.splice(i, 1);
                i--;
            }
        }
    }

    stompKeyDown = globalKeysDown[KeyCode.Down];

    return newState;
};

