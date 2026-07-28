// Crazy 3D game core (classic scripts, uses global THREE & THREE.OrbitControls).
// Works when opened via file:// as long as remote scripts can be loaded.

(function () {
  const overlay = document.getElementById('overlay');
  const btnToggle = document.getElementById('toggle');
  const btnCrazy = document.getElementById('crazy');
  const spawnSlider = document.getElementById('spawn');
  const countSpan = document.getElementById('count');

  let paused = false;
  let insane = false;
  let spawnRate = Number(spawnSlider.value); // objects per second-ish

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050a);

  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000);
  camera.position.set(0, 6, 18);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  document.body.appendChild(renderer.domElement);

  // Controls (non-module OrbitControls attaches to THREE)
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Lights
  const hemi = new THREE.HemisphereLight(0xfff0aa, 0x101020, 0.8);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(10, 20, 10);
  scene.add(dir);

  // Floor (invisible for collisions)
  const floorY = -6;

  // Object pool
  const objects = [];
  const maxObjects = 1500;

  // Geometries and materials cache
  const geoms = [
    new THREE.SphereGeometry(1, 14, 12),
    new THREE.BoxGeometry(1.6, 1.6, 1.6),
    new THREE.TorusGeometry(0.8, 0.28, 12, 18),
    new THREE.ConeGeometry(0.9, 1.6, 12),
    new THREE.OctahedronGeometry(1, 0)
  ];

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function colorRand() { return new THREE.Color().setHSL(Math.random(), 0.65, rand(0.45, 0.6)); }

  function spawnOne(opts = {}) {
    if (objects.length >= maxObjects) return;
    const g = geoms[Math.floor(Math.random() * geoms.length)];
    const mat = new THREE.MeshStandardMaterial({
      color: colorRand(),
      metalness: 0.2,
      roughness: 0.5,
      emissive: 0x000000,
      flatShading: Math.random() > 0.6
    });
    const m = new THREE.Mesh(g, mat);
    const scale = rand(0.25, opts.big ? 2.6 : 1.4);
    m.scale.setScalar(scale);

    m.position.set(rand(-10, 10), rand(-1, 6), rand(-10, 10));

    const v = new THREE.Vector3(rand(-3, 3), rand(0.5, 6), rand(-3, 3));
    if (insane && Math.random() < 0.22) v.multiplyScalar(rand(2.5, 6));

    m.userData = {
      velocity: v,
      angular: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(rand(0.2, 4)),
      life: rand(10, 40)
    };

    scene.add(m);
    objects.push(m);
  }

  let lastSpawn = performance.now();
  let spawnAccumulator = 0;

  function gameLoop(ts) {
    if (!paused) {
      const now = ts;
      const perSecond = spawnRate;
      spawnAccumulator += (now - lastSpawn) / 1000 * perSecond;
      lastSpawn = now;
      while (spawnAccumulator >= 1) {
        if (insane && Math.random() < 0.15) {
          const burst = Math.floor(rand(6, 30));
          for (let i = 0; i < burst; i++) spawnOne({ big: Math.random() < 0.08 });
        } else {
          spawnOne({ big: Math.random() < 0.06 });
        }
        spawnAccumulator -= 1;
      }

      const dt = Math.min(0.06, (1 / 60));
      for (let i = objects.length - 1; i >= 0; i--) {
        const o = objects[i];
        const ud = o.userData;
        ud.velocity.y -= 9.8 * dt * (0.3 + (o.scale.x > 1 ? 0.3 : 0));
        o.position.addScaledVector(ud.velocity, dt);
        o.rotation.x += ud.angular.x * dt;
        o.rotation.y += ud.angular.y * dt;
        o.rotation.z += ud.angular.z * dt;

        if (o.position.y < floorY) {
          if (Math.random() < 0.35) {
            o.position.y = floorY + 0.1;
            ud.velocity.y *= -0.55;
            ud.velocity.x *= 0.6;
            ud.velocity.z *= 0.6;
          } else {
            o.position.set(rand(-8, 8), rand(6, 16), rand(-8, 8));
            ud.velocity.set(rand(-3, 3), rand(2, 9), rand(-3, 3));
          }
        }

        ud.life -= dt;
        if (ud.life <= 0 || o.scale.x < 0.05) {
          scene.remove(o);
          objects.splice(i, 1);
        } else {
          if (insane && Math.random() < 0.003) {
            o.material.emissive = new THREE.Color().setHSL(Math.random(), 0.8, 0.5);
          } else {
            const pulse = 1 + Math.sin(performance.now() * 0.001 * (o.scale.x * 5)) * 0.03;
            o.scale.setScalar(o.scale.x * 0.999 + 0.001 * pulse);
          }
        }
      }

      if (insane) {
        if (Math.random() < 0.002) {
          scene.background = new THREE.Color().setHSL(Math.random(), 0.06, 0.03 + Math.random() * 0.06);
        }
      }
    }

    countSpan.textContent = `Objects: ${objects.length}`;

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(gameLoop);
  }

  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  btnToggle.addEventListener('click', () => {
    paused = !paused;
    btnToggle.textContent = paused ? 'Resume' : 'Pause';
    btnToggle.setAttribute('aria-pressed', String(paused));
  });

  spawnSlider.addEventListener('input', (e) => {
    spawnRate = Number(e.target.value);
  });

  btnCrazy.addEventListener('click', () => {
    insane = !insane;
    btnCrazy.textContent = insane ? 'CALM' : 'Trigger CRAZY!';
    btnCrazy.style.filter = insane ? 'hue-rotate(120deg) saturate(1.4)' : 'none';
    if (insane) {
      for (let i = 0; i < 120; i++) spawnOne({ big: Math.random() < 0.15 });
      doCameraShake();
    } else {
      for (let i = 0; i < Math.min(200, objects.length / 2); i++) {
        const o = objects[Math.floor(Math.random() * objects.length)];
        if (o) {
          scene.remove(o);
          const idx = objects.indexOf(o);
          if (idx >= 0) objects.splice(idx, 1);
        }
      }
    }
  });

  function doCameraShake() {
    const start = performance.now();
    const duration = 650 + Math.random() * 800;
    const intensity = 0.6 + Math.random() * 1.6;
    const orig = camera.position.clone();
    (function shake() {
      const now = performance.now();
      const t = (now - start) / duration;
      if (t >= 1) {
        camera.position.copy(orig);
        return;
      }
      const damper = (1 - t);
      camera.position.x = orig.x + (Math.sin(now * 0.02) * 0.7 + (Math.random() - 0.5)) * intensity * damper;
      camera.position.y = orig.y + (Math.cos(now * 0.015) * 0.4 + (Math.random() - 0.5)) * intensity * damper;
      camera.position.z = orig.z + (Math.sin(now * 0.025) * 0.5 + (Math.random() - 0.5)) * intensity * damper;
      requestAnimationFrame(shake);
    })();
  }

  for (let i = 0; i < 40; i++) spawnOne({ big: Math.random() < 0.08 });

  overlay.classList.add('hidden');
  lastSpawn = performance.now();
  requestAnimationFrame(gameLoop);

  window.addEventListener('keydown', (e) => {
    if (e.key === ' ') { btnCrazy.click(); e.preventDefault(); }
    if (e.key.toLowerCase() === 'p') { btnToggle.click(); }
  });

  console.log('Crazy 3D loaded — use the HUD to control the chaos.');
})();
