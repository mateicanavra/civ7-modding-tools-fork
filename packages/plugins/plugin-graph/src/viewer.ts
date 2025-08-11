export function buildGraphViewerHtml(params: { title: string; svg: string }): string {
  const { title, svg } = params;
  const safeTitle = String(title || "Graph");
  return /*html*/ `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(safeTitle)}</title>
  <style>
    html, body { height: 100%; }
    body { margin: 0; background: #ffffff; color: #111827; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif; }
    #viewer { width: 100vw; height: 100vh; overflow: hidden; background: #ffffff; }
    #viewer svg { display: block; width: 100%; height: 100%; user-select: none; -webkit-user-select: none; -ms-user-select: none; -moz-user-select: none; touch-action: none; cursor: grab; }
    #viewer svg:active { cursor: grabbing; }
    .hint { position: fixed; right: 12px; bottom: 8px; font-size: 12px; opacity: 0.75; background: rgba(255, 255, 255, 0.9); padding: 4px 8px; border-radius: 6px; border: 1px solid #e5e7eb; pointer-events: none; }
  </style>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data:; img-src 'self' data:; style-src 'self' 'unsafe-inline';" />
  <meta name="referrer" content="no-referrer" />
  <meta name="color-scheme" content="dark light" />
  <meta name="robots" content="noindex" />
</head>
<body>
  <div id="viewer">
    ${svg}
  </div>
  <div class="hint">Wheel to zoom • Drag to pan • Double‑click to fit</div>
  <script>
    (function () {
      function onReady(fn) {
        if (document.readyState === "loading")
          document.addEventListener("DOMContentLoaded", fn);
        else {
          fn();
        }
      }
      onReady(function initPanZoom() {
        var container = document.getElementById("viewer");
        if (!container) return;
        var svg = container.querySelector("svg");
        if (!svg) return;
        try {
          svg.removeAttribute("width");
          svg.removeAttribute("height");
        } catch (e) {}
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        var baseVB = (function resolveBaseViewBox() {
          var vb = svg.viewBox && svg.viewBox.baseVal;
          if (vb && vb.width && vb.height) {
            return { x: vb.x, y: vb.y, width: vb.width, height: vb.height };
          }
          try {
            var bbox = svg.getBBox();
            return {
              x: bbox.x,
              y: bbox.y,
              width: bbox.width,
              height: bbox.height,
            };
          } catch (_e) {
            return { x: 0, y: 0, width: 1000, height: 1000 };
          }
        })();
        var curVB = {
          x: baseVB.x,
          y: baseVB.y,
          width: baseVB.width,
          height: baseVB.height,
        };
        svg.setAttribute(
          "viewBox",
          curVB.x + " " + curVB.y + " " + curVB.width + " " + curVB.height
        );
        var MIN_SCALE = 0.05;
        var MAX_SCALE = 10;
        function setViewBox(x, y, w, h) {
          curVB.x = x;
          curVB.y = y;
          curVB.width = w;
          curVB.height = h;
          svg.setAttribute("viewBox", x + " " + y + " " + w + " " + h);
        }
        var zoomAnim = null;
        function lerp(a, b, t) {
          return a + (b - a) * t;
        }
        function clamp01(v) {
          return v < 0 ? 0 : v > 1 ? 1 : v;
        }
        function easeOutCubic(t) {
          t = clamp01(t);
          return 1 - Math.pow(1 - t, 3);
        }
        function flushZoomAnimation() {
          if (!zoomAnim) return;
          var now = performance.now();
          var t = (now - zoomAnim.start) / zoomAnim.dur;
          if (t >= 1) {
            setViewBox(
              zoomAnim.to.x,
              zoomAnim.to.y,
              zoomAnim.to.w,
              zoomAnim.to.h
            );
            zoomAnim = null;
            return;
          }
          var e = easeOutCubic(t);
          var nx = lerp(zoomAnim.from.x, zoomAnim.to.x, e);
          var ny = lerp(zoomAnim.from.y, zoomAnim.to.y, e);
          var nw = lerp(zoomAnim.from.w, zoomAnim.to.w, e);
          var nh = lerp(zoomAnim.from.h, zoomAnim.to.h, e);
          setViewBox(nx, ny, nw, nh);
        }
        function scheduleZoomRect(nx, ny, nw, nh, durMs) {
          flushZoomAnimation();
          zoomAnim = {
            from: {
              x: curVB.x,
              y: curVB.y,
              w: curVB.width,
              h: curVB.height,
            },
            to: { x: nx, y: ny, w: nw, h: nh },
            start: performance.now(),
            dur: durMs,
          };
        }
        function scheduleZoomToAtAnchor(anchorRx, anchorRy, factor, durMs) {
          flushZoomAnimation();
          var currentScale = baseVB.width / curVB.width;
          var newScale = Math.min(
            MAX_SCALE,
            Math.max(MIN_SCALE, currentScale * factor)
          );
          var newW = baseVB.width / newScale;
          var newH = baseVB.height / newScale;
          var newX = curVB.x + anchorRx * (curVB.width - newW);
          var newY = curVB.y + anchorRy * (curVB.height - newH);
          scheduleZoomRect(newX, newY, newW, newH, durMs);
        }
        function fit() {
          setViewBox(baseVB.x, baseVB.y, baseVB.width, baseVB.height);
        }
        fit();
        window.addEventListener("resize", fit);
        function getClientRect() {
          return svg.getBoundingClientRect();
        }
        container.addEventListener(
          "wheel",
          function (e) {
            e.preventDefault();
            if (zoomAnim) {
              zoomAnim = null;
            }
            var rect = getClientRect();
            var cx = e.clientX - rect.left;
            var cy = e.clientY - rect.top;
            var rx = cx / (rect.width || 1);
            var ry = cy / (rect.height || 1);
            var currentScale = baseVB.width / curVB.width;
            var wheel = e.deltaY;
            var zoomFactor = Math.exp(-wheel * 0.001);
            var newScale = Math.min(
              MAX_SCALE,
              Math.max(MIN_SCALE, currentScale * zoomFactor)
            );
            var newW = baseVB.width / newScale;
            var newH = baseVB.height / newScale;
            var newX = curVB.x + rx * (curVB.width - newW);
            var newY = curVB.y + ry * (curVB.height - newH);
            setViewBox(newX, newY, newW, newH);
          },
          { passive: false }
        );
        var dragging = false;
        var startX = 0,
          startY = 0,
          startVBx = 0,
          startVBy = 0,
          startVBw = 0,
          startVBh = 0;
        container.addEventListener("mousedown", function (e) {
          if (e.button !== 0) return;
          if (zoomAnim) {
            zoomAnim = null;
          }
          dragging = true;
          startX = e.clientX;
          startY = e.clientY;
          startVBx = curVB.x;
          startVBy = curVB.y;
          startVBw = curVB.width;
          startVBh = curVB.height;
          e.preventDefault();
        });
        window.addEventListener("mousemove", function (e) {
          if (!dragging) return;
          if (zoomAnim) {
            zoomAnim = null;
          }
          var rect = getClientRect();
          var dxPx = e.clientX - startX;
          var dyPx = e.clientY - startY;
          var dx = -dxPx * (startVBw / (rect.width || 1));
          var dy = -dyPx * (startVBh / (rect.height || 1));
          setViewBox(startVBx + dx, startVBy + dy, curVB.width, curVB.height);
        });
        window.addEventListener("mouseup", function () {
          dragging = false;
        });
        function panBy(dxScreenPx, dyScreenPx) {
          var rect = getClientRect();
          var dx = dxScreenPx * (curVB.width / (rect.width || 1));
          var dy = dyScreenPx * (curVB.height / (rect.height || 1));
          setViewBox(curVB.x + dx, curVB.y + dy, curVB.width, curVB.height);
        }
        function scheduleZoomToCenter(factor) {
          scheduleZoomToAtAnchor(0.5, 0.5, factor, 220);
        }
        var pressed = {
          left: false,
          right: false,
          up: false,
          down: false,
          shift: false,
        };
        var vx = 0,
          vy = 0;
        var BASE_SPEED = 2000;
        var ACCEL = 16000;
        var DECEL = 3500;
        var rafId = 0;
        var lastTs = 0;
        function step(ts) {
          if (!lastTs) lastTs = ts;
          var dt = Math.max(0, (ts - lastTs) / 1000);
          lastTs = ts;
          var dx = (pressed.right ? 1 : 0) + (pressed.left ? -1 : 0);
          var dy = (pressed.down ? 1 : 0) + (pressed.up ? -1 : 0);
          var len = Math.hypot(dx, dy) || 0;
          if (len > 0) {
            dx /= len;
            dy /= len;
          }
          var speed = BASE_SPEED * (pressed.shift ? 2 : 1);
          var targetVx = dx * speed;
          var targetVy = dy * speed;
          function approach(v, target, a) {
            var delta = target - v;
            var step = a * dt;
            if (Math.abs(delta) <= step) return target;
            return v + Math.sign(delta) * step;
          }
          var ax =
            (Math.abs(targetVx) > 0 ? ACCEL : DECEL) *
            (targetVx - vx > 0 ? 1 : -1);
          var ay =
            (Math.abs(targetVy) > 0 ? ACCEL : DECEL) *
            (targetVy - vy > 0 ? 1 : -1);
          vx = approach(
            vx,
            targetVx,
            Math.abs(targetVx) > 0 ? ACCEL : DECEL
          );
          vy = approach(
            vy,
            targetVy,
            Math.abs(targetVy) > 0 ? ACCEL : DECEL
          );
          if (vx !== 0 || vy !== 0) {
            if (zoomAnim) {
              flushZoomAnimation();
              zoomAnim = null;
            }
            panBy(vx * dt, vy * dt);
          }
          if (zoomAnim) {
            var t = (ts - zoomAnim.start) / zoomAnim.dur;
            if (t >= 1) {
              setViewBox(
                zoomAnim.to.x,
                zoomAnim.to.y,
                zoomAnim.to.w,
                zoomAnim.to.h
              );
              zoomAnim = null;
            } else {
              var e = easeOutCubic(t);
              var nx = lerp(zoomAnim.from.x, zoomAnim.to.x, e);
              var ny = lerp(zoomAnim.from.y, zoomAnim.to.y, e);
              var nw = lerp(zoomAnim.from.w, zoomAnim.to.w, e);
              var nh = lerp(zoomAnim.from.h, zoomAnim.to.h, e);
              setViewBox(nx, ny, nw, nh);
            }
          }
          rafId = window.requestAnimationFrame(step);
        }
        rafId = window.requestAnimationFrame(step);
        window.addEventListener("keydown", function (e) {
          if (e.key === "Shift") pressed.shift = true;
          else if (
            e.key === "ArrowLeft" ||
            e.key === "a" ||
            e.key === "A"
          ) {
            pressed.left = true;
            e.preventDefault();
          } else if (
            e.key === "ArrowRight" ||
            e.key === "d" ||
            e.key === "D"
          ) {
            pressed.right = true;
            e.preventDefault();
          } else if (
            e.key === "ArrowUp" ||
            e.key === "w" ||
            e.key === "W"
          ) {
            pressed.up = true;
            e.preventDefault();
          } else if (
            e.key === "ArrowDown" ||
            e.key === "s" ||
            e.key === "S"
          ) {
            pressed.down = true;
            e.preventDefault();
          } else if (e.key === "+" || e.key === "=") {
            scheduleZoomToCenter(1.4);
            e.preventDefault();
          } else if (e.key === "-" || e.key === "_") {
            scheduleZoomToCenter(1 / 1.4);
            e.preventDefault();
          } else if (e.key === "0") {
            scheduleZoomRect(
              baseVB.x,
              baseVB.y,
              baseVB.width,
              baseVB.height,
              260
            );
            e.preventDefault();
          }
        });
        window.addEventListener("keyup", function (e) {
          if (e.key === "Shift") pressed.shift = false;
          else if (
            e.key === "ArrowLeft" ||
            e.key === "a" ||
            e.key === "A"
          )
            pressed.left = false;
          else if (
            e.key === "ArrowRight" ||
            e.key === "d" ||
            e.key === "D"
          )
            pressed.right = false;
          else if (
            e.key === "ArrowUp" ||
            e.key === "w" ||
            e.key === "W"
          )
            pressed.up = false;
          else if (
            e.key === "ArrowDown" ||
            e.key === "s" ||
            e.key === "S"
          )
            pressed.down = false;
        });
        container.addEventListener("dblclick", fit);
      });
    })();
  </script>
</body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}