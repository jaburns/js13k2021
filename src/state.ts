import { v2MulAdd, Bool, globalKeysDown, KeyCode, lerp, v2Lerp, Vec2, v2Reflect, radsLerp, v2Dot, v2Cross, curLevelObjectData, zzfx, smoothstep, ticksToTime } from "./globals";
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
    isDone: number,
    selectedLevel: number,
};

export const enum PlayerEndState {
    Alive,
    Dead,
    Won,
    Quit,
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
let seenMenuOnce: Bool = 0;

let norm: Vec2;

let velocityLpf: Vec2[];
let keysDown: typeof globalKeysDown;

export let newGameState = (curLevel: number, selectedLevel: number): GameState => (
    playerVel = [0,0],
    soundIndex =
    zoomed = 
    playerLandedOnce =
    stompKeyDown =
    playerCanJump =
    gravitySuppressionCountdown = 
    playerFromPlanet =
    orbitOrigin = 0,
    keysDown = curLevel ? globalKeysDown : {},
    velocityLpf = [],
    {
        tick: seenMenuOnce && !curLevel ? 1000 : 0,
        fade: 0,
        cameraZoom: curLevel ? 1.5 : 3,
        cameraPos: [0, 0],
        spriteState: SpriteState.Rolling,
        spriteScaleX: 1,
        playerPos: seenMenuOnce && !curLevel ? [106.4, 18.7] : [0, 0],
        playerRot: 0,
        playerEndState: PlayerEndState.Alive,
        isDone: 0,
        canBeDone: 0,
        selectedLevel: (curLevel?0:selectedLevel),
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
    isDone: b.isDone,
    canBeDone: lerp(a.canBeDone, b.canBeDone, t),
    selectedLevel: b.selectedLevel,
});

export let tickGameState = (oldState: GameState, curLevel: number, saveState: number[], saveStateLen: number): GameState => {
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
            newState.fade -= newState.playerEndState == PlayerEndState.Won ? 0.04 : 0.1;
        }
    }

    if( !curLevel ) {
        seenMenuOnce = 1;

        if( newState.tick > 15 && newState.tick < 25 ) {
            keysDown = { [KeyCode.Right]: Bool.True, [KeyCode.Up]: Bool.True };
        } else {
            keysDown = {};
        }

        if( newState.tick > 200 && newState.playerEndState != PlayerEndState.Won ) {
            let fx = () => zzfx(...[1.56,.1,367,.01,.07,.08,1,.5,-4,,,,,,,,.09,0,.05]); // Shoot 441
            if( globalKeysDown[KeyCode.Left] ) fx(), newState.selectedLevel--;
            if( globalKeysDown[KeyCode.Right] ) fx(), newState.selectedLevel++;
            if( globalKeysDown[KeyCode.Up] ) fx(), newState.selectedLevel-=7;
            if( globalKeysDown[KeyCode.Down] ) fx(), newState.selectedLevel+=7;
            newState.selectedLevel = Math.max(0,Math.min(Math.min(27,saveStateLen),newState.selectedLevel));
            if( globalKeysDown[KeyCode.Enter] ) {
                zzfx(...[2,0,1,.1,.3,1,3,.6,,.6,30+5*(curLevel%2),,.35,,,,.18,.78,.1,.46]); // Music 200
                newState.playerEndState = PlayerEndState.Won;
            }
        }
    } else {
        if( globalKeysDown[KeyCode.Esc] && newState.playerEndState == PlayerEndState.Alive ) {
            newState.playerEndState = PlayerEndState.Quit;
        }
    }

    if( newState.playerEndState == PlayerEndState.Won )
    {
        newState.isDone++;
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

            if( keysDown[KeyCode.Up] ) {
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

            if( newState.fade > .99 && newState.playerEndState == PlayerEndState.Alive )
            {
                if( keysDown[KeyCode.Up] && playerCanJump ) {
                    playerVel[1] -= k_jumpSpeed;
                    playerCanJump = 0;
                    zzfx(...[1.43,,1487,,.03,.12,,.61,45,2.5,,.03,,.7,,.2,.05]);
                }

                if( keysDown[KeyCode.Down] && !stompKeyDown ) {
                    zzfx(...[1.56,.1,367,.01,.07,.08,1,.5,-4,,,,,,,,.09,0,.05]); // Shoot 441
                    if( playerVel[1] < k_stompSpeed ) {
                        playerVel[1] = k_stompSpeed;
                    }
                }

                walkAccel = keysDown[KeyCode.Left] ? -k_walkAccel :
                    keysDown[KeyCode.Right] ? k_walkAccel : 0;

                if( walkAccel * playerVel[0] < -.0001 ) {
                    walkAccel *= k_turnAroundMultiplier;
                } else if (Math.abs(playerVel[0]) > k_maxRunSpeed) {
                    walkAccel = 0;
                }

                if( playerCanJump && !keysDown[KeyCode.Left] && !keysDown[KeyCode.Right] ) {
                    if( Math.abs(playerVel[0]) > k_walkDecel ) {
                        walkAccel = -Math.sign(playerVel[0]) * k_walkDecel;
                    } else {
                        walkAccel = -playerVel[0];
                    }
                }

                keysDown[KeyCode.Left] && (newState.spriteScaleX = -1);
                keysDown[KeyCode.Right] && (newState.spriteScaleX = 1);
            }

            if( !playerFromPlanet || orbitRadius ) {
                if( playerCanJump && Math.sign(norm[0]) == Math.sign( walkAccel )) {
                    walkAccel *= v2Dot([0,-1], norm);
                }
                playerVel[0] += walkAccel;
                if( !gravitySuppressionCountdown )
                    playerVel[1] += k_gravity + (keysDown[KeyCode.Down]|0) * k_pumpGravity;
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
                if( curLevel && curLevelObjectData[i][0] == 2 ) { 
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
            let kind = worldSampleResult[3];

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
                            if( kind < .5 )
                                zzfx(...[2,,80,.01,.03,.18,1,.3,-0.2,-11.6,,,,,,,,,.01]); // Random 289
                        } else {
                            playerLandedOnce = Bool.True;
                        }
                    }
                    playerVel = v2Reflect(playerVel, norm, kind, 1);
                    newState.playerPos = v2MulAdd(newState.playerPos, norm, 1.0 - worldSampleResult[2]);
                    playerCanJump = k_lateJumpTicks;

                    if( kind > .5 )
                        zzfx(...[1.5,,355,.03,,.45,1,.9,,,120,.19,.06,.2,6.9,,,.9,.02]); // Powerup 445
                }
            } else {
                groundRot = radsLerp(newState.playerRot, 0, 0.25);
                if( worldSampleResult[2] < 1.0 ) {
                    playerVel = v2Reflect(playerVel, norm, kind, 1);
                    newState.playerPos = v2MulAdd(newState.playerPos, norm, 1.0 - worldSampleResult[2]);

                    if( kind > .5 )
                        zzfx(...[1.5,,355,.03,,.45,1,.9,,,120,.19,.06,.2,6.9,,,.9,.02]); // Powerup 445
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
                keysDown[KeyCode.Down] ? SpriteState.Stomping :
                SpriteState.Jumping;
        }

        if( curLevel && newState.playerPos[1] > 20 ) {
            newState.playerEndState = PlayerEndState.Dead;
        }
    }

    velocityLpf.push([playerVel[0], playerVel[1]]);
    if( velocityLpf.length > k_velocityLpfSize ) velocityLpf.shift();
    let velSum = velocityLpf.reduce((x,v)=>v2MulAdd(x,v,1),[0,0]);
    if(v2Dot(playerVel,playerVel) > .5*.5) {
        zoomed = Bool.True;
    }
    if( curLevel && zoomed && newState.cameraZoom > 0.7 ) {
        newState.cameraZoom -= 0.01;
    }

    newState.cameraPos = v2MulAdd( [newState.playerPos[0], newState.playerPos[1]], velSum, 10 / k_velocityLpfSize );
    newState.cameraPos[1] = Math.min(newState.cameraPos[1], curLevel ? 10 : 100);

    if( !curLevel ) {
        //newState.tick = 1000; // Jump to menu
        newState.cameraPos = v2Lerp(newState.cameraPos, [155,32], smoothstep(100,300,newState.tick));
        let zzz = smoothstep(50,300,newState.tick);
        newState.cameraZoom = lerp(3, 0.4, 1-(1-zzz)*(1-zzz));

        if( !globalKeysDown[0] ) {
            newState.tick = 0;
            return newState;
        }
    }

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
                if( !saveState[curLevel-1] || newState.tick <= saveState[curLevel-1] ) {
                    saveState[curLevel-1] = newState.tick-1;
                }
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

    stompKeyDown = keysDown[KeyCode.Down];

    return newState;
};

