'use strict';

function updateCamera(dt){
  if (!camDragging){
    const decay = Math.pow(0.02, dt);
    camOffset.x *= decay;
    camOffset.y *= decay;
    if (Math.abs(camOffset.x) < 0.5) camOffset.x = 0;
    if (Math.abs(camOffset.y) < 0.5) camOffset.y = 0;
  }

  const vw = W / SCALE, vh = H / SCALE;
  let tx = player.x - vw / 2 + camOffset.x;
  let ty = player.y - vh / 2 + camOffset.y;
  if (vw >= WORLD) tx = (WORLD - vw) / 2; else tx = clamp(tx, 0, WORLD - vw);
  if (vh >= WORLD) ty = (WORLD - vh) / 2; else ty = clamp(ty, 0, WORLD - vh);

  if (camDragging){
    cam.x = tx; cam.y = ty; camInit = true;
  } else {
    if (!camInit){ cam.x = tx; cam.y = ty; camInit = true; }
    const k = 1 - Math.pow(0.0008, dt);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
  }
}