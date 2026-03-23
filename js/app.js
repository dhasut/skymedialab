(function () {
  "use strict";

  function assetUrl(relativePath) {
    var path = location.pathname.replace(/\/(index\.html)?$/i, "");
    if (path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    if (!path) {
      return relativePath;
    }
    return path + "/" + relativePath;
  }

  var viewHome = document.getElementById("view-home");
  var viewDictio = document.getElementById("view-dictio");
  var homeScroll = document.querySelector(".home-scroll");
  var vantaEl = document.getElementById("vanta-clouds");

  var vantaEffect = null;

  /** True while hash-driven scroll is running (avoid fighting URL sync). */
  var programmaticHomeScroll = false;
  var homeScrollHashTimer = null;

  /**
   * Live-tune in DevTools: SKY_PARALLAX.kx = 0.12; SKY_PARALLAX.maxPxX = 80;
   * Parallax ignores OS reduce-motion unless SKY_PARALLAX.respectReducedMotion === true.
   */
  window.SKY_PARALLAX = {
    kx: -0.04,
    ky: -0.008,
    maxPxX: 100,
    maxPxY: 6,
    lerpX: 0.2,
    lerpY: 0.1,
    layerScale: 1.06,
    /* Set true to skip parallax when OS "reduce motion" is on */
    respectReducedMotion: false,
  };

  /**
   * Vanta CLOUDS2 ignores iMouse in its shader; we pan .cloud-layer with translate3d.
   * Pointer position vs viewport center drives target offset (horizontal-heavy).
   */
  function initCloudLayerParallax() {
    var layer = document.querySelector(".cloud-layer");
    if (!layer) {
      console.warn("[Sky Media Lab] Cloud parallax: no .cloud-layer");
      return;
    }
    var cfg = window.SKY_PARALLAX;
    if (
      cfg.respectReducedMotion &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      console.warn(
        "[Sky Media Lab] Cloud parallax off (respectReducedMotion + prefers-reduced-motion)"
      );
      return;
    }
    var curX = 0;
    var curY = 0;
    var tgtX = 0;
    var tgtY = 0;
    var rafId = null;

    function tick() {
      curX += (tgtX - curX) * cfg.lerpX;
      curY += (tgtY - curY) * cfg.lerpY;
      var sc = typeof cfg.layerScale === "number" ? cfg.layerScale : 1.06;
      layer.style.transform =
        "translate3d(" +
        curX.toFixed(2) +
        "px," +
        curY.toFixed(2) +
        "px,0) scale(" +
        sc +
        ")";
      if (Math.abs(tgtX - curX) > 0.04 || Math.abs(tgtY - curY) > 0.04) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    }

    function queue() {
      if (rafId == null) {
        rafId = requestAnimationFrame(tick);
      }
    }

    function setFromClient(clientX, clientY) {
      var cx = window.innerWidth * 0.5;
      var cy = window.innerHeight * 0.5;
      var kx = typeof cfg.kx === "number" ? cfg.kx : 0.055;
      var ky = typeof cfg.ky === "number" ? cfg.ky : 0.008;
      var maxX = typeof cfg.maxPxX === "number" ? cfg.maxPxX : 48;
      var maxY = typeof cfg.maxPxY === "number" ? cfg.maxPxY : 6;
      var nx = (clientX - cx) * kx;
      var ny = (clientY - cy) * ky;
      tgtX = Math.max(-maxX, Math.min(maxX, nx));
      tgtY = Math.max(-maxY, Math.min(maxY, ny));
      queue();
    }

    var move = function (e) {
      setFromClient(e.clientX, e.clientY);
    };
    if (typeof window.PointerEvent === "function") {
      window.addEventListener("pointermove", move, { passive: true });
    } else {
      window.addEventListener("mousemove", move, { passive: true });
    }
  }

  /**
   * Drawing buffer = ⅓ of layout (CSS) width/height — not × devicePixelRatio.
   * Vanta keeps a stale window.resize + rAF(ref) to the *original* resize, which
   * resets the canvas to layout×DPR (e.g. 1290×2796). We re-apply after that.
   */
  function setupVantaThirdResolution(effect) {
    if (!effect || typeof effect.resize !== "function" || !effect.renderer || !vantaEl) {
      return;
    }
    var originalResize = effect.resize.bind(effect);

    function applyThirdBuffer() {
      if (!effect.renderer) {
        return;
      }
      effect.setSize();
      var rect = vantaEl.getBoundingClientRect();
      var vw = Math.max(1, Math.round(rect.width));
      var vh = Math.max(1, Math.round(rect.height));
      var bufW = Math.max(32, Math.round(vw / 3));
      var bufH = Math.max(32, Math.round(vh / 3));
      if (effect.camera) {
        effect.camera.aspect = vw / vh;
        if (typeof effect.camera.updateProjectionMatrix === "function") {
          effect.camera.updateProjectionMatrix();
        }
      }
      effect.renderer.setPixelRatio(1);
      effect.renderer.setSize(bufW, bufH, false);
      var canvas = effect.renderer.domElement;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      var sc = effect.scale || 1;
      if (effect.uniforms && effect.uniforms.iResolution) {
        effect.uniforms.iResolution.value.x = bufW / sc;
        effect.uniforms.iResolution.value.y = bufH / sc;
      }
    }

    effect.resize = function () {
      if (!effect.renderer) {
        originalResize();
        return;
      }
      originalResize();
      applyThirdBuffer();
    };

    function afterVantaDefaultResize() {
      applyThirdBuffer();
    }

    effect.resize();
    requestAnimationFrame(afterVantaDefaultResize);
    window.addEventListener("resize", afterVantaDefaultResize, { passive: true });
  }

  function initVantaOnce() {
    if (vantaEffect || !vantaEl || !window.VANTA || typeof window.VANTA.CLOUDS2 !== "function") {
      return;
    }
    var texturePath = assetUrl("gallery/noise.png");
    try {
      vantaEffect = window.VANTA.CLOUDS2({
        el: vantaEl,
        mouseControls: false,
        touchControls: false,
        gyroControls: false,
        minHeight: 300.0,
        minWidth: 150.0,
        scale: 1,
        scaleMobile: 1,
        speed: 0.7,
        texturePath: texturePath,
        backgroundColor: 0x619cd7,
        skyColor: 0x619cd7,
      });
      setupVantaThirdResolution(vantaEffect);
      if (window.visualViewport) {
        window.visualViewport.addEventListener(
          "resize",
          function () {
            if (vantaEffect && typeof vantaEffect.resize === "function") {
              vantaEffect.resize();
            }
          },
          { passive: true }
        );
      }
    } catch (e) {
      console.warn("[Sky Media Lab] Vanta init failed", e);
    }
  }

  function parseHash() {
    var raw = (location.hash || "#/").replace(/^#/, "").replace(/^\//, "");
    var parts = raw.split("/").filter(Boolean);
    if (parts.length === 0) {
      return { name: "home", scroll: null };
    }
    if (parts[0] === "projects" && parts[1] === "dictio") {
      return { name: "dictio", scroll: null };
    }
    if (parts[0] === "projects") {
      return { name: "home", scroll: "section-projects" };
    }
    if (parts[0] === "about") {
      return { name: "home", scroll: "section-about" };
    }
    if (parts[0] === "contact") {
      return { name: "home", scroll: "section-contact" };
    }
    return { name: "home", scroll: null };
  }

  function scrollHomeTo(id) {
    if (!homeScroll || !id) {
      return;
    }
    var target = document.getElementById(id);
    if (target) {
      programmaticHomeScroll = true;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(function () {
        programmaticHomeScroll = false;
        syncHomeUrlAndLogoFromScroll();
      }, 550);
    }
  }

  /** Canonical home hash for comparison (about includes default `#/`). */
  function homeRouteToHashString(route) {
    if (!route || route.name !== "home") {
      return null;
    }
    if (route.scroll === "section-projects") {
      return "#/projects";
    }
    if (route.scroll === "section-contact") {
      return "#/contact";
    }
    return "#/about";
  }

  function homeSectionIdToHash(id) {
    if (id === "section-projects") {
      return "#/projects";
    }
    if (id === "section-contact") {
      return "#/contact";
    }
    return "#/about";
  }

  /** Y-offset of element top within .home-scroll content (matches scrollTop space). */
  function sectionTopInHomeScroll(el) {
    if (!homeScroll || !el) {
      return 0;
    }
    return (
      el.getBoundingClientRect().top -
      homeScroll.getBoundingClientRect().top +
      homeScroll.scrollTop
    );
  }

  /** Which home panel is snapped / dominant from scroll position. */
  function getActiveHomeSectionId() {
    if (!homeScroll) {
      return null;
    }
    var ids = ["section-about", "section-projects", "section-contact"];
    var st = homeScroll.scrollTop;
    var bestId = null;
    var bestDist = Infinity;
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (!el) {
        continue;
      }
      var dist = Math.abs(sectionTopInHomeScroll(el) - st);
      if (dist < bestDist) {
        bestDist = dist;
        bestId = ids[i];
      }
    }
    return bestId;
  }

  function syncHomeUrlAndLogoFromScroll() {
    if (!viewHome || !viewHome.classList.contains("view--active")) {
      return;
    }
    if (programmaticHomeScroll) {
      return;
    }
    var id = getActiveHomeSectionId();
    if (!id) {
      return;
    }
    var want = homeSectionIdToHash(id);
    var route = parseHash();
    if (route.name !== "home") {
      return;
    }
    var have = homeRouteToHashString(route);
    if (have === want) {
      syncHeaderLogo(parseHash());
      return;
    }
    var nextUrl = location.pathname + location.search + want;
    history.replaceState(null, "", nextUrl);
    syncHeaderLogo(parseHash());
  }

  function scheduleSyncHomeUrlFromScroll() {
    if (!homeScroll || !viewHome.classList.contains("view--active")) {
      return;
    }
    if (programmaticHomeScroll) {
      return;
    }
    if (homeScrollHashTimer != null) {
      window.clearTimeout(homeScrollHashTimer);
    }
    homeScrollHashTimer = window.setTimeout(function () {
      homeScrollHashTimer = null;
      syncHomeUrlAndLogoFromScroll();
    }, 120);
  }

  function initHomeScrollHashSync() {
    if (!homeScroll) {
      return;
    }
    homeScroll.addEventListener("scroll", scheduleSyncHomeUrlFromScroll, {
      passive: true,
    });
    homeScroll.addEventListener("scrollend", function () {
      if (homeScrollHashTimer != null) {
        window.clearTimeout(homeScrollHashTimer);
        homeScrollHashTimer = null;
      }
      syncHomeUrlAndLogoFromScroll();
    });
  }

  /** Small header logo: only on projects panel and project (Dictio) view. */
  function syncHeaderLogo(route) {
    var header = document.getElementById("site-header");
    if (!header) {
      return;
    }
    var showSmallLogo =
      route.name === "dictio" ||
      (route.name === "home" && route.scroll === "section-projects");
    header.classList.toggle("site-header--hide-logo", !showSmallLogo);
  }

  function closeProjectsNav() {
    var details = document.querySelector("details.nav-dropdown");
    if (details) {
      details.removeAttribute("open");
    }
  }

  function isMobileNav() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  function setMobileMenuOpen(open) {
    var body = document.body;
    var toggle = document.getElementById("nav-toggle");
    var drawer = document.getElementById("site-drawer");
    var backdrop = document.getElementById("nav-backdrop");
    if (open) {
      body.classList.add("menu-open");
      if (toggle) {
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "Close menu");
      }
      if (drawer) {
        drawer.setAttribute("aria-hidden", "false");
      }
      if (backdrop) {
        backdrop.setAttribute("aria-hidden", "false");
      }
    } else {
      body.classList.remove("menu-open");
      if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      }
      if (drawer) {
        drawer.setAttribute("aria-hidden", "true");
      }
      if (backdrop) {
        backdrop.setAttribute("aria-hidden", "true");
      }
    }
  }

  function closeMobileMenu() {
    if (document.body.classList.contains("menu-open")) {
      setMobileMenuOpen(false);
    }
  }

  function initMobileNav() {
    var toggle = document.getElementById("nav-toggle");
    var backdrop = document.getElementById("nav-backdrop");
    var drawer = document.getElementById("site-drawer");
    if (!toggle || !drawer) {
      return;
    }

    toggle.addEventListener("click", function () {
      if (!isMobileNav()) {
        return;
      }
      var open = !document.body.classList.contains("menu-open");
      setMobileMenuOpen(open);
    });

    if (backdrop) {
      backdrop.addEventListener("click", function () {
        closeMobileMenu();
      });
    }

    drawer.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        closeMobileMenu();
      }
    });

    var logo = document.querySelector(".site-header .logo");
    if (logo) {
      logo.addEventListener("click", function () {
        closeMobileMenu();
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeMobileMenu();
        closeProjectsNav();
      }
    });

    window.addEventListener(
      "resize",
      function () {
        if (!isMobileNav()) {
          closeMobileMenu();
        }
      },
      { passive: true }
    );
  }

  function applyRoute() {
    closeProjectsNav();
    closeMobileMenu();
    var route = parseHash();

    if (route.name === "dictio") {
      syncHeaderLogo(route);
      viewHome.classList.remove("view--active");
      viewHome.setAttribute("aria-hidden", "true");
      viewDictio.hidden = false;
      viewDictio.classList.add("view--active");
      viewDictio.setAttribute("aria-hidden", "false");
      viewDictio.querySelector(".project-scroll").scrollTop = 0;
      return;
    }

    syncHeaderLogo(route);

    viewDictio.classList.remove("view--active");
    viewDictio.setAttribute("aria-hidden", "true");
    viewDictio.hidden = true;
    viewHome.classList.add("view--active");
    viewHome.setAttribute("aria-hidden", "false");

    requestAnimationFrame(function () {
      if (route.scroll) {
        requestAnimationFrame(function () {
          scrollHomeTo(route.scroll);
        });
      } else if (homeScroll) {
        programmaticHomeScroll = true;
        homeScroll.scrollTop = 0;
        window.setTimeout(function () {
          programmaticHomeScroll = false;
          syncHomeUrlAndLogoFromScroll();
        }, 80);
      } else {
        syncHomeUrlAndLogoFromScroll();
      }
    });
  }

  window.addEventListener("load", function () {
    initMobileNav();
    initHomeScrollHashSync();
    initCloudLayerParallax();
    requestAnimationFrame(function () {
      initVantaOnce();
      applyRoute();
      syncHomeUrlAndLogoFromScroll();
    });
  });
  window.addEventListener("hashchange", applyRoute);
})();
