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

  // "Request access" buttons jump to the form and focus the first field
  var nameField = document.getElementById("name");
  document.querySelectorAll(".js-request").forEach(function (link) {
    link.addEventListener("click", function () {
      setTimeout(function () { nameField.focus({ preventScroll: true }); }, 450);
    });
  });

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
