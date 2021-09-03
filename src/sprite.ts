import { GameState } from './state';

declare const c: CanvasRenderingContext2D;
declare const k_fullWidth: number;
declare const k_fullHeight: number;
declare const k_baseScale: number;
declare const k_spriteScale: number;

let animData: any = [
    [
        [0,true,0,-172,0,[[0,100,0,0],[2,0,220,12,-110,-14],[1,26,0,-27,30,-27,50,-27,160,-27]]],
        [12,true,0,-172,0,[[0,100,0,0],[2,0,220,12,-110,-14],[1,26,0,-27,30,-27,50,-27,160,-27]]],
        [17,true,0,-172,0.4,[[0,100,0,0],[2,0,220,12,-110,-14],[1,26,0,-27,30,-27,50,-27,160,-27]]],
        [100,false],[101,false]
    ],
    [
        [0,true,0,-50,0,[ [2,1,110,130,-55,0], [2,1,64,50,-32,-40], [1,50,21,0,61,9,110,46,132,98], [1,50,-21,0,-64,9,-115,42,-132,104], [1,50,-12,119,-56,128,-89,162,-106,223], [1,50,12,119,56,128,89,162,106,223] ]],
        [5,true,0,-50,0,[ [2,1,110,130,-55,0], [2,1,64,50,-32,-40], [1,50,21,0,74,-22,126,-6,162,26], [1,50,-21,0,-74,-19,-147,-29,-169,37], [1,50,-3,120,-75,121,-106,169,-123,254], [1,50,9,119,55,122,113,97,53,164] ]],
        [9,true,0,-50,0,[ [2,1,110,130,-55,0], [2,1,64,50,-32,-40], [1,50,21,0,75,-13,136,-26,191,-65], [1,50,-21,0,-76,-9,-126,-24,-167,-50], [1,50,-3,120,-89,105,-155,138,-96,202], [1,50,7,122,50,129,122,145,184,174] ]],
        [12,true,0,-50,0,[ [2,1,110,130,-55,0], [2,1,64,50,-32,-40], [1,50,21,0,75,-13,136,-26,191,-65], [1,50,-21,0,-76,-9,-126,-24,-167,-50], [1,50,-3,120,-89,105,-155,138,-96,202], [1,50,7,122,50,129,122,145,184,174] ]],
        [17,true,0,-50,0,[ [2,1,110,130,-55,0], [2,1,64,50,-32,-40], [1,50,21,0,77,-4,139,-8,211,-12], [1,50,-21,0,-101,9,-71,118,-7,214], [1,50,-3,120,-84,79,-81,115,-39,185], [1,50,7,122,60,136,132,192,166,292] ]],
        [100,false],[101,false]
    ],
    [
        [0,true,0,200,0,[ [1,50,-153,-34,-109,13,149,16,189,-34], [0,28,-92,62], [0,28,125,62] ]],
        [5,true,4,155,-0.68,[ [1,50,-153,-34,-109,13,149,16,189,-34], [0,28,-92,62], [0,28,125,62] ]],
        [6,false], [7,true,66,200,2.95,[ [1,50,-153,-34,-109,13,149,16,189,-34], [0,28,-92,62], [0,28,125,62] ]],
        [8,false], [9,true,30,190,-0.03,[ [1,50,-153,-34,-109,13,149,16,189,-34], [0,28,-92,62], [0,28,125,62] ]],
        [10,false], [11,true,78,220,3.13,[ [1,50,-153,-34,-109,13,149,16,189,-34], [0,28,-92,62], [0,28,125,62] ]],
        [12,false],
        [13,false], 
        [14,true,49,242,3.37,[ [1,50,-153,-34,-109,13,149,16,189,-34], [0,28,-92,62], [0,28,125,62] ]],
        [15,false],
        [16,true,13,185,0.49,[ [1,50,-153,-34,-109,13,149,16,189,-34], [0,28,-92,62], [0,28,125,62] ]],
        [17,true,8,178,0.62,[ [1,50,-153,-34,-109,13,149,16,189,-34], [0,28,-92,62], [0,28,125,62] ]],
        [100,false],[101,false]
    ],
    [
        [0,false],
        [6,true,40,171,-0.32,[ [1,90,-150,0,-50,0,50,0,150,0] ]],
        [7,false],
        [8,true,54,184,-0.2,[ [1,90,-150,0,-50,0,50,0,150,0] ]],
        [9,false],
        [10,true,50,200,0.05,[ [1,90,-150,0,-50,0,50,0,150,0] ]],
        [11,false],
        [12,true,54,184,-0.2,[ [1,90,-150,0,-50,0,50,0,150,0] ]],
        [13,true,43,209,0.18,[ [1,90,-150,0,-50,0,50,0,150,0] ]],
        [14,false],
        [15,true,43,209,0.18,[ [1,90,-150,0,-50,0,50,0,150,0] ]],
        [16,false],[101,false],
    ]
];

let spriteRenderers = [
    ([ _, radius, x, y ]:any) => {
        c.fillStyle = '#f00';
        c.beginPath();
        c.arc(x, y, radius, 0, 2*Math.PI);
        c.fill();
    },
    ([ _, width, x0, y0, x1, y1, x2, y2, x3, y3 ]:any) => {
        c.lineWidth = width;
        c.beginPath();
        c.moveTo(x0, y0);
        c.bezierCurveTo(x1, y1, x2, y2, x3, y3);
        c.stroke();
    },
    ([ _, fill, w, h, x, y ]:any) => {
        c.fillStyle = fill ? '#f00' : '#000';
        c.fillRect(x, y, w, h);
    },
];

let lerpFrame = (a: any, b: any, t: number): any =>
    !!a===a ? a :
    Array.isArray(a)
        ? a.map((x,i)=>lerpFrame(x,b[i],t))
        : a+t*(b-a);

export const enum SpriteState {
    Rolling = 0,
    Jumping = 1,
    Stomping = 2,
};

let s_spriteFrameNum = 0;

export let tickSprite = (state: SpriteState): void => {
    if( state === SpriteState.Rolling ) {
        s_spriteFrameNum = 0;
    }
    if( state === SpriteState.Jumping ) {
        if( (s_spriteFrameNum += 1) > 12 )
            s_spriteFrameNum -= 4;
    }
    if( state === SpriteState.Stomping ) {
        if( s_spriteFrameNum < 12 )
            s_spriteFrameNum = 12;
        if( (s_spriteFrameNum += 1) > 17 )
            s_spriteFrameNum = 17;
    }
};

export let renderSprite = (state: GameState): void => {
    c.strokeStyle = '#f00';
    c.lineCap = 'round';

    for(let layerIdx = 0; layerIdx < animData.length; ++layerIdx) {
        let layer = animData[layerIdx];

        let thisFrameIdx = 0;
        let nextFrameIdx = 0;
        if( layer.length > 1 ) {
            nextFrameIdx = 1;
            while( nextFrameIdx < layer.length - 1 && layer[nextFrameIdx][0] <= s_spriteFrameNum ) nextFrameIdx++;
            thisFrameIdx = nextFrameIdx - 1;
        }
        let a = layer[thisFrameIdx];
        let b = layer[nextFrameIdx];
        let lerpT = thisFrameIdx == nextFrameIdx ? 0 : (s_spriteFrameNum - a[0]) / (b[0] - a[0]);
        let frame = a[1] && b[1] ? lerpFrame(a, b, lerpT) : a;

        if(frame[1]) {
            c.save();
            c.translate(
                k_fullWidth/2 + (state.playerPos[0] - state.cameraPos[0]) * k_baseScale * state.cameraZoom,
                k_fullHeight/2 + (state.playerPos[1] - state.cameraPos[1]) * k_baseScale * state.cameraZoom
            );
            c.scale(state.cameraZoom * k_spriteScale, state.cameraZoom * k_spriteScale);
            c.rotate(state.playerRot);
            c.translate(
                state.spriteScaleX*frame[2],
                frame[3]
            );
            c.scale(state.spriteScaleX,1);
            c.rotate(frame[4]);
            frame[5].forEach((item:any) => spriteRenderers[item[0]](item));
            c.restore();
        }
    }

    // Draw world space unit circle
    //{
    //    if( Math.random() > 0.5 ) return;
    //    c.save();
    //    cameraZoom *= BASE_SCALE / SPRITE_SCALE
    //    c.scale(cameraZoom, cameraZoom);
    //    c.translate(
    //        WIDTH/2/cameraZoom - state.cameraPos[0], 
    //        HEIGHT/2/cameraZoom - state.cameraPos[1]
    //    );
    //    c.beginPath();
    //    c.fillStyle='#f00';
    //    c.arc(0, 0, 1, 0, 2*Math.PI);
    //    c.fill();
    //    c.restore();
    //}
};
