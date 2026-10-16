/* نافذة إشعار تثبيت التطبيق على الهاتف */
(function () {
  "use strict";
  var KEY = "hay_install_dismissed_v1";
  var deferred = null;

  function dismissedRecently() {
    try { return Date.now() - (+localStorage.getItem(KEY) || 0) < 7 * 864e5; }
    catch (e) { return false; }
  }
  function isInstalled() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true;
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent || "") && !window.MSStream;
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    maybeShow();
  });
  window.addEventListener("appinstalled", function () {
    hide();
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
  });

  function maybeShow() {
    if (isInstalled() || dismissedRecently()) return;
    if (document.getElementById("install-pop")) return;
    var pop = document.createElement("div");
    pop.id = "install-pop";
    pop.innerHTML =
      '<div class="install-card">' +
      '<div class="install-ic">📲</div>' +
      '<div style="flex:1"><strong>ثبّت صيدلية الحي على هاتفك</strong>' +
      "<p>وصول أسرع بضغطة واحدة — ويعمل دون إنترنت بعد أول زيارة.</p></div>" +
      '<button class="btn btn-primary btn-sm" id="install-go">تثبيت الآن</button>' +
      '<button class="mini-btn" id="install-later">لاحقاً</button>' +
      "</div>";
    document.body.appendChild(pop);
    setTimeout(function () { pop.classList.add("show"); }, 600);
    document.getElementById("install-later").onclick = function () {
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
      hide();
    };
    document.getElementById("install-go").onclick = install;
  }

  function install() {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; hide(); });
    } else if (isIOS()) {
      alert("للتثبيت على آيفون:\n1) اضغط زر المشاركة في سفاري\n2) اختر «إضافة إلى الشاشة الرئيسية»");
    } else {
      alert("من قائمة المتصفح ⋮ اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»");
    }
  }

  function hide() {
    var p = document.getElementById("install-pop");
    if (p) p.remove();
  }

  window.addEventListener("load", function () {
    setTimeout(function () { if (!deferred) maybeShow(); }, 2500);
  });
})();
