/*
    type Circle = [ circle:0, radius, x,y ]
    type Line = [ line:1|2(erase), width, x0,y0,x1,y1,x2,y2,x3,y3 ]
    type Rect = [ rect:3, w,h, x,y ]
    type Group = [ visible, x, y, theta, [Line | Circle] ]
    type Sprite = [ Group ]

*/

// TODO each group should have its own animation layer

// Frame 0
// [
//   [1,0,-172,0,[
//     [0,100,0,0],
//     [2,12,-110,-8,-50,-8,50,-8,110,-8],
//     [1,26,0,-27,30,-27,50,-27,160,-27]
//   ]],
//   [1,0,-50,0,[
//     [3,110,130,-55,0],
//     [3,64,50,-32,-40],
//     [1,50,21,0,61,9,110,46,132,98],
//     [1,50,-21,0,-64,9,-115,42,-132,104],
//     [1,50,-12,119,-56,128,-89,162,-106,223],
//     [1,50,12,119,56,128,89,162,106,223]
//   ]],
//   [1,0,200,0,[
//     [1,50,-153,-34,-109,13,149,16,189,-34],
//     [0,28,-92,62],
//     [0,28,125,62]
//   ]],
//   null
// ]
//
// Frame 5
//[
//   [1,0,-172,0,[
//     [0,100,0,0],
//     [2,12,-110,-8,-50,-8,50,-8,110,-8],
//     [1,26,0,-27,30,-27,50,-27,160,-27]
//   ]],
//   [1,0,-50,0,[
//     [3,110,130,-55,0],
//     [3,64,50,-32,-40],
//     [1,50,21,0,74,-22,126,-6,162,26],
//     [1,50,-21,0,-74,-19,-147,-29,-169,37],
//     [1,50,-3,120,-75,121,-106,169,-123,254],
//     [1,50,9,119,55,122,113,97,53,164]
//   ]],
//   [1,4,155,-0.68,[
//     [1,50,-153,-34,-109,13,149,16,189,-34],
//     [0,28,-92,62],
//     [0,28,125,62]
//   ]],
//   null
// ]
// 
// Frame 9
// [
//   [1,0,-172,0,[
//     [0,100,0,0],
//     [2,12,-110,-8,-50,-8,50,-8,110,-8],
//     [1,26,0,-27,30,-27,50,-27,160,-27]
//   ]],
//   [1,0,-50,0,[
//     [3,110,130,-55,0],
//     [3,64,50,-32,-40],
//     [1,50,21,0,75,-13,136,-26,191,-65],
//     [1,50,-21,0,-76,-9,-126,-24,-167,-50],
//     [1,50,-3,120,-89,105,-155,138,-96,202],
//     [1,50,7,122,50,129,122,145,184,174]
//   ]],
//   null,
//   [1,50,200,0.05,[
//     [1,90,-150,0,-50,0,50,0,150,0]
//   ]]
// ]
//
//
//

const W = 1024, H = 768;

let data =
[
   [1,0,-172,0,[
     [0,100,0,0],
     [2,12,-110,-8,-50,-8,50,-8,110,-8],
     [1,26,0,-27,30,-27,50,-27,160,-27]
   ]],
   [1,0,-50,0,[
     [3,110,130,-55,0],
     [3,64,50,-32,-40],
     [1,50,21,0,74,-22,126,-6,162,26],
     [1,50,-21,0,-74,-19,-147,-29,-169,37],
     [1,50,-3,120,-75,121,-106,169,-123,254],
     [1,50,9,119,55,122,113,97,53,164]
   ]],
   [1,4,155,-0.68,[
     [1,50,-153,-34,-109,13,149,16,189,-34],
     [0,28,-92,62],
     [0,28,125,62]
   ]]
]

const stringifyData = () =>
  '[\n' + data.map(x => 
    `  [${x[0]},${x[1]},${x[2]},${x[3]},[\n${x[4].map(y=>'    '+JSON.stringify(y)).join(',\n')}\n  ]]`
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

const drawLine = (positive, [ _, width, x0, y0, x1, y1, x2, y2, x3, y3 ]) => {
    ctx.lineWidth = width;
    ctx.strokeStyle = positive ? '#fff' : '#000';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
    ctx.stroke();
    ctx.strokeStyle = '#00f';
    crosshair(x0, y0);
    crosshair(x1, y1);
    crosshair(x2, y2);
    crosshair(x3, y3);
};

const drawRect = ([ _, w, h, x, y ]) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, w, h);
};

const renderData = () => {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(imgref, -4, 0);
    //ctx.globalAlpha = 0.8;

    data.forEach(([visible, x, y, theta, items]) => {
        if(!visible) return;
        ctx.save();
        ctx.translate(x + W/2, y + H/2);
        ctx.rotate(theta);
        items.forEach(item => {
            switch(item[0]) {
                case 0: drawCircle(item); break;
                case 1: drawLine(true, item); break;
                case 2: drawLine(false, item); break;
                case 3: drawRect(item); break;
            }
        });
        ctx.restore();
    });

    ctx.strokeStyle = '#f00';
    crosshair(W/2, H/2);

    data.forEach(([visible, x, y, theta]) => {
        if(!visible) return;
        ctx.save();
        ctx.translate(x + W/2, y + H/2);
        ctx.rotate(theta);
        ctx.strokeStyle = '#0f0';
        crosshair(0, 0);
        ctx.restore();
    });
};

textarea.value = stringifyData();
textarea.oninput = () => {
    try {
        data = JSON.parse(textarea.value);
    } catch(e) {}
    renderData()
};

canvas.onmousedown = e => {
    let closestD2 = Infinity;
    for(let i = 0; i < data.length; ++i) {
        for(let j = 0; j < data[i][4].length; ++j) {
            const item = data[i][4][j];
            const ox = data[i][1] + W/2;
            const oy = data[i][2] + H/2;
            if(item[0] !== 2 && item[0] !== 1) continue;
            for(let c = 0; c < 4; ++c) {
                const [x,y] = [ data[i][4][j][2+2*c], data[i][4][j][3+2*c] ];
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
    if(selectedHandle !== null) {
        const S = selectedHandle;
        const ox = data[S[0]][1] + W/2;
        const oy = data[S[0]][2] + H/2;
        data[S[0]][4][S[1]][2+2*S[2]] = S[3] + e.offsetX - ox;
        data[S[0]][4][S[1]][3+2*S[2]] = S[4] + e.offsetY - oy;
        textarea.value = stringifyData();
        renderData()
    }
};

canvas.onmouseout = canvas.onmouseup = () => { selectedHandle = null };

renderData()
