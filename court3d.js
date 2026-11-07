/* NeoPadel: konfigurator kortu 3D (Three.js r128).
   Na bazie modelu Olka: wypieczone światło (lampy i miękkie cienie w teksturze nawierzchni i posadzki),
   tekstury z canvasa (trawa z liniami, siatka zgrzewana, logo na szybie), odbicia otoczenia na szkle i stali,
   dokładniejsze ściany (szkło 3 m i 2 m, siatka do 4 m, wejścia przy siatce) oraz lampy z poświatą. */
window.mountCourt3d = (function () {
  'use strict';
  const MODELS = {
    panorama: { w: 10, glassH: 3, meshH: 1, posts: 'corners', steel: 0.08, label: 'Panorama', dim: '20 × 10 m · szkło 3 m + siatka 1 m · słupy tylko w narożnikach' },
    super: { w: 10, glassH: 4, meshH: 0, posts: 'none', steel: 0.06, label: 'Super Panorama', dim: '20 × 10 m · pełne szkło 4 m · bez słupów na szkle' },
    titan: { w: 10, glassH: 3, meshH: 1, posts: 'all', steel: 0.13, label: 'Titan', dim: '20 × 10 m · wzmocniona rama stalowa · do miejsc z silnym wiatrem' },
    singiel: { w: 6, glassH: 3, meshH: 1, posts: 'corners', steel: 0.08, label: 'Singiel', dim: '20 × 6 m · kort do gry jeden na jednego' }
  };
  const TURFS = {
    niebieska: { label: 'Niebieska', base: '#1f5ccf', hi: '#3b7af0', lo: '#14408f' },
    fioletowa: { label: 'Fioletowa', base: '#7a1f8f', hi: '#a63cbd', lo: '#52125f' },
    zielona: { label: 'Zielona', base: '#1f7a45', hi: '#33a35f', lo: '#13512d' },
    terakota: { label: 'Terakota', base: '#b4532f', hi: '#d0703f', lo: '#7d3720' }
  };
  const L = 20, LAMPS = [[-1, -5], [-1, 5], [1, -5], [1, 5]];

  // Seeded noise so the baked textures are identical on every load.
  function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t; }

  // Turf: fibres, painted lines, then baked light (lamp pools) and ambient occlusion along the walls.
  function bakeTurf(m, turf) {
    const W = m.w, px = 96, c = canvas(Math.round(W * px), L * px), x = c.getContext('2d'), r = rng(11);
    x.fillStyle = turf.base; x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < c.width * c.height / 9; i++) {
      x.fillStyle = r() < .45 ? turf.hi : turf.lo; x.globalAlpha = .14 + r() * .22;
      const fx = r() * c.width, fy = r() * c.height; x.fillRect(fx, fy, 1, 1 + r() * 3);
    }
    x.globalAlpha = 1;
    const line = (x0, y0, x1, y1) => { x.fillStyle = '#f4f2ee'; x.fillRect(x0 * px, y0 * px, Math.max((x1 - x0) * px, 5), Math.max((y1 - y0) * px, 5)); };
    // service lines 6.95 m from the net and the centre line between them
    line(0, (10 - 6.95) - .025, W, (10 - 6.95) + .025); line(0, (10 + 6.95) - .025, W, (10 + 6.95) + .025);
    line(W / 2 - .025, 10 - 6.95, W / 2 + .025, 10 + 6.95);
    // baked light: four lamp pools
    x.globalCompositeOperation = 'soft-light';
    LAMPS.forEach(([sx, sz]) => {
      const cx = (W / 2 + sx * W * .2) * px, cy = (10 + sz) * px, g = x.createRadialGradient(cx, cy, 0, cx, cy, 7.5 * px);
      g.addColorStop(0, 'rgba(255,255,255,.38)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    });
    // baked ambient occlusion: darker along walls and in corners
    x.globalCompositeOperation = 'multiply';
    const ao = (gx0, gy0, gx1, gy1, x0, y0, w, h) => { const g = x.createLinearGradient(gx0, gy0, gx1, gy1); g.addColorStop(0, 'rgba(40,40,60,1)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = g; x.fillRect(x0, y0, w, h); };
    const d = .9 * px;
    ao(0, 0, 0, d, 0, 0, c.width, d); ao(0, c.height, 0, c.height - d, 0, c.height - d, c.width, d);
    ao(0, 0, d * .7, 0, 0, 0, d * .7, c.height); ao(c.width, 0, c.width - d * .7, 0, c.width - d * .7, 0, d * .7, c.height);
    // the net's soft shadow
    const ny = 10 * px, ng = x.createLinearGradient(0, ny - .35 * px, 0, ny + .35 * px);
    ng.addColorStop(0, 'rgba(255,255,255,1)'); ng.addColorStop(.5, 'rgba(120,120,150,1)'); ng.addColorStop(1, 'rgba(255,255,255,1)');
    x.fillStyle = ng; x.fillRect(0, ny - .35 * px, c.width, .7 * px);
    x.globalCompositeOperation = 'source-over';
    return tex(c);
  }
  // Floor around the court: dark concrete with a baked contact shadow and the spill of the lamps.
  function bakeGround(m) {
    const S = 60, px = 24, c = canvas(S * px, S * px), x = c.getContext('2d'), r = rng(5), C = S * px / 2;
    x.fillStyle = '#121019'; x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 90000; i++) { x.fillStyle = r() < .5 ? '#1a1724' : '#0d0b12'; x.globalAlpha = .5; x.fillRect(r() * c.width, r() * c.height, 2, 2); }
    x.globalAlpha = 1;
    const glow = x.createRadialGradient(C, C, 0, C, C, 16 * px); glow.addColorStop(0, 'rgba(172,39,180,.30)'); glow.addColorStop(.6, 'rgba(90,40,200,.10)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = glow; x.fillRect(0, 0, c.width, c.height);
    x.save(); x.shadowColor = 'rgba(0,0,0,.85)'; x.shadowBlur = 1.4 * px; x.fillStyle = '#000';
    x.fillRect(C - (m.w / 2 + .15) * px, C - (L / 2 + .15) * px, (m.w + .3) * px, (L + .3) * px); x.restore();
    return tex(c);
  }
  // Welded mesh: dark wires on a transparent canvas, 10 cm cells.
  function meshTexture() {
    const c = canvas(64, 64), x = c.getContext('2d');
    x.strokeStyle = 'rgba(22,20,30,1)'; x.lineWidth = 5; x.strokeRect(0, 0, 64, 64);
    const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function netTexture() {
    const c = canvas(32, 32), x = c.getContext('2d');
    x.strokeStyle = 'rgba(235,235,240,.85)'; x.lineWidth = 2; x.strokeRect(0, 0, 32, 32);
    const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function glowTexture() {
    const c = canvas(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.12, 'rgba(255,245,255,.55)'); g.addColorStop(.4, 'rgba(230,200,255,.08)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return tex(c);
  }
  // Soft studio environment for reflections on glass and steel.
  function environment(renderer) {
    const env = new THREE.Scene(), pm = new THREE.PMREMGenerator(renderer);
    const room = new THREE.Mesh(new THREE.BoxGeometry(60, 30, 60), new THREE.MeshBasicMaterial({ color: 0x1a1426, side: THREE.BackSide }));
    env.add(room);
    [[0, 14, 0, 30, 1, 8, 0xffffff], [-20, 8, 0, 1, 6, 30, 0xd8b4ff], [20, 8, 0, 1, 6, 30, 0xb7c4ff], [0, 6, -28, 30, 4, 1, 0xff9af5]].forEach(([px, py, pz, w, h, d, col]) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: col })); p.position.set(px, py, pz); env.add(p);
    });
    const rt = pm.fromScene(env, .04); pm.dispose(); return rt.texture;
  }

  return function mount(box, opts = {}) {
    if (!window.THREE) { box.classList.add('nogl'); return null; }
    const cv = box.querySelector('canvas'); let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' }); } catch (e) { box.classList.add('nogl'); return null; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .9;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0d0b12); scene.fog = new THREE.Fog(0x0d0b12, 38, 75);
    scene.environment = environment(renderer);
    const cam = new THREE.PerspectiveCamera(34, 1, .1, 200);
    scene.add(new THREE.HemisphereLight(0xe8e2ff, 0x1a1030, .42));
    const sun = new THREE.DirectionalLight(0xffffff, .95); sun.position.set(14, 26, 9); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 }); sun.shadow.bias = -.0005; sun.shadow.radius = 4;
    scene.add(sun);

    const M = {
      steel: new THREE.MeshStandardMaterial({ color: 0x17161c, roughness: .42, metalness: .65 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0xf2f6ff, roughness: .04, metalness: 0, transparent: true, opacity: .17, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false }),
      edge: new THREE.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: .35 }),
      mesh: new THREE.MeshStandardMaterial({ map: meshTexture(), transparent: true, alphaTest: .25, side: THREE.DoubleSide, roughness: .6, metalness: .4 }),
      white: new THREE.MeshStandardMaterial({ color: 0xeeeef2, roughness: .5 }),
      lampFace: new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
      net: new THREE.MeshBasicMaterial({ map: netTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false })
    };
    const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    let logoMat = null;
    new THREE.TextureLoader().load('assets/logo.png', t => { t.encoding = THREE.sRGBEncoding; logoMat = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: .9, depthWrite: false }); if (current) build(); });

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ roughness: .9 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -.05; ground.receiveShadow = true; scene.add(ground);
    const court = new THREE.Group(); scene.add(court);
    let current = opts.model || 'panorama', turf = opts.turf || 'niebieska';

    function dispose(o) { o.traverse(c => { if (c.geometry) c.geometry.dispose(); }); }
    function add(mesh, cast = true) { mesh.castShadow = cast; mesh.receiveShadow = true; court.add(mesh); return mesh; }
    function box3(w, h, d, x, y, z, mat, cast) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return add(m, cast); }
    function glass(w, h, x, y, z, ry, clamps) {
      const g = new THREE.PlaneGeometry(w, h), m = new THREE.Mesh(g, M.glass); m.position.set(x, y, z); m.rotation.y = ry; m.renderOrder = 2; court.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), M.edge); e.position.copy(m.position); e.rotation.copy(m.rotation); court.add(e);
      if (clamps) [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => {
        const c = new THREE.Mesh(new THREE.BoxGeometry(.07, .12, .05), M.steel), off = new THREE.Vector3(a * (w / 2 - .12), b * (h / 2 - .25), 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
        c.position.set(x + off.x, y + off.y, z + off.z); c.rotation.y = ry; court.add(c);
      });
    }
    function mesh(w, h, x, y, z, ry) {
      const mat = M.mesh.clone(); mat.map = M.mesh.map.clone(); mat.map.needsUpdate = true; mat.map.repeat.set(w / .1, h / .1);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry; add(m, true);
    }
    function post(x, z, h, s) { box3(s, h, s, x, h / 2, z, M.steel, true); }
    function rail(len, x, y, z, ry, s) { const r = box3(len, s, s, x, y, z, M.steel, true); r.rotation.y = ry; }

    function build() {
      dispose(court); while (court.children.length) court.remove(court.children[0]);
      const m = MODELS[current], W = m.w, hw = W / 2, hl = L / 2, s = m.steel, H = m.glassH + m.meshH, heavy = m.posts === 'all';
      const turfMat = new THREE.MeshStandardMaterial({ map: bakeTurf(m, TURFS[turf]), roughness: .95 });
      box3(W, .06, L, 0, -.03, 0, turfMat, false);
      ground.material.map && ground.material.map.dispose(); ground.material.map = bakeGround(m); ground.material.needsUpdate = true;
      // net with posts and a white top band
      const nt = new THREE.Mesh(new THREE.PlaneGeometry(W, .88), M.net.clone()); nt.material.map = M.net.map.clone(); nt.material.map.needsUpdate = true; nt.material.map.repeat.set(W * 22, 20); nt.position.set(0, .45, 0); court.add(nt);
      box3(W, .06, .02, 0, .89, 0, M.white, false);
      [-hw - .05, hw + .05].forEach(x => box3(.08, 1, .08, x, .5, 0, M.white));
      // back walls: glass panels 2 m wide, mesh above when the model has it
      [-hl, hl].forEach(z => {
        const n = Math.round(W / 2);
        for (let i = 0; i < n; i++) {
          const x = -hw + (i + .5) * (W / n); glass(W / n - .02, m.glassH, x, m.glassH / 2, z, 0, !heavy);
          if (heavy && i > 0) post(-hw + i * (W / n), z, H, s);
        }
        if (m.meshH) { mesh(W, m.meshH, 0, m.glassH + m.meshH / 2, z, 0); rail(W, 0, m.glassH, z, 0, s * .7); }
        rail(W, 0, H, z, 0, s * .8);
        if (logoMat) { const lg = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6 * 183 / 933), logoMat); lg.position.set(0, 2.45, z - Math.sign(z) * .02); lg.rotation.y = z > 0 ? Math.PI : 0; court.add(lg); }
      });
      // side walls: 2 m glass at full height, 2 m stepped glass, then mesh to the net with an entrance on each side of it
      [-hw, hw].forEach(x => [-1, 1].forEach(dir => {
        const zA = dir * (hl - 1), zB = dir * (hl - 3), gB = Math.max(m.glassH - 1, 2);
        glass(1.98, m.glassH, x, m.glassH / 2, zA, Math.PI / 2, !heavy); glass(1.98, gB, x, gB / 2, zB, Math.PI / 2, !heavy);
        if (H > m.glassH) { mesh(2, H - m.glassH, x, m.glassH + (H - m.glassH) / 2, zA, Math.PI / 2); rail(2, x, m.glassH, zA, Math.PI / 2, s * .6); }
        if (3 > gB) { mesh(2, 3 - gB, x, gB + (3 - gB) / 2, zB, Math.PI / 2); rail(2, x, gB, zB, Math.PI / 2, s * .6); }
        const z0 = dir * 1.6, z1 = dir * (hl - 4), len = Math.abs(z1 - z0), zc = (z0 + z1) / 2;
        mesh(len, 3, x, 1.5, zc, Math.PI / 2);
        rail(len, x, 3, zc, Math.PI / 2, s * .8); rail(2, x, Math.max(H, 3), dir * (hl - 1), Math.PI / 2, s * .8); rail(2, x, 3, dir * (hl - 3), Math.PI / 2, s * .8);
        if (heavy) { rail(len, x, 1, zc, Math.PI / 2, s * .55); rail(len, x, 2, zc, Math.PI / 2, s * .55); }
        // entrance: frame posts either side of the 1 m opening by the net
        post(x, dir * .5, 2.4, s); post(x, dir * 1.6, 3, s); rail(1.1, x, 2.4, dir * 1.05, Math.PI / 2, s * .7);
        for (let k = 0; k < Math.round(len / 2); k++) post(x, z1 - dir * k * 2, 3, s);
        post(x, dir * (hl - 4), 3, s); if (heavy) post(x, dir * (hl - 2), H, s);
        if (heavy) { const br = box3(s * .6, 2.6, s * .6, x, 1.6, dir * (hl - 5), M.steel, true); br.rotation.x = dir * .7; }
      }));
      [[-hw, -hl], [hw, -hl], [-hw, hl], [hw, hl]].forEach(([x, z]) => post(x, z, H, m.posts === 'none' ? s * .8 : s * 1.2));
      // floodlights: pole, arm, head and glow
      LAMPS.forEach(([sx, sz]) => {
        const x = sx * (hw + .7), z = sz, pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 6.6, 14), M.steel); pole.position.set(x, 3.3, z); add(pole, true);
        rail(.9, x - sx * .4, 6.55, z, 0, .06);
        const head = box3(.62, .14, .34, x - sx * .85, 6.48, z, M.steel, true); head.rotation.z = sx * .3;
        const face = new THREE.Mesh(new THREE.PlaneGeometry(.52, .26), M.lampFace); face.rotation.x = Math.PI / 2; face.position.set(x - sx * .85, 6.40, z); court.add(face);
        const gl = new THREE.Sprite(glowMat); gl.scale.set(1.5, 1.5, 1); gl.position.set(x - sx * .85, 6.3, z); court.add(gl);
      });
      const dim = box.querySelector('[data-dim]'); if (dim) dim.textContent = m.dim;
    }

    // Camera: slow orbit; drag to rotate, pinch or ctrl+scroll to zoom (plain scroll keeps scrolling the page).
    let theta = .75, phi = 1.0, radius = 35, auto = true, idle = null, drag = null, raf = 0, visible = false, alive = true;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches, tgt = new THREE.Vector3(0, 1.2, 0);
    function place() { cam.position.set(tgt.x + radius * Math.sin(phi) * Math.sin(theta), tgt.y + radius * Math.cos(phi), tgt.z + radius * Math.sin(phi) * Math.cos(theta)); cam.lookAt(tgt); }
    function wake() { auto = false; clearTimeout(idle); idle = setTimeout(() => auto = true, 5000); }
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, mouse: e.pointerType === 'mouse' }; cv.setPointerCapture(e.pointerId); box.classList.add('dragging'); wake(); });
    cv.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; theta -= dx * .006; if (drag.mouse) phi = Math.min(1.42, Math.max(.35, phi - dy * .004)); wake(); });
    const up = () => { drag = null; box.classList.remove('dragging'); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); radius = Math.min(48, Math.max(15, radius + e.deltaY * .05)); wake(); }, { passive: false });

    function size() { const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    const ro = new ResizeObserver(size); ro.observe(box);
    const io = new IntersectionObserver(e => { visible = e[0].isIntersecting; cancelAnimationFrame(raf); if (visible) raf = requestAnimationFrame(tick); }, { threshold: .05 }); io.observe(box);
    function tick() { if (!alive) return; if (!document.body.contains(box)) return destroy(); if (auto && !still) theta += .0016; place(); renderer.render(scene, cam); if (visible) raf = requestAnimationFrame(tick); }
    function destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); dispose(scene); renderer.dispose(); }
    size(); build(); place(); renderer.render(scene, cam);
    return {
      setModel(k) { if (MODELS[k]) { current = k; build(); wake(); if (!visible) renderer.render(scene, cam); } },
      setTurf(k) { if (TURFS[k]) { turf = k; build(); wake(); if (!visible) renderer.render(scene, cam); } },
      destroy
    };
  };
})();
