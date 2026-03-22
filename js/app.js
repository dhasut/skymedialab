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

  /**
   * Vanta CLOUDS2 declares iMouse but never uses it in the fragment shader, so
   * mouseControls / touchControls do nothing. We add a light parallax on .cloud-layer instead.
   */
  function initCloudLayerParallax() {
    var layer = document.querySelector(".cloud-layer");
    if (!layer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    var curX = 0;
    var curY = 0;
    var tgtX = 0;
    var tgtY = 0;
    var rafId = null;
    var maxPx = 16;
    var k = 0.02;

    function tick() {
      curX += (tgtX - curX) * 0.1;
      curY += (tgtY - curY) * 0.1;
      layer.style.transform =
        "translate3d(" +
        curX.toFixed(2) +
        "px," +
        curY.toFixed(2) +
        "px,0) scale(1.06)";
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
      var nx = (clientX - cx) * k;
      var ny = (clientY - cy) * k;
      tgtX = Math.max(-maxPx, Math.min(maxPx, nx));
      tgtY = Math.max(-maxPx, Math.min(maxPx, ny));
      queue();
    }

    window.addEventListener(
      "pointermove",
      function (e) {
        setFromClient(e.clientX, e.clientY);
      },
      { passive: true }
    );
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
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1,
        speed: 0.8,
        texturePath: texturePath,
        backgroundColor: 0x619cd7,
        skyColor: 0x619cd7,
      });
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
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function syncHeaderLogo(route) {
    var header = document.getElementById("site-header");
    if (!header) {
      return;
    }
    var hideLogo =
      route.name === "home" &&
      (route.scroll === "section-about" || route.scroll === "section-contact");
    header.classList.toggle("site-header--hide-logo", hideLogo);
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
        homeScroll.scrollTop = 0;
      }
    });
  }

  window.addEventListener("load", function () {
    initMobileNav();
    initCloudLayerParallax();
    requestAnimationFrame(function () {
      initVantaOnce();
      applyRoute();
    });
  });
  window.addEventListener("hashchange", applyRoute);
})();
