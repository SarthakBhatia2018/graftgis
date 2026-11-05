(function () {
  "use strict";

  // Mobile navigation
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");

  function closeNav() {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
  }

  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) closeNav();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("is-open")) {
      closeNav();
      toggle.focus();
    }
  });

  window.matchMedia("(min-width: 961px)").addEventListener("change", function (mq) {
    if (mq.matches) closeNav();
  });

  // "Request access" buttons jump to the form, preselect a role if given, and focus the first field
  var nameField = document.getElementById("name");
  var roleField = document.getElementById("role");
  document.querySelectorAll(".js-request").forEach(function (link) {
    link.addEventListener("click", function () {
      if (link.dataset.role) roleField.value = link.dataset.role;
      setTimeout(function () { nameField.focus({ preventScroll: true }); }, 450);
    });
  });

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Houston demo map
  // Illustrative geometry only: a bayou, the FEMA Zone AE band around it, and a wider,
  // irregular Harvey inundation extent. Live records swap these for FEMA NFHL and HCFCD layers.
  (function () {
    var svg = document.getElementById("demo-map");
    if (!svg) return;
    var NS = "http://www.w3.org/2000/svg";
    var statEl = document.getElementById("demo-stat");
    var readout = document.getElementById("demo-readout");
    var legendEl = document.getElementById("demo-legend");
    var buttons = document.querySelectorAll(".toggle-btn");

    var COLORS = { dry: "#d5dbe3", zone: "#5b9be8", flooded: "#1061d6", outside: "#f08a24" };
    var AE = 66;
    function bayou(x) { return 205 + 42 * Math.sin(x / 95) + 14 * Math.sin(x / 33 + 1); }
    function reachN(x) { return 104 + 30 * Math.sin(x / 110 + 0.6) + 12 * Math.sin(x / 41); }
    function reachS(x) { return 96 + 26 * Math.sin(x / 130 + 2.2) + 8 * Math.sin(x / 29); }

    function el(name, attrs) {
      var node = document.createElementNS(NS, name);
      for (var k in attrs) node.setAttribute(k, attrs[k]);
      return node;
    }

    function band(top, bottom) {
      var pts = [], x;
      for (x = -10; x <= 650; x += 10) pts.push(x + "," + top(x).toFixed(1));
      for (x = 650; x >= -10; x -= 10) pts.push(x + "," + bottom(x).toFixed(1));
      return "M" + pts.join("L") + "Z";
    }

    function line(fn) {
      var pts = [];
      for (var x = -10; x <= 650; x += 10) pts.push(x + "," + fn(x).toFixed(1));
      return "M" + pts.join("L");
    }

    var harveyLayer = el("path", {
      class: "layer",
      d: band(function (x) { return bayou(x) - reachN(x); }, function (x) { return bayou(x) + reachS(x); }),
      fill: "rgba(16, 97, 214, .16)"
    });
    var zoneLayer = el("path", {
      class: "layer",
      d: band(function (x) { return bayou(x) - AE; }, function (x) { return bayou(x) + AE; }),
      fill: "rgba(91, 155, 232, .2)",
      stroke: "#1061d6",
      "stroke-width": "1.5",
      "stroke-dasharray": "6 5"
    });
    svg.appendChild(harveyLayer);
    svg.appendChild(zoneLayer);

    // Streets, lots, then the bayou channel on top
    var lots = [];
    var id = 100;
    for (var b = 0; b < 6; b++) {
      svg.appendChild(el("rect", { x: 0, y: 62 + 68 * b, width: 640, height: 14, fill: "#fff", opacity: ".75" }));
      [10 + 68 * b, 36 + 68 * b].forEach(function (y) {
        for (var j = 0; j < 22; j++) {
          if (j % 8 === 7) continue;
          var x = 10 + 28 * j;
          var cx = x + 12, cy = y + 12;
          var d = cy - bayou(cx);
          if (Math.abs(d) < 30) continue;
          var lot = {
            id: id++,
            inZone: Math.abs(d) <= AE,
            flooded: d < 0 ? -d <= reachN(cx) : d <= reachS(cx),
            node: el("rect", { x: x, y: y, width: 24, height: 24, rx: 2, class: "lot" })
          };
          lot.node.addEventListener("click", select.bind(null, lot));
          lots.push(lot);
          svg.appendChild(lot.node);
        }
      });
    }
    for (var j = 7; j < 22; j += 8) {
      svg.appendChild(el("rect", { x: 10 + 28 * j, y: 0, width: 24, height: 400, fill: "#fff", opacity: ".75" }));
    }
    svg.appendChild(el("path", { d: line(bayou), fill: "none", stroke: "#7fb2d9", "stroke-width": "12", "stroke-linecap": "round" }));
    var label = el("text", { x: 24, y: bayou(40) + 4, fill: "#2b5f8f", "font-size": "11", "font-weight": "600", "letter-spacing": "2" });
    label.textContent = "BAYOU";
    svg.appendChild(label);

    var layer = "harvey";
    var selected = null;

    function fillFor(lot) {
      if (layer === "fema") return lot.inZone ? COLORS.zone : COLORS.dry;
      if (!lot.flooded) return COLORS.dry;
      return lot.inZone ? COLORS.flooded : COLORS.outside;
    }

    function legendItem(color, text) {
      return '<li><i style="background:' + color + '"></i>' + text + "</li>";
    }

    function render() {
      var inZone = 0, flooded = 0, outside = 0;
      lots.forEach(function (lot) {
        lot.node.setAttribute("fill", fillFor(lot));
        if (lot.inZone) inZone++;
        if (lot.flooded) flooded++;
        if (lot.flooded && !lot.inZone) outside++;
      });
      zoneLayer.style.opacity = layer === "fema" ? 1 : 0.35;
      harveyLayer.style.opacity = layer === "harvey" ? 1 : 0;

      if (layer === "fema") {
        statEl.innerHTML = "<strong>" + inZone + "</strong> of " + lots.length + " parcels are inside FEMA Zone AE.";
        legendEl.innerHTML = legendItem(COLORS.zone, "Inside Zone AE") + legendItem(COLORS.dry, "Outside Zone AE");
      } else {
        statEl.innerHTML = "<strong>" + flooded + "</strong> parcels flooded in Harvey — <strong class=\"hl\">" + outside + "</strong> of them outside Zone AE.";
        legendEl.innerHTML = legendItem(COLORS.flooded, "Flooded, inside Zone AE") + legendItem(COLORS.outside, "Flooded, outside Zone AE") + legendItem(COLORS.dry, "Not inundated");
      }
    }

    function select(lot) {
      if (selected) selected.node.classList.remove("is-selected");
      selected = lot;
      lot.node.classList.add("is-selected");
      readout.innerHTML =
        '<p class="eyebrow eyebrow-sm">Parcel record</p>' +
        "<h3>Demo parcel " + lot.id + "</h3>" +
        "<dl>" +
        "<div><dt>FEMA zone</dt><dd>" + (lot.inZone ? "AE" : "X (outside SFHA)") + "</dd></div>" +
        "<div><dt>Flood history</dt><dd>" + (lot.flooded ? "Inside Harvey inundation (2017)" : "Outside Harvey inundation") + "</dd></div>" +
        "</dl>";
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        layer = btn.dataset.layer;
        buttons.forEach(function (other) { other.setAttribute("aria-pressed", String(other === btn)); });
        render();
      });
    });

    render();
    var example = lots.filter(function (lot) { return lot.flooded && !lot.inZone; })[0];
    if (example) select(example);
  })();

  // MCP example: replay the conversation one message at a time
  (function () {
    var body = document.getElementById("mcp-body");
    var runBtn = document.getElementById("mcp-run");
    if (!body || reduceMotion || !("IntersectionObserver" in window)) {
      if (runBtn) runBtn.hidden = true;
      return;
    }
    var msgs = body.querySelectorAll(".msg");
    var timers = [];
    msgs.forEach(function (m) { m.classList.add("is-hidden"); });

    function play() {
      timers.forEach(clearTimeout);
      msgs.forEach(function (m) { m.classList.add("is-hidden"); });
      timers = Array.prototype.map.call(msgs, function (m, i) {
        return setTimeout(function () { m.classList.remove("is-hidden"); }, 300 + i * 900);
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        observer.disconnect();
        play();
      }
    }, { threshold: 0.4 });
    observer.observe(body);
    runBtn.addEventListener("click", play);
  })();

  // Early access form
  // NOTE: no backend is wired up yet. Point FORM_ENDPOINT at the client's form
  // handler (e.g. Formspree, HubSpot, or an API route) to start collecting leads.
  var FORM_ENDPOINT = "";

  var form = document.getElementById("access-form");
  var errorEl = document.getElementById("form-error");
  var successEl = document.getElementById("form-success");
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function showError(msg, field) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
    if (field) {
      field.setAttribute("aria-invalid", "true");
      field.focus();
    }
  }

  form.addEventListener("input", function (e) {
    e.target.removeAttribute("aria-invalid");
    errorEl.hidden = true;
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = form.elements.name;
    var email = form.elements.email;

    if (!name.value.trim()) return showError("Please enter your name.", name);
    if (!EMAIL_RE.test(email.value.trim())) return showError("Please enter a valid email address.", email);

    var data = {
      name: name.value.trim(),
      email: email.value.trim(),
      role: form.elements.role.value
    };

    var button = form.querySelector('button[type="submit"]');
    button.disabled = true;

    function done() {
      form.hidden = true;
      successEl.hidden = false;
      successEl.focus();
    }

    if (!FORM_ENDPOINT) return done();

    fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed");
        done();
      })
      .catch(function () {
        button.disabled = false;
        showError("Something went wrong. Please try again or email hello@graftgis.com.");
      });
  });

  // Footer year
  document.getElementById("year").textContent = new Date().getFullYear();
})();
