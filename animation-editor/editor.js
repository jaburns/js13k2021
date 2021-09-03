/*
    type Circle = [ circle:0, radius, x,y ]
    type Line = [ line:1, width, x0,y0,x1,y1,x2,y2,x3,y3 ]
    type ClearRect = [ rect:2, w,h, x,y ]
    type Rect = [ rect:3, w,h, x,y ]
    type GroupFrame = [ time, visible, x, y, theta, [Line | Circle] ]
    type Layer = [ GroupFrame ]
    type MovieClip = [ Layer ]

    type DrawData = [ GroupFrame ], time is ignored
*/

const W = 1024, H = 768;
const ANIM_PREVIEW_MODE = true;

const innerHead = [
  [0,100,0,0],
  //[2,12,-110,-8,-50,-8,50,-8,110,-8],
  [2,220,12,-110,-14],
  [1,26,0,-27,30,-27,50,-27,160,-27]
];

const animated = [
  [ // Head layer
    [0,true,0,-172,0,innerHead],
    [12,true,0,-172,0,innerHead],
    [17,true,0,-172,0.4,innerHead],
    [100,false],[101,false]
  ],
  [ // Body layer
    [0,true,0,-50,0,[
      [3,110,130,-55,0],
      [3,64,50,-32,-40],
      [1,50,21,0,61,9,110,46,132,98],
      [1,50,-21,0,-64,9,-115,42,-132,104],
      [1,50,-12,119,-56,128,-89,162,-106,223],
      [1,50,12,119,56,128,89,162,106,223]
    ]],
    [5,true,0,-50,0,[
      [3,110,130,-55,0],
      [3,64,50,-32,-40],
      [1,50,21,0,74,-22,126,-6,162,26],
      [1,50,-21,0,-74,-19,-147,-29,-169,37],
      [1,50,-3,120,-75,121,-106,169,-123,254],
      [1,50,9,119,55,122,113,97,53,164]
    ]],
    [9,true,0,-50,0,[
      [3,110,130,-55,0],
      [3,64,50,-32,-40],
      [1,50,21,0,75,-13,136,-26,191,-65],
      [1,50,-21,0,-76,-9,-126,-24,-167,-50],
      [1,50,-3,120,-89,105,-155,138,-96,202],
      [1,50,7,122,50,129,122,145,184,174]
    ]],
    [12,true,0,-50,0,[ // Same as 9
      [3,110,130,-55,0],
      [3,64,50,-32,-40],
      [1,50,21,0,75,-13,136,-26,191,-65],
      [1,50,-21,0,-76,-9,-126,-24,-167,-50],
      [1,50,-3,120,-89,105,-155,138,-96,202],
      [1,50,7,122,50,129,122,145,184,174]
    ]],
    [17,true,0,-50,0,[
      [3,110,130,-55,0],
      [3,64,50,-32,-40],
      [1,50,21,0,77,-4,139,-8,211,-12],
      [1,50,-21,0,-101,9,-71,118,-7,214],
      [1,50,-3,120,-84,79,-81,115,-39,185],
      [1,50,7,122,60,136,132,192,166,292]
    ]],
    [100,false],[101,false]
  ],
  [ // Board layer
    [0,true,0,200,0,[
      [1,50,-153,-34,-109,13,149,16,189,-34],
      [0,28,-92,62],
      [0,28,125,62]
    ]],
    [5,true,4,155,-0.68,[
      [1,50,-153,-34,-109,13,149,16,189,-34],
      [0,28,-92,62],
      [0,28,125,62]
    ]],
    [6,false],
    [7,true,66,200,2.95,[
      [1,50,-153,-34,-109,13,149,16,189,-34],
      [0,28,-92,62],
      [0,28,125,62]
    ]],
    [8,false],
    [9,true,30,190,-0.03,[
      [1,50,-153,-34,-109,13,149,16,189,-34],
      [0,28,-92,62],
      [0,28,125,62]
    ]],
    [10,false],
    [11,true,78,220,3.13,[
      [1,50,-153,-34,-109,13,149,16,189,-34],
      [0,28,-92,62],
      [0,28,125,62]
    ]],
    [12,false],
    [13,false],
      [14,true,49,242,3.37,[
        [1,50,-153,-34,-109,13,149,16,189,-34],
        [0,28,-92,62],
        [0,28,125,62]
      ]],
    [15,false],

      [16,true,13,185,0.49,[
        [1,50,-153,-34,-109,13,149,16,189,-34],
        [0,28,-92,62],
        [0,28,125,62]
      ]],

    [17,true,8,178,0.62,[
      [1,50,-153,-34,-109,13,149,16,189,-34],
      [0,28,-92,62],
      [0,28,125,62]
    ]],
    [100,false],[101,false]
  ],
  [ // Sideways board layer
    [0,false],
    [6,true,40,171,-0.32,[
      [1,90,-150,0,-50,0,50,0,150,0]
    ]],
    [7,false],
    [8,true,54,184,-0.2,[
      [1,90,-150,0,-50,0,50,0,150,0]
    ]],
    [9,false],
    [10,true,50,200,0.05,[
      [1,90,-150,0,-50,0,50,0,150,0]
    ]],
    [11,false],
    [12,true,54,184,-0.2,[
      [1,90,-150,0,-50,0,50,0,150,0]
    ]],
    [13,true,43,209,0.18,[
      [1,90,-150,0,-50,0,50,0,150,0]
    ]],
    [14,false],
    [15,true,43,209,0.18,[
      [1,90,-150,0,-50,0,50,0,150,0]
    ]],
    [16,false],[101,false],
  ]
];



let editorData =
[
    [16,true,8,178,0.62,[
      [1,50,-153,-34,-109,13,149,16,189,-34],
      [0,28,-92,62],
      [0,28,125,62]
    ]],
]

const stringifyData = data =>
  '[\n' + data.map(x => 
    `  [${x[0]},${x[1]},${x[2]},${x[3]},${x[4]},[\n${x[5].map(y=>'    '+JSON.stringify(y)).join(',\n')}\n  ]]`
  ).join(',\n') + '\n]';

/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext('2d');
ctx.lineCap = 'round';
let selectedHandle = null;

const crosshair = (x, y) => {
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 0.5, y - 10 - 0.5);
    ctx.lineTo(x - 0.5, y + 10 - 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 10 - 0.5, y - 0.5);
    ctx.lineTo(x + 10 - 0.5, y - 0.5);
    ctx.stroke();
};

const drawCircle = ([ _, radius, x, y ]) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2*Math.PI);
    ctx.fill();
};

const drawLine = ([ _, width, x0, y0, x1, y1, x2, y2, x3, y3 ]) => {
    ctx.lineWidth = width;
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
    ctx.stroke();
    ctx.strokeStyle = '#00f';

    if( ANIM_PREVIEW_MODE ) return;

    crosshair(x0, y0);
    crosshair(x1, y1);
    crosshair(x2, y2);
    crosshair(x3, y3);
};

const drawRect = ([ _, w, h, x, y ]) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, w, h);
};

const clearRect = ([ _, w, h, x, y ]) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, w, h);
};

const renderData = data => {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    //ctx.drawImage(imgref, -4, 0);

    if(!ANIM_PREVIEW_MODE) ctx.globalAlpha = 0.8;

    data.forEach(([time, visible, x, y, theta, items]) => {
        if(!visible) return;
        ctx.save();
        ctx.translate(x + W/2, y + H/2);
        ctx.rotate(theta);
        items.forEach(item => {
            switch(item[0]) {
                case 0: drawCircle(item); break;
                case 1: drawLine(item); break;
                case 2: clearRect(item); break;
                case 3: drawRect(item); break;
            }
        });
        ctx.restore();
    });

    ctx.strokeStyle = '#f00';
    crosshair(W/2, H/2);

    if( ANIM_PREVIEW_MODE ) return;

    data.forEach(([time, visible, x, y, theta]) => {
        if(!visible) return;
        ctx.save();
        ctx.translate(x + W/2, y + H/2);
        ctx.rotate(theta);
        ctx.strokeStyle = '#0f0';
        crosshair(0, 0);
        ctx.restore();
    });
};

const lerpFrame = (a, b, t) =>
    typeof a == 'boolean' ? a :
    Array.isArray(a)
        ? a.map((x,i)=>lerpFrame(x,b[i],t))
        : a+t*(b-a);

const renderFrame = (animData, frameNum) => {
    const drawData = [];
    for(let layerIdx = 0; layerIdx < animData.length; ++layerIdx) {
        const layer = animData[layerIdx];

        let thisFrameIdx = 0;
        let nextFrameIdx = 0;
        if( layer.length > 1 ) {
            nextFrameIdx = 1;
            while( nextFrameIdx < layer.length - 1 && layer[nextFrameIdx][0] <= frameNum ) nextFrameIdx++;
            thisFrameIdx = nextFrameIdx - 1;
        }
        const a = layer[thisFrameIdx];
        const b = layer[nextFrameIdx];
        const lerpT = thisFrameIdx == nextFrameIdx ? 0 : (frameNum - a[0]) / (b[0] - a[0]);
        const frame = a[1] && b[1] ? lerpFrame(a, b, lerpT) : a;
        drawData.push(frame);
    }
    renderData(drawData);
};

if( ANIM_PREVIEW_MODE )
{
    frameRange.oninput = () => {
        console.log(frameRange.value);
        renderFrame(animated, frameRange.value);
    };
    renderFrame(animated, 0);
}
else
{
    textarea.value = stringifyData(editorData);
    textarea.oninput = () => {
        try {
            editorData = JSON.parse(textarea.value);
        } catch(e) {}
        renderData(editorData)
    };

    canvas.onmousedown = e => {
        let closestD2 = Infinity;
        const data = editorData;
        for(let i = 0; i < data.length; ++i) {
            for(let j = 0; j < data[i][5].length; ++j) {
                const item = data[i][5][j];
                const ox = data[i][1] + W/2;
                const oy = data[i][2] + H/2;
                if(item[0] !== 2 && item[0] !== 1) continue;
                for(let c = 0; c < 4; ++c) {
                    const [x,y] = [ data[i][5][j][2+2*c], data[i][5][j][3+2*c] ];
                    const dx = e.offsetX - (ox+x);
                    const dy = e.offsetY - (oy+y);
                    const d2 = dx*dx + dy*dy;
                    if(d2 < closestD2) {
                        closestD2 = d2;
                        selectedHandle = [i,j,c,-dx,-dy];
                    }
                }
            }
        }
    };

    canvas.onmousemove = e => {
        const data = editorData;
        if(selectedHandle !== null) {
            const S = selectedHandle;
            const ox = data[S[0]][1] + W/2;
            const oy = data[S[0]][2] + H/2;
            data[S[0]][5][S[1]][2+2*S[2]] = S[3] + e.offsetX - ox;
            data[S[0]][5][S[1]][3+2*S[2]] = S[4] + e.offsetY - oy;
            textarea.value = stringifyData(editorData);
            renderData(editorData)
        }
    };

    canvas.onmouseout = canvas.onmouseup = () => { selectedHandle = null };

    renderData(editorData);
}
