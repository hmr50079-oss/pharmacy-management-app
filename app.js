/* صيدلية الحي — متابعة المرضى والجرعات (عربي، بسيط، محلي) */
(function () {
  "use strict";

  var DB_KEY = "hay_pharmacy_db_v1";
  var $ = function (s) { return document.querySelector(s); };
  var state = { selectedId: null, search: "", filter: "all" };

  /* ---------- أدوات ---------- */
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function uid(p) { return (p || "ID") + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      var d = new Date(iso + "T12:00:00");
      return d.toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });
    } catch (e) { return iso; }
  }
  function daysSince(iso) {
    if (!iso) return 9999;
    return Math.floor((Date.now() - new Date(iso + "T12:00:00").getTime()) / 864e5);
  }
  function age(dob) {
    if (!dob) return "—";
    var y = Math.floor((Date.now() - new Date(dob).getTime()) / 3.156e10);
    return y + " سنة";
  }

  /* ---------- قاعدة البيانات ---------- */
  function seed() {
    var p1 = uid("P"), p2 = uid("P"), p3 = uid("P"), p4 = uid("P");
    return {
      patients: [
        {
          id: p1, name: "أحمد حسن", phone: "0501234567", dob: "1980-03-12",
          disease: "ضغط + سكري", chronic: true, notes: "يتردد أسبوعياً لقياس الضغط. ملتزم بالأدوية.",
          meds: [
            { id: uid("M"), name: "أملوديبين", dose: "5 ملغ", times: "مرة يومياً صباحاً", start: "2026-06-01", duration: "مستمر", active: true, taken: [todayISO()] },
            { id: uid("M"), name: "ميتفورمين", dose: "850 ملغ", times: "مرتين يومياً مع الأكل", start: "2026-06-01", duration: "مستمر", active: true, taken: [] }
          ],
          visits: [
            { id: uid("V"), date: todayISO(), status: "مستقر", pressure: "130/85", sugar: "140", notes: "الضغط مضبوط، نصح بالمشي اليومي." },
            { id: uid("V"), date: "2026-09-20", status: "تحسّن", pressure: "135/88", sugar: "160", notes: "التزام جيد بالجرعات." }
          ]
        },
        {
          id: p2, name: "سارة العتيبي", phone: "0509876543", dob: "1995-07-25",
          disease: "ربو", chronic: true, notes: "تحمل بخاخ طوارئ دائماً.",
          meds: [
            { id: uid("M"), name: "بخاخ سالبوتامول", dose: "100 مكغ/بخة", times: "بختان عند الحاجة", start: "2026-08-10", duration: "عند الحاجة", active: true, taken: [] }
          ],
          visits: [
            { id: uid("V"), date: "2026-09-28", status: "مستقر", pressure: "", sugar: "", notes: "مراجعة طريقة استخدام البخاخ." }
          ]
        },
        {
          id: p3, name: "محمد القحطاني", phone: "0555112233", dob: "1972-11-02",
          disease: "كوليسترول", chronic: true, notes: "يفضل المتابعة مساءً.",
          meds: [
            { id: uid("M"), name: "أتورفاستاتين", dose: "20 ملغ", times: "مرة مساءً", start: "2026-07-15", duration: "3 أشهر", active: true, taken: [] }
          ],
          visits: [
            { id: uid("V"), date: "2026-08-15", status: "يحتاج مراجعة", pressure: "", sugar: "", notes: "لم يحضر منذ فترة — الاتصال به." }
          ]
        },
        {
          id: p4, name: "فاطمة الزهراء", phone: "0544556677", dob: "2000-01-19",
          disease: "نزلة برد", chronic: false, notes: "حالة مؤقتة.",
          meds: [
            { id: uid("M"), name: "باراسيتامول", dose: "500 ملغ", times: "3 مرات يومياً بعد الأكل", start: "2026-10-02", duration: "5 أيام", active: false, taken: [todayISO()] }
          ],
          visits: [
            { id: uid("V"), date: "2026-10-02", status: "تحسّن", pressure: "", sugar: "", notes: "تماثلت للشفاء تقريباً." }
          ]
        }
      ]
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(DB_KEY);
      if (!raw) { var s = seed(); localStorage.setItem(DB_KEY, JSON.stringify(s)); return s; }
      var db = JSON.parse(raw);
      if (!Array.isArray(db.patients)) db.patients = [];
      return db;
    } catch (e) { return seed(); }
  }
  var db = load();
  function save() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    catch (e) { toast("مساحة التخزين ممتلئة. احذف بيانات قديمة.", "err"); }
  }
  function getP(id) { return db.patients.find(function (p) { return p.id === id; }); }

  /* ---------- تنبيهات ونوافذ ---------- */
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
  function openModal(html, lg) {
    closeModal();
    var back = document.createElement("div");
    back.className = "modal-back"; back.id = "modal-back";
    back.innerHTML = '<div class="modal' + (lg ? " lg" : "") + '">' + html + "</div>";
    back.addEventListener("mousedown", function (e) { if (e.target === back) closeModal(); });
    $("#modal-root").appendChild(back);
    return back.querySelector(".modal");
  }
  function closeModal() { var b = $("#modal-back"); if (b) b.remove(); }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  function confirmDlg(title, msg) {
    return new Promise(function (res) {
      var m = openModal(
        "<h3>" + esc(title) + "</h3><p class='sub'>" + esc(msg) + "</p>" +
        "<div class='modal-foot'><button class='btn btn-ghost' id='cf-no'>تراجع</button>" +
        "<button class='btn btn-danger' id='cf-yes'>تأكيد الحذف</button></div>"
      );
      m.querySelector("#cf-no").onclick = function () { closeModal(); res(false); };
      m.querySelector("#cf-yes").onclick = function () { closeModal(); res(true); };
    });
  }

  /* ---------- إحصائيات ---------- */
  function lastVisit(p) {
    if (!p.visits || !p.visits.length) return null;
    return p.visits.slice().sort(function (a, b) { return b.date.localeCompare(a.date); })[0];
  }
  function needsFollow(p) {
    var lv = lastVisit(p);
    if (!lv) return true;
    return daysSince(lv.date) >= 14;
  }
  function renderStats() {
    var t = todayISO();
    var todayCount = 0, medsCount = 0, needCount = 0;
    db.patients.forEach(function (p) {
      (p.visits || []).forEach(function (v) { if (v.date === t) todayCount++; });
      (p.meds || []).forEach(function (m) { if (m.active) medsCount++; });
      if (needsFollow(p)) needCount++;
    });
    $("#st-total").textContent = db.patients.length;
    $("#st-today").textContent = todayCount;
    $("#st-meds").textContent = medsCount;
    $("#st-need").textContent = needCount;
    try {
      $("#today-label").textContent = new Date().toLocaleDateString("ar", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } catch (e) { $("#today-label").textContent = t; }
  }

  /* ---------- قائمة المرضى ---------- */
  function filteredPatients() {
    var q = state.search.trim();
    var rows = db.patients.filter(function (p) {
      var ok = true;
      if (q) ok = (p.name + " " + p.phone + " " + (p.disease || "")).indexOf(q) !== -1;
      if (ok && state.filter === "need") ok = needsFollow(p);
      if (ok && state.filter === "chronic") ok = !!p.chronic;
      return ok;
    });
    return rows.sort(function (a, b) { return a.name.localeCompare(b.name, "ar"); });
  }

  function renderList() {
    renderStats();
    var rows = filteredPatients();
    $("#patients-count").textContent = rows.length + " مريض";
    var box = $("#patient-list");
    if (!rows.length) {
      box.innerHTML = "<div class='no-data'>لا يوجد مرضى مطابقون.<br>أضف مريضاً جديداً بالزر أعلاه.</div>";
      return;
    }
    box.innerHTML = rows.map(function (p) {
      var lv = lastVisit(p);
      var need = needsFollow(p);
      var activeMeds = (p.meds || []).filter(function (m) { return m.active; }).length;
      return "<button class='p-card" + (state.selectedId === p.id ? " selected" : "") + "' data-id='" + p.id + "'>" +
        "<div class='avatar'>" + esc(p.name.trim().charAt(0)) + "</div>" +
        "<div style='flex:1;min-width:0'><strong>" + esc(p.name) + "</strong>" +
        "<small>" + esc(p.phone) + " · " + esc(p.disease || "—") + "</small>" +
        "<small>💊 " + activeMeds + " أدوية · آخر زيارة: " + (lv ? esc(lv.date) : "لا يوجد") + "</small>" +
        (need ? "<span class='need-dot'>بحاجة لمتابعة</span>" : "") +
        "</div></button>";
    }).join("");
    box.querySelectorAll(".p-card").forEach(function (b) {
      b.onclick = function () { selectPatient(b.dataset.id); };
    });
  }

  function selectPatient(id) {
    state.selectedId = id;
    renderList();
    renderDetail();
  }

  /* ---------- تفاصيل المريض ---------- */
  function statusTag(s) {
    if (s === "تحسّن") return "<span class='tag good'>تحسّن ✓</span>";
    if (s === "مستقر") return "<span class='tag mid'>مستقر ●</span>";
    return "<span class='tag bad'>يحتاج مراجعة ⚠</span>";
  }

  function renderDetail() {
    var p = getP(state.selectedId);
    if (!p) return;
    $("#empty-state").hidden = true;
    var det = $("#patient-detail");
    det.hidden = false;
    var lv = lastVisit(p);
    var meds = p.meds || [];
    var visits = (p.visits || []).slice().sort(function (a, b) { return b.date.localeCompare(a.date); });

    var medsHtml = meds.length ? meds.map(function (m) {
      var tookToday = (m.taken || []).indexOf(todayISO()) !== -1;
      var total = (m.taken || []).length;
      var pct = Math.min(100, total * 10);
      return "<div class='med'>" +
        "<div class='med-top'><strong>💊 " + esc(m.name) + "</strong>" +
        "<span class='dose-pill'>" + esc(m.dose) + "</span>" +
        "<span class='status-pill " + (m.active ? "on" : "off") + "'>" + (m.active ? "نشط" : "متوقف") + "</span></div>" +
        "<small>" + esc(m.times) + " · من " + esc(m.start || "—") + " · المدة: " + esc(m.duration || "—") + " · جرعات مسجلة: " + total + "</small>" +
        "<div class='progress'><i style='width:" + pct + "%'></i></div>" +
        "<div class='med-actions'>" +
        (m.active && !tookToday ? "<button class='btn btn-primary btn-sm' data-take='" + m.id + "'>✓ تسجيل جرعة اليوم</button>" : "") +
        (m.active && tookToday ? "<span class='tag good'>تم تسجيل جرعة اليوم ✓</span>" : "") +
        "<button class='btn btn-ghost btn-sm' data-editmed='" + m.id + "'>تعديل</button>" +
        (m.active
          ? "<button class='btn btn-soft btn-sm' data-stopmed='" + m.id + "'>إيقاف</button>"
          : "<button class='btn btn-soft btn-sm' data-startmed='" + m.id + "'>استئناف</button>") +
        "<button class='btn btn-danger btn-sm' data-delmed='" + m.id + "'>حذف</button>" +
        "</div></div>";
    }).join("") : "<div class='no-data'>لا توجد أدوية مسجلة لهذا المريض.<br>أضف أول دواء وجرعته.</div>";

    var visitsHtml = visits.length ? visits.map(function (v) {
      var cls = v.status === "تحسّن" ? "" : (v.status === "مستقر" ? "mid" : "bad");
      return "<div class='visit " + cls + "'>" +
        "<div class='visit-top'><span class='visit-date'>" + esc(v.date) + "</span>" +
        statusTag(v.status) +
        "<strong style='margin-inline-start:auto'>" + fmtDate(v.date) + "</strong></div>" +
        ((v.pressure || v.sugar) ? "<small>ضغط: " + esc(v.pressure || "—") + " · سكر: " + esc(v.sugar || "—") + "</small>" : "") +
        (v.notes ? "<p>" + esc(v.notes) + "</p>" : "") +
        "<div class='med-actions'><button class='btn btn-ghost btn-sm' data-delvisit='" + v.id + "'>حذف الزيارة</button></div>" +
        "</div>";
    }).join("") : "<div class='no-data'>لا توجد زيارات مسجلة بعد.</div>";

    det.innerHTML =
      "<div class='p-head'><div class='avatar'>" + esc(p.name.trim().charAt(0)) + "</div>" +
      "<div><h2>" + esc(p.name) + "</h2>" +
      "<div class='sub'>" + esc(p.phone) + " · العمر: " + esc(age(p.dob)) + " · " + (p.chronic ? "مرض مزمن" : "حالة مؤقتة") + "</div></div>" +
      "<div class='actions'><button class='btn btn-ghost btn-sm' id='btn-edit-p'>تعديل البيانات</button>" +
      "<button class='btn btn-danger btn-sm' id='btn-del-p'>حذف الملف</button></div></div>" +
      "<div class='info-grid'>" +
      "<div class='info'><small>الحالة / المرض</small><strong>" + esc(p.disease || "—") + "</strong></div>" +
      "<div class='info'><small>تاريخ الميلاد</small><strong>" + esc(p.dob || "—") + "</strong></div>" +
      "<div class='info'><small>آخر زيارة</small><strong>" + (lv ? esc(lv.date) : "لا يوجد") + "</strong></div>" +
      "<div class='info'><small>أدوية نشطة</small><strong>" + meds.filter(function (m) { return m.active; }).length + "</strong></div>" +
      "</div>" +
      (p.notes ? "<div class='info' style='margin-bottom:4px'><small>ملاحظات الصيدلي</small><strong>" + esc(p.notes) + "</strong></div>" : "") +
      "<div class='section'><div class='section-head'><h3>💊 الأدوية والجرعات (" + meds.length + ")</h3>" +
      "<button class='btn btn-primary btn-sm' id='btn-add-med'>+ إضافة دواء</button></div>" + medsHtml + "</div>" +
      "<div class='section'><div class='section-head'><h3>📋 سجل الزيارات والمتابعة (" + visits.length + ")</h3>" +
      "<button class='btn btn-primary btn-sm' id='btn-add-visit'>+ تسجيل زيارة</button></div>" + visitsHtml + "</div>";

    // ربط الأزرار
    $("#btn-edit-p").onclick = function () { patientModal(p); };
    $("#btn-del-p").onclick = function () { deletePatient(p.id); };
    $("#btn-add-med").onclick = function () { medModal(p, null); };
    $("#btn-add-visit").onclick = function () { visitModal(p); };

    det.querySelectorAll("[data-take]").forEach(function (b) {
      b.onclick = function () {
        var m = meds.find(function (x) { return x.id === b.dataset.take; });
        if (m) { m.taken = m.taken || []; m.taken.push(todayISO()); save(); renderList(); renderDetail(); toast("تم تسجيل جرعة اليوم لـ " + m.name); }
      };
    });
    det.querySelectorAll("[data-editmed]").forEach(function (b) {
      b.onclick = function () {
        var m = meds.find(function (x) { return x.id === b.dataset.editmed; });
        if (m) medModal(p, m);
      };
    });
    det.querySelectorAll("[data-stopmed]").forEach(function (b) {
      b.onclick = function () {
        var m = meds.find(function (x) { return x.id === b.dataset.stopmed; });
        if (m) { m.active = false; save(); renderList(); renderDetail(); toast("تم إيقاف " + m.name); }
      };
    });
    det.querySelectorAll("[data-startmed]").forEach(function (b) {
      b.onclick = function () {
        var m = meds.find(function (x) { return x.id === b.dataset.startmed; });
        if (m) { m.active = true; save(); renderList(); renderDetail(); toast("تم استئناف " + m.name); }
      };
    });
    det.querySelectorAll("[data-delmed]").forEach(function (b) {
      b.onclick = async function () {
        if (!await confirmDlg("حذف الدواء؟", "سيتم حذف الدواء وسجل جرعاته نهائياً.")) return;
        p.meds = (p.meds || []).filter(function (x) { return x.id !== b.dataset.delmed; });
        save(); renderList(); renderDetail(); toast("تم حذف الدواء.");
      };
    });
    det.querySelectorAll("[data-delvisit]").forEach(function (b) {
      b.onclick = async function () {
        if (!await confirmDlg("حذف الزيارة؟", "سيتم حذف هذا السجل نهائياً.")) return;
        p.visits = (p.visits || []).filter(function (x) { return x.id !== b.dataset.delvisit; });
        save(); renderList(); renderDetail(); toast("تم حذف الزيارة.");
      };
    });
  }

  /* ---------- نماذج الإدخال ---------- */
  function patientModal(p) {
    var isEdit = !!p;
    p = p || {};
    var m = openModal(
      "<h3>" + (isEdit ? "تعديل بيانات المريض" : "مريض جديد") + "</h3>" +
      "<p class='sub'>الحقول بعلامة * مطلوبة.</p>" +
      "<div class='grid2'>" +
      "<label>الاسم الكامل *<input id='f-name' value='" + esc(p.name || "") + "' placeholder='مثال: علي محمد'></label>" +
      "<label>رقم الهاتف *<input id='f-phone' value='" + esc(p.phone || "") + "' placeholder='05xxxxxxxx'></label>" +
      "<label>تاريخ الميلاد<input id='f-dob' type='date' value='" + esc(p.dob || "") + "'></label>" +
      "<label>الحالة / المرض *<input id='f-disease' value='" + esc(p.disease || "") + "' placeholder='مثال: ضغط، سكري، ربو'></label>" +
      "</div>" +
      "<label>نوع الحالة<select id='f-chronic'>" +
      "<option value='1'" + (p.chronic ? " selected" : "") + ">مرض مزمن (متابعة مستمرة)</option>" +
      "<option value='0'" + (!p.chronic && isEdit ? " selected" : "") + ">حالة مؤقتة</option>" +
      "</select></label>" +
      "<label>ملاحظات الصيدلي<textarea id='f-notes' placeholder='حساسية، تنبيهات، مواعيد…'>" + esc(p.notes || "") + "</textarea></label>" +
      "<div class='field-err' id='f-err'></div>" +
      "<div class='modal-foot'><button class='btn btn-primary' id='m-save'>" + (isEdit ? "حفظ التعديلات" : "إضافة المريض") + "</button>" +
      "<button class='btn btn-ghost' id='m-cancel'>إلغاء</button></div>"
    );
    m.querySelector("#m-cancel").onclick = closeModal;
    m.querySelector("#m-save").onclick = function () {
      var name = m.querySelector("#f-name").value.trim();
      var phone = m.querySelector("#f-phone").value.trim();
      var disease = m.querySelector("#f-disease").value.trim();
      var err = "";
      if (name.length < 3) err = "فضلاً أدخل الاسم الكامل (3 أحرف على الأقل).";
      else if (!phone || phone.replace(/\D/g, "").length < 9) err = "فضلاً أدخل رقم هاتف صحيح.";
      else if (!disease) err = "فضلاً أدخل الحالة أو المرض.";
      else if (!isEdit && db.patients.some(function (x) { return x.phone === phone; })) err = "هذا الهاتف مسجل لمريض آخر.";
      else if (isEdit && db.patients.some(function (x) { return x.phone === phone && x.id !== p.id; })) err = "هذا الهاتف مسجل لمريض آخر.";
      if (err) { m.querySelector("#f-err").textContent = err; return; }
      if (isEdit) {
        p.name = name; p.phone = phone; p.dob = m.querySelector("#f-dob").value;
        p.disease = disease; p.chronic = m.querySelector("#f-chronic").value === "1";
        p.notes = m.querySelector("#f-notes").value.trim();
        toast("تم حفظ التعديلات ✓");
      } else {
        var np = {
          id: uid("P"), name: name, phone: phone, dob: m.querySelector("#f-dob").value,
          disease: disease, chronic: m.querySelector("#f-chronic").value === "1",
          notes: m.querySelector("#f-notes").value.trim(), meds: [], visits: []
        };
        db.patients.push(np);
        state.selectedId = np.id;
        toast("تمت إضافة " + name + " ✓");
      }
      save(); closeModal(); renderList(); renderDetail();
    };
  }

  function medModal(p, med) {
    var isEdit = !!med;
    med = med || {};
    var m = openModal(
      "<h3>" + (isEdit ? "تعديل الدواء" : "إضافة دواء جديد") + " — " + esc(p.name) + "</h3>" +
      "<p class='sub'>حدد اسم الدواء والجرعة ومواعيدها بدقة.</p>" +
      "<div class='grid2'>" +
      "<label>اسم الدواء *<input id='g-name' value='" + esc(med.name || "") + "' placeholder='مثال: أملوديبين'></label>" +
      "<label>الجرعة *<input id='g-dose' value='" + esc(med.dose || "") + "' placeholder='مثال: 5 ملغ'></label>" +
      "<label>المواعيد *<input id='g-times' value='" + esc(med.times || "") + "' placeholder='مثال: مرتين يومياً صباحاً ومساءً'></label>" +
      "<label>تاريخ البدء<input id='g-start' type='date' value='" + esc(med.start || todayISO()) + "'></label>" +
      "</div>" +
      "<label>المدة<input id='g-dur' value='" + esc(med.duration || "") + "' placeholder='مثال: شهر، مستمر، 10 أيام'></label>" +
      "<div class='field-err' id='g-err'></div>" +
      "<div class='modal-foot'><button class='btn btn-primary' id='g-save'>" + (isEdit ? "حفظ" : "إضافة الدواء") + "</button>" +
      "<button class='btn btn-ghost' id='g-cancel'>إلغاء</button></div>"
    );
    m.querySelector("#g-cancel").onclick = closeModal;
    m.querySelector("#g-save").onclick = function () {
      var name = m.querySelector("#g-name").value.trim();
      var dose = m.querySelector("#g-dose").value.trim();
      var times = m.querySelector("#g-times").value.trim();
      if (!name || !dose || !times) { m.querySelector("#g-err").textContent = "فضلاً أكمل: اسم الدواء والجرعة والمواعيد."; return; }
      if (isEdit) {
        med.name = name; med.dose = dose; med.times = times;
        med.start = m.querySelector("#g-start").value;
        med.duration = m.querySelector("#g-dur").value.trim();
        toast("تم حفظ الدواء ✓");
      } else {
        p.meds = p.meds || [];
        p.meds.push({
          id: uid("M"), name: name, dose: dose, times: times,
          start: m.querySelector("#g-start").value || todayISO(),
          duration: m.querySelector("#g-dur").value.trim() || "مستمر",
          active: true, taken: []
        });
        toast("تمت إضافة " + name + " ✓");
      }
      save(); closeModal(); renderList(); renderDetail();
    };
  }

  function visitModal(p) {
    var m = openModal(
      "<h3>تسجيل زيارة جديدة — " + esc(p.name) + "</h3>" +
      "<p class='sub'>سجّل حالة المريض اليوم وملاحظاتك كصيدلي.</p>" +
      "<div class='grid2'>" +
      "<label>تاريخ الزيارة<input id='v-date' type='date' value='" + todayISO() + "'></label>" +
      "<label>الحالة العامة<select id='v-status'><option>تحسّن</option><option selected>مستقر</option><option>يحتاج مراجعة</option></select></label>" +
      "<label>الضغط (اختياري)<input id='v-pre' placeholder='مثال: 120/80'></label>" +
      "<label>السكر (اختياري)<input id='v-sug' placeholder='مثال: 130'></label>" +
      "</div>" +
      "<label>ملاحظات المتابعة<textarea id='v-notes' placeholder='التزام بالجرعات؟ أعراض جديدة؟ توصيات…'></textarea></label>" +
      "<div class='modal-foot'><button class='btn btn-primary' id='v-save'>حفظ الزيارة</button>" +
      "<button class='btn btn-ghost' id='v-cancel'>إلغاء</button></div>"
    );
    m.querySelector("#v-cancel").onclick = closeModal;
    m.querySelector("#v-save").onclick = function () {
      p.visits = p.visits || [];
      p.visits.push({
        id: uid("V"),
        date: m.querySelector("#v-date").value || todayISO(),
        status: m.querySelector("#v-status").value,
        pressure: m.querySelector("#v-pre").value.trim(),
        sugar: m.querySelector("#v-sug").value.trim(),
        notes: m.querySelector("#v-notes").value.trim()
      });
      save(); closeModal(); renderList(); renderDetail();
      toast("تم تسجيل الزيارة ✓");
    };
  }

  async function deletePatient(id) {
    var p = getP(id);
    if (!p) return;
    if (!await confirmDlg("حذف ملف " + p.name + "؟", "سيتم حذف الأدوية وسجل الزيارات نهائياً ولا يمكن التراجع.")) return;
    db.patients = db.patients.filter(function (x) { return x.id !== id; });
    state.selectedId = null;
    $("#empty-state").hidden = false;
    $("#patient-detail").hidden = true;
    $("#patient-detail").innerHTML = "";
    save(); renderList(); toast("تم حذف الملف.");
  }

  /* ---------- النسخة الاحتياطية ---------- */
  function exportBackup() {
    var blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pharmacy-backup-" + todayISO() + ".json";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    toast("تم تنزيل النسخة الاحتياطية ✓");
  }

  /* ---------- الأحداث ---------- */
  $("#btn-add-patient").onclick = function () { patientModal(null); };
  $("#btn-add-first").onclick = function () { patientModal(null); };
  $("#btn-export").onclick = exportBackup;
  $("#search").addEventListener("input", function (e) { state.search = e.target.value; renderList(); });
  document.querySelectorAll(".chip").forEach(function (c) {
    c.onclick = function () {
      document.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("active"); });
      c.classList.add("active");
      state.filter = c.dataset.filter;
      renderList();
    };
  });

  /* ---------- تشغيل ---------- */
  renderList();
})();
