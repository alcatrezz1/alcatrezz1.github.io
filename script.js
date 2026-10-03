(function () {
  "use strict";

  /* ---------- tentacle demo ---------- */
  var cv = document.getElementById("creature");
  if (cv) {
    var ctx = cv.getContext("2d");
    var W = cv.width, H = cv.height, GROUND = 540;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var MAX = 8, COMBAT = 12000, REGROW = 4000;
    var FLESH = "#b4151f", FLESH_D = "#7d0d15", FLESH_L = "#d42a33";

    var st, debris = [], hitSegs = [], choosing = false;
    var el = {
      legs: document.getElementById("h-legs"), arms: document.getElementById("h-arms"),
      height: document.getElementById("h-height"), reach: document.getElementById("h-reach"),
      log: document.getElementById("demo-log"), state: document.getElementById("demo-state"),
      kill: document.getElementById("b-kill"), reset: document.getElementById("b-reset"),
      actions: document.querySelector(".demo-actions")
    };

    function fresh(legs, arms) {
      st = { legs: [], arms: [], combatUntil: 0, nextRegrow: 0, dead: 0 };
      for (var i = 0; i < legs; i++) st.legs.push(true);
      for (var j = 0; j < arms; j++) st.arms.push(true);
    }
    fresh(2, 1);

    function count(a) { var n = 0; for (var i = 0; i < a.length; i++) if (a[i]) n++; return n; }
    function log(t) { el.log.textContent = t; }

    function legsUp() { return count(st.legs); }
    function heightK() { return 1 + 0.16 * Math.max(0, legsUp() - 2); }
    function reachK() { return 1 + 0.12 * Math.max(0, legsUp() - 2); }

    function updateHud(now) {
      el.legs.textContent = count(st.legs) + " / " + st.legs.length;
      el.arms.textContent = count(st.arms) + " / " + st.arms.length;
      el.height.textContent = heightK().toFixed(2) + "x";
      el.reach.textContent = reachK().toFixed(2) + "x";
      var left = st.combatUntil - now;
      el.state.textContent = left > 0 ? "IN COMBAT " + Math.ceil(left / 1000) + "s" : "OUT OF COMBAT";
      el.state.style.color = left > 0 ? "var(--ember)" : "var(--muted)";
    }

    function body(now) {
      var t = reduce ? 0 : now / 1000;
      var hk = heightK();
      var bodyH = 70, bodyW = 64;
      var hipY = GROUND - 120 * hk + Math.sin(t * 2) * 3;
      var cx = W / 2 + Math.sin(t * 0.7) * 6;
      return { t: t, cx: cx, hipY: hipY, bodyH: bodyH, bodyW: bodyW };
    }

    function chainPath(points, w0, w1, color, dark) {
      for (var i = 0; i < points.length - 1; i++) {
        var a = points[i], b = points[i + 1];
        var w = w0 + (w1 - w0) * (i / (points.length - 1));
        ctx.strokeStyle = i % 2 ? dark : color;
        ctx.lineWidth = w;
        ctx.lineCap = "butt";
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        ctx.fillStyle = dark;
        ctx.fillRect(b[0] - w / 2, b[1] - w / 2, w, w);
      }
    }

    function legPoints(b, i, n) {
      var spread = 70 + 18 * n;
      var off = n === 1 ? 0 : (i / (n - 1) - 0.5) * 2;
      var side = off === 0 ? (i % 2 ? 1 : -1) : Math.sign(off);
      var hip = [b.cx + off * 20, b.hipY];
      var footX = b.cx + off * spread + Math.sin(b.t * 2.4 + i) * 4;
      var foot = [footX, GROUND];
      var kneeH = (b.hipY - GROUND) * 0.15;
      var knee = [hip[0] + (footX - hip[0]) * 0.6 + side * 14, b.hipY - 40 + kneeH * 0 - 10];
      var shin = [footX + side * 6, GROUND - 40];
      return [hip, knee, shin, foot];
    }

    function armPoints(b, i, n) {
      var off = n === 1 ? 0.35 : (i / (n - 1) - 0.5) * 2;
      var side = off >= 0 ? 1 : -1;
      var base = [b.cx + side * (b.bodyW / 2 - 8), b.hipY - b.bodyH + 14];
      var reach = 95 * reachK();
      var pts = [base];
      var ang = -Math.PI / 2 + off * 0.9;
      var x = base[0], y = base[1];
      for (var k = 0; k < 4; k++) {
        ang += side * (0.32 + 0.08 * Math.sin(b.t * 1.8 + i + k));
        var len = reach / 4 * (1 - k * 0.08);
        x += Math.cos(ang) * len; y += Math.sin(ang) * len;
        pts.push([x, y]);
      }
      return pts;
    }

    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      var b = body(now);
      hitSegs = [];

      // ground line
      ctx.strokeStyle = "rgba(255,106,43,0.25)";
      ctx.lineWidth = 2;
      ctx.setLineDash([18, 14]);
      ctx.beginPath(); ctx.moveTo(40, GROUND + 2); ctx.lineTo(W - 40, GROUND + 2); ctx.stroke();
      ctx.setLineDash([]);

      // legs
      for (var i = 0; i < st.legs.length; i++) {
        if (!st.legs[i]) continue;
        var lp = legPoints(b, i, st.legs.length);
        chainPath(lp, 20, 10, FLESH, FLESH_D);
        hitSegs.push({ kind: "legs", idx: i, pts: lp, w: 18 });
      }
      // body (blocky R6 torso + head)
      var tx = b.cx - b.bodyW / 2, ty = b.hipY - b.bodyH;
      ctx.fillStyle = "#151a2a"; ctx.fillRect(tx, ty, b.bodyW, b.bodyH);
      ctx.fillStyle = "#d6b59a"; ctx.fillRect(tx - 22, ty + 2, 20, 54); ctx.fillRect(tx + b.bodyW + 2, ty + 2, 20, 54);
      ctx.fillStyle = "#e0c0a5"; ctx.fillRect(b.cx - 20, ty - 42, 40, 38);
      ctx.fillStyle = "#1a0c0c"; ctx.fillRect(b.cx - 10, ty - 28, 5, 6); ctx.fillRect(b.cx + 5, ty - 28, 5, 6);
      // arms
      for (var j = 0; j < st.arms.length; j++) {
        if (!st.arms[j]) continue;
        var ap = armPoints(b, j, st.arms.length);
        chainPath(ap, 16, 7, FLESH_L, FLESH);
        hitSegs.push({ kind: "arms", idx: j, pts: ap, w: 16 });
      }

      // debris
      for (var d = debris.length - 1; d >= 0; d--) {
        var p = debris[d];
        p.vy += 0.5; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 1;
        if (p.y > GROUND - p.s / 2) { p.y = GROUND - p.s / 2; p.vy *= -0.3; p.vx *= 0.7; }
        ctx.save(); ctx.globalAlpha = Math.max(0, p.life / 90);
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 1.6);
        ctx.restore();
        if (p.life <= 0) debris.splice(d, 1);
      }

      if (st.dead && now - st.dead < 1600) {
        ctx.fillStyle = "rgba(60,0,4," + (0.6 * (1 - (now - st.dead) / 1600)) + ")";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ece2df";
        ctx.font = "700 64px Sarpanch, Impact, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("TORN APART", W / 2, H / 2);
      }
    }

    function tick(now) {
      if (now > st.combatUntil && now > st.nextRegrow) {
        var li = st.legs.indexOf(false), ai = st.arms.indexOf(false);
        if (li >= 0 || ai >= 0) {
          if (st.nextRegrow !== 0) {
            if (li >= 0) st.legs[li] = true; else st.arms[ai] = true;
            log("Out of combat: a tentacle grew back. One every 4 seconds.");
          }
          st.nextRegrow = now + REGROW;
        } else st.nextRegrow = 0;
      }
      if (now <= st.combatUntil) st.nextRegrow = st.combatUntil + REGROW;
      updateHud(now);
      draw(now);
      requestAnimationFrame(tick);
    }

    function distSeg(px, py, a, b) {
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var l = dx * dx + dy * dy || 1;
      var t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l));
      var x = a[0] + t * dx, y = a[1] + t * dy;
      return Math.hypot(px - x, py - y);
    }

    function tear(h, now) {
      st[h.kind][h.idx] = false;
      for (var k = 0; k < h.pts.length - 1; k++) {
        debris.push({ x: h.pts[k + 1][0], y: h.pts[k + 1][1], vx: (Math.random() - 0.5) * 9, vy: -4 - Math.random() * 6,
          r: 0, vr: (Math.random() - 0.5) * 0.4, s: h.w * 0.8, c: k % 2 ? FLESH_D : FLESH, life: 90 });
      }
      st.combatUntil = now + COMBAT;
      var left = count(st.legs) + count(st.arms);
      if (left === 0) {
        var keepL = Math.max(2, Math.ceil(st.legs.length / 2)), keepA = Math.max(1, Math.ceil(st.arms.length / 2));
        fresh(keepL, keepA);
        st.dead = now;
        log("Last tentacle gone. Died in a fight, so you keep half: " + keepL + " legs, " + keepA + (keepA === 1 ? " arm." : " arms."));
        return;
      }
      var word = h.kind === "legs" ? "leg" : "arm";
      log("Torn off: one " + word + ". Combat mode for 12 seconds, nothing heals. " + left + " left.");
    }

    function pointer(e) {
      var r = cv.getBoundingClientRect();
      var x = (e.clientX - r.left) * (W / r.width), y = (e.clientY - r.top) * (H / r.height);
      var best = null, bd = 1e9;
      for (var i = 0; i < hitSegs.length; i++) {
        var h = hitSegs[i];
        for (var k = 0; k < h.pts.length - 1; k++) {
          var d = distSeg(x, y, h.pts[k], h.pts[k + 1]);
          if (d < bd) { bd = d; best = h; }
        }
      }
      if (best && bd < best.w + 14) tear(best, performance.now());
      else log("Missed. Strikes go exactly where you aim, there is no auto-aim.");
    }
    cv.addEventListener("pointerdown", pointer);

    function setChoosing(on) {
      choosing = on;
      var old = el.actions.querySelectorAll(".choice");
      for (var i = 0; i < old.length; i++) old[i].remove();
      el.kill.hidden = on;
      if (!on) return;
      [["legs", "Z  Leg"], ["arms", "X  Arm"]].forEach(function (c) {
        var bt = document.createElement("button");
        bt.type = "button"; bt.className = "btn choice" + (c[0] === "legs" ? " primary" : "");
        bt.textContent = c[1];
        bt.addEventListener("click", function () { grow(c[0]); });
        el.actions.insertBefore(bt, el.reset);
      });
      log("Kill confirmed. Pick a role for the new tentacle.");
    }

    function grow(kind) {
      st[kind].push(true);
      setChoosing(false);
      var total = st.legs.length + st.arms.length;
      log(kind === "legs" ? "New leg: taller, faster, longer reach." : "New arm: one more thing to hit with.");
      if (total >= MAX) { el.kill.disabled = true; log("8 tentacles, the cap. Past this you need a prestige fight."); }
    }

    el.kill.addEventListener("click", function () {
      if (st.legs.length + st.arms.length >= MAX) return;
      setChoosing(true);
    });
    el.reset.addEventListener("click", function () {
      fresh(2, 1); debris = []; setChoosing(false); el.kill.disabled = false;
      log("A fresh graft: 2 legs and 1 arm.");
    });
    window.addEventListener("keydown", function (e) {
      if (!choosing) return;
      if (e.key === "z" || e.key === "Z") grow("legs");
      if (e.key === "x" || e.key === "X") grow("arms");
    });

    requestAnimationFrame(tick);
  }

  /* ---------- lightbox ---------- */
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lb-img"), lbCap = document.getElementById("lb-cap");
  var lastBtn = null;
  document.querySelectorAll(".plate button").forEach(function (b) {
    b.addEventListener("click", function () {
      var img = b.querySelector("img");
      lbImg.src = img.src; lbImg.alt = img.alt; lbCap.textContent = b.getAttribute("data-cap") || "";
      lastBtn = b; lb.hidden = false; document.getElementById("lb-close").focus();
    });
  });
  function closeLb() { lb.hidden = true; if (lastBtn) lastBtn.focus(); }
  document.getElementById("lb-close").addEventListener("click", closeLb);
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
  window.addEventListener("keydown", function (e) { if (e.key === "Escape" && !lb.hidden) closeLb(); });

  /* ---------- copy handle ---------- */
  var copyBtn = document.getElementById("copy"), out = document.getElementById("copied");
  copyBtn.addEventListener("click", function () {
    var text = document.getElementById("discord").textContent;
    function fallback() {
      var r = document.createRange(); r.selectNodeContents(document.getElementById("discord"));
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      out.textContent = "Selected. Press Ctrl+C to copy.";
    }
    try {
      navigator.clipboard.writeText(text).then(function () { out.textContent = "Copied: " + text; }, fallback);
    } catch (e) { fallback(); }
  });
})();

(function () {
  "use strict";
  /* ---------- code tabs ---------- */
  var tabs = document.querySelectorAll(".tab");
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      tabs.forEach(function (o) {
        var on = o === t;
        o.setAttribute("aria-selected", on ? "true" : "false");
        document.getElementById(o.getAttribute("aria-controls")).hidden = !on;
      });
    });
  });

  /* ---------- tiny Luau highlighter ---------- */
  var KW = /^(local|function|end|if|then|else|elseif|for|in|do|return|not|and|or|while|break|type|nil|true|false)$/;
  var TY = /^(Vector3|Player|number|string|any|RemoteEvent|math|os|ipairs|pairs|assert)$/;
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  document.querySelectorAll("code.lua").forEach(function (c) {
    var src = c.textContent, out = "", re = /(--[^\n]*)|("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|([\s\S])/g, m;
    while ((m = re.exec(src))) {
      if (m[1]) out += '<span class="tok-c">' + esc(m[1]) + "</span>";
      else if (m[2]) out += '<span class="tok-s">' + esc(m[2]) + "</span>";
      else if (m[3]) out += '<span class="tok-n">' + m[3] + "</span>";
      else if (m[4]) out += KW.test(m[4]) ? '<span class="tok-k">' + m[4] + "</span>" : TY.test(m[4]) ? '<span class="tok-t">' + m[4] + "</span>" : m[4];
      else out += esc(m[5]);
    }
    c.innerHTML = out;
  });
})();

(function () {
  "use strict";
  /* ---------- ability kit clip: sound toggle, respect reduced motion ---------- */
  var v = document.getElementById("kit-video");
  var b = document.getElementById("kit-sound");
  if (!v || !b) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    v.removeAttribute("autoplay");
    v.pause();
    v.controls = true;
  }
  b.addEventListener("click", function () {
    v.muted = !v.muted;
    if (!v.muted) { v.play().catch(function () {}); }
    b.setAttribute("aria-pressed", v.muted ? "false" : "true");
    b.textContent = v.muted ? "Sound on" : "Sound off";
  });
})();
