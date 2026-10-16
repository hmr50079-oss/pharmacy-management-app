/* صفحة خدماتنا — طلبات + تذكير الجرعات + تقييم التطبيق (تخزين محلي) */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var DB_KEY = "hay_pharmacy_db_v1";
  var FB_KEY = "hay_feedback_v1";
  var REQ_KEY = "hay_requests_v1";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function loadJSON(k, fb) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; }
    catch (e) { return fb; }
  }
  function saveJSON(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  function toast(msg, type) {
    var r = $("#toast-root");
    var d = document.createElement("div");
    d.className = "toast " + (type || "");
    d.textContent = msg;
    r.appendChild(d);
    setTimeout(function () {
      d.style.opacity = "0"; d.style.transition = "opacity .3s";
      setTimeout(function () { d.remove(); }, 320);
    }, 3200);
  }

  /* التاريخ */
  try {
    $("#today-label").textContent = new Date().toLocaleDateString("ar", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  } catch (e) { $("#today-label").textContent = todayISO(); }

  /* تذكير الجرعات من قاعدة بيانات الصفحة الرئيسية */
  (function reminders() {
    var db = loadJSON(DB_KEY, { patients: [] });
    var active = 0, done = 0, t = todayISO();
    (db.patients || []).forEach(function (p) {
      (p.meds || []).forEach(function (m) {
        if (m.active) { active++; if ((m.taken || []).indexOf(t) !== -1) done++; }
      });
    });
    $("#remind-text").textContent = active
      ? ("لديك " + active + " أدوية نشطة اليوم، تم تسجيل " + done + " منها.")
      : "لا توجد أدوية نشطة اليوم. أضف أدوية مرضاك من الصفحة الرئيسية.";
  })();

  /* نماذج الطلبات */
  function bindRequest(formId, type, okMsg) {
    var f = document.getElementById(formId);
    if (!f) return;
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = { type: type, at: new Date().toISOString() };
      Array.prototype.forEach.call(f.elements, function (el) {
        if (el.name) data[el.name] = (el.value || "").trim();
      });
      var reqs = loadJSON(REQ_KEY, []);
      reqs.push(data);
      try { saveJSON(REQ_KEY, reqs); } catch (err) { return toast("تعذّر الحفظ: مساحة المتصفح ممتلئة.", "err"); }
      f.reset();
      var det = f.closest("details");
      if (det) det.open = false;
      toast(okMsg + " ✓");
    });
  }
  bindRequest("form-refill", "refill", "تم استلام طلب إعادة الصرف");
  bindRequest("form-appoint", "appointment", "تم حجز موعدك بنجاح");
  bindRequest("form-consult", "consult", "تم إرسال استشارتك");

  /* التقييم بالنجوم */
  var rating = 0;
  var starBtns = Array.prototype.slice.call(document.querySelectorAll("#stars button"));
  function paintStars() {
    starBtns.forEach(function (b) {
      b.classList.toggle("lit", +b.dataset.v <= rating);
    });
    $("#rating-label").textContent = rating ? (rating + " من 5") : "اختر عدد النجوم";
  }
  starBtns.forEach(function (b) {
    b.addEventListener("click", function () { rating = +b.dataset.v; paintStars(); });
  });

  function renderFeedback() {
    var list = loadJSON(FB_KEY, []);
    var box = $("#fb-list"), sum = $("#fb-summary");
    if (!list.length) {
      sum.innerHTML = "<span class='muted'>لا توجد تقييمات بعد — كن أول من يقيّم.</span>";
      box.innerHTML = "";
      return;
    }
    var avg = list.reduce(function (a, f) { return a + (+f.rating || 0); }, 0) / list.length;
    sum.innerHTML = "متوسط التقييم: <strong>" + avg.toFixed(1) + " ★</strong> من " + list.length + " تقييم";
    box.innerHTML = list.slice().reverse().map(function (f, ri) {
      var i = list.length - 1 - ri;
      return "<div class='fb-item'><div class='fb-top'><strong>" + esc(f.name || "زائر") + "</strong>" +
        "<span class='tag good'>" + "★".repeat(+f.rating || 0) + "</span>" +
        "<button class='mini-btn danger' data-delfb='" + i + "'>حذف</button></div>" +
        "<p>" + esc(f.text) + "</p></div>";
    }).join("");
    box.querySelectorAll("[data-delfb]").forEach(function (b) {
      b.onclick = function () {
        if (!window.confirm("حذف هذا التقييم؟")) return;
        var l = loadJSON(FB_KEY, []);
        l.splice(+b.dataset.delfb, 1);
        saveJSON(FB_KEY, l);
        renderFeedback();
        toast("تم حذف التقييم.");
      };
    });
  }

  $("#form-feedback").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    var text = (f.elements.text.value || "").trim();
    if (!rating) return toast("فضلاً اختر عدد النجوم أولاً.", "warn");
    if (text.length < 3) return toast("فضلاً اكتب مقترحك (3 أحرف على الأقل).", "warn");
    var list = loadJSON(FB_KEY, []);
    list.push({ name: (f.elements.name.value || "").trim(), rating: rating, text: text, at: new Date().toISOString() });
    try { saveJSON(FB_KEY, list); } catch (err) { return toast("تعذّر الحفظ: مساحة المتصفح ممتلئة.", "err"); }
    f.reset(); rating = 0; paintStars(); renderFeedback();
    toast("شكراً لك! تم إرسال تقييمك ✓");
  });

  paintStars();
  renderFeedback();
})();
