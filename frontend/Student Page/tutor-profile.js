(function () {
  const DEFAULT_AVATAR_SRC = "/assets/default-avatar.svg";
  const $ = (sel) => document.querySelector(sel);
  const elements = {
    status: $("#statusBadge"),
    avatar: $("#profileAvatar"),
    name: $("#profileName"),
    headline: $("#profileHeadline"),
    university: $("#profileUniversity"),
    rate: $("#profileRate"),
    format: $("#profileFormat"),
    rating: $("#profileRating"),
    gpa: $("#profileGpa"),
    experience: $("#profileExperience"),
    availabilitySummary: $("#profileAvailabilitySummary"),
    availabilityGrid: $("#availabilityGrid"),
    availabilityEmpty: $("#availabilityEmpty"),
    bio: $("#profileBio"),
    academic: $("#profileAcademic"),
    formatDetails: $("#profileFormatDetails"),
    languages: $("#profileLanguages"),
    subjectsWrap: $("#profileSubjects"),
    subjectsCount: $("#subjectsCount"),
    degree: $("#profileDegree"),
    certificates: $("#profileCertificates"),
    // Use the actual clickable links in the Contact section
    email: $("#emailLink"),
    phone: $("#phoneLink"),
    feedbackList: document.querySelector("#feedbackList"),
    feedbackEmpty: document.querySelector("#feedbackEmpty"),
    feedbackSummary: document.querySelector("#feedbackSummary"),
    feedbackAverage: document.querySelector("#feedbackAverage"),
    feedbackCount: document.querySelector("#feedbackCount"),
    feedbackLoadMore: document.querySelector("#feedbackLoadMore"),
  };

  const params = new URLSearchParams(window.location.search);
  const tutorId = params.get("id");

  const isNumericString = (value) => {
    if (value === null || value === undefined) return false;
    const str = String(value).trim();
    return str !== "" && /^[0-9]+(\.[0-9]+)?$/.test(str);
  };

  function toArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch (_) {
        return value
          .split(/[,|\n]/)
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }
    return [];
  }

  function setText(node, value, fallback = "—") {
    if (node) node.textContent = value && String(value).trim() ? value : fallback;
  }

  function renderSubjects(list) {
    if (!elements.subjectsWrap) return;
    elements.subjectsWrap.innerHTML = "";

    // Filter out numeric-only entries (these likely came from a previous hourly-rate bug)
    const cleanList = list.filter((subject) => !isNumericString(subject));

    if (!cleanList.length) {
      elements.subjectsWrap.innerHTML = '<span class="text-white/60 text-sm">Subject list will appear here.</span>';
      setText(elements.subjectsCount, "0 subjects");
      return;
    }
    cleanList.forEach((subject) => {
      const span = document.createElement("span");
      span.className = "info-chip";
      span.innerHTML = `<i data-lucide="zap" class="w-4 h-4"></i>${subject}`;
      elements.subjectsWrap.appendChild(span);
    });
    setText(
      elements.subjectsCount,
      `${cleanList.length} subject${cleanList.length === 1 ? "" : "s"}`
    );
  }

  function renderCertificates(tutor) {
    if (!elements.certificates) return;
    const certs = [];

    // Main certificate URL (most signups store it in tutors.certificate)
    if (tutor.certificate) {
      const list = toArray(tutor.certificate);
      list.forEach((url, idx) => {
        certs.push({
          label: idx === 0 ? "Certificate" : `Certificate ${idx + 1}`,
          url,
        });
      });
    }

    // Some records may use certificateUrl/certificateURL instead
    if (tutor.certificateUrl || tutor.certificateURL) {
      const url = tutor.certificateUrl || tutor.certificateURL;
      certs.push({ label: certs.length ? `Certificate ${certs.length + 1}` : "Certificate", url });
    }

    // Any additional certificate URLs
    if (tutor.additionalCertificates) {
      toArray(tutor.additionalCertificates).forEach((url, idx) => {
        certs.push({ label: `Certificate ${certs.length + 1}`, url });
      });
    }

    if (!certs.length) {
      elements.certificates.innerHTML = "<p>No certificates uploaded yet.</p>";
      return;
    }
    elements.certificates.innerHTML = certs
      .map(
        (cert) => `
          <a href="${cert.url}" target="_blank" rel="noopener" class="flex items-center gap-2 text-blue-300 hover:text-blue-200 underline">
            <i data-lucide="external-link" class="w-4 h-4"></i>${cert.label}
          </a>`
      )
      .join("");
  }

  function parseAvailabilitySchedule(raw) {
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  function formatTimeLabel(value) {
    if (!value || typeof value !== "string") return "";
    const [h, m] = value.split(":").map((n) => Number(n));
    if (!Number.isFinite(h)) return value;
    const minutes = Number.isFinite(m) ? m : 0;
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = ((h + 11) % 12) + 1;
    const hh = hour12.toString().padStart(2, "0");
    const mm = minutes.toString().padStart(2, "0");
    return `${hh}:${mm} ${suffix}`;
  }

  function buildAvailabilitySummary(schedule) {
    if (!schedule || typeof schedule !== "object") return "";
    const order = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
    const enabled = order.filter((key) => schedule[key]?.enabled);
    if (!enabled.length) return "";

    const labelForDay = (d) => d.charAt(0).toUpperCase() + d.slice(1);
    const firstCfg = schedule[enabled[0]];

    const sameHours =
      firstCfg &&
      enabled.every((key) => {
        const cfg = schedule[key];
        return cfg && cfg.from === firstCfg.from && cfg.to === firstCfg.to;
      });

    const daysLabel =
      enabled.length === 7
        ? "Every day"
        : enabled.map(labelForDay).join(", ");

    if (sameHours && firstCfg.from && firstCfg.to) {
      return `${daysLabel} • ${formatTimeLabel(firstCfg.from)}–${formatTimeLabel(firstCfg.to)}`;
    }

    return daysLabel;
  }

  function renderAvailabilityGrid(schedule) {
    const grid = elements.availabilityGrid;
    const emptyMsg = elements.availabilityEmpty;
    if (!grid) return;

    const slots = grid.querySelectorAll(".availability-day-slot");
    let anyEnabled = false;

    slots.forEach((slot) => {
      const dayLabel = slot.querySelector(".day-label");
      if (!dayLabel) return;

      const key = dayLabel.textContent.trim().toLowerCase();
      const cfg = (schedule && schedule[key]) || {};

      const timeInputs = slot.querySelectorAll('input[type="time"]');
      const toggle = slot.querySelector('input[type="checkbox"]');

      if (timeInputs[0]) timeInputs[0].value = cfg.from || "";
      if (timeInputs[1]) timeInputs[1].value = cfg.to || "";
      if (toggle) {
        toggle.checked = !!cfg.enabled;
        toggle.disabled = true;
      }

      const isEnabled = !!cfg.enabled && !!cfg.from && !!cfg.to;

      // For student view: hide days that are turned off
      slot.style.display = isEnabled ? "" : "none";
      slot.classList.toggle("disabled", !isEnabled);
      if (isEnabled) anyEnabled = true;
    });

    if (emptyMsg) {
      emptyMsg.style.display = anyEnabled ? "none" : "";
    }
  }

  async function loadTutor() {
    if (!tutorId) {
      alert("Missing tutor id. Please return to Find Tutors and try again.");
      window.location.href = "./findtutor.html";
      return;
    }
    try {
      elements.status.textContent = "Loading profile…";
      const res = await fetch(`/api/tutors/${encodeURIComponent(tutorId)}`);
      if (!res.ok) throw new Error("Tutor not found");
      const payload = await res.json();
      const tutor = payload?.tutor;
      if (!tutor) throw new Error("Invalid payload");
      populatePage(tutor);
      loadTutorFeedback(tutor.id || tutorId);
    } catch (err) {
      console.error(err);
      alert("Unable to load tutor profile right now.");
      window.location.href = "./findtutor.html";
    }
  }

  function populatePage(tutor) {
    const fullName = [tutor.firstName, tutor.lastName].filter(Boolean).join(" ").trim() || "Tutor Profile";
    document.title = `${fullName} • Tutor Match`;
    setText(elements.name, fullName);
    setText(elements.headline, [tutor.degree, tutor.major].filter(Boolean).join(" • "));
    setText(elements.university, tutor.university || "Tutor Match");
    if (elements.avatar) {
      const photoUrl =
        tutor.profilePhotoUrl ||
        tutor.avatarUrl ||
        tutor.profilePhoto ||
        tutor.passportPhoto ||
        "";
      const resolvedSrc = photoUrl || DEFAULT_AVATAR_SRC;

      elements.avatar.style.display = "";
      elements.avatar.onload = () => {
        elements.avatar.style.display = "";
      };
      elements.avatar.onerror = () => {
        elements.avatar.onerror = null;
        elements.avatar.src = DEFAULT_AVATAR_SRC;
      };
      elements.avatar.src = resolvedSrc;
      elements.avatar.alt = `${fullName} avatar`;
    }
    let rate = Number(tutor.rate || tutor.hourlyRate);

    // If rate is missing or zero, try to recover it from a numeric-only "subject"
    if (!Number.isFinite(rate) || rate <= 0) {
      const rawSubjects = toArray(tutor.subjects);
      const numericSubject = rawSubjects.find((s) => isNumericString(s));
      if (numericSubject) {
        rate = Number(numericSubject);
      }
    }

    setText(
      elements.rate,
      Number.isFinite(rate) && rate > 0 ? `$${rate}/hr` : "$40/hr"
    );
    setText(elements.format, tutor.format || "Online & In-person");
    const rating = Number(tutor.rating || tutor.averageRating);
    setText(
      elements.rating,
      Number.isFinite(rating)
        ? `${rating.toFixed(1)}${tutor.reviews ? ` • ${tutor.reviews} reviews` : ""}`
        : "Awaiting reviews"
    );
    setText(elements.gpa, tutor.gpa);
    setText(elements.experience, tutor.experience);
    const schedule = parseAvailabilitySchedule(tutor.availabilitySchedule);
    if (schedule) {
      renderAvailabilityGrid(schedule);
      const summary = buildAvailabilitySummary(schedule) || tutor.availability || "Flexible";
      setText(elements.availabilitySummary, summary);
    } else {
      renderAvailabilityGrid(null);
      setText(elements.availabilitySummary, tutor.availability || "Flexible");
    }
    setText(elements.bio, tutor.motivation || tutor.bio, elements.bio?.textContent);
    setText(elements.academic, tutor.major || tutor.experience);
    setText(elements.formatDetails, tutor.format || "Online & In-person");
    setText(elements.languages, tutor.languages || "English");
    setText(elements.degree, [tutor.degree, tutor.major].filter(Boolean).join(" • "));
    // ----- EMAIL LINK -----
if (tutor.email) {
  elements.email.textContent = tutor.email;
  elements.email.href = `mailto:${tutor.email}`;
} else {
  elements.email.textContent = "Not shared";
  elements.email.removeAttribute("href");
}

// ----- PHONE → WHATSAPP LINK -----
if (tutor.phone) {
  elements.phone.textContent = tutor.phone;

  // Clean phone number for WhatsApp URL:
  const cleanPhone = tutor.phone.replace(/\D/g, ""); // removes +, spaces, etc.
  elements.phone.href = `https://wa.me/${cleanPhone}`;
  elements.phone.target = "_blank";
} else {
  elements.phone.textContent = "Not shared";
  elements.phone.removeAttribute("href");
}

    if (elements.status) {
      elements.status.textContent = tutor.approved ? "Approved tutor" : "Pending approval";
      elements.status.classList.toggle("bg-emerald-500/20", Boolean(tutor.approved));
    }
    renderSubjects(toArray(tutor.subjects));
    renderCertificates(tutor);

    if (typeof lucide !== "undefined" && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  function wireActions() {
    $("#backButton")?.addEventListener("click", () => (window.location.href = "./findtutor.html"));
    $("#messageButton")?.addEventListener("click", () =>
      alert("Please reach out using the contact details below to arrange your booking.")
    );
    $("#shareButton")?.addEventListener("click", async () => {
      const shareData = { title: document.title, url: window.location.href };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (_) {
          // ignore cancellation
        }
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        alert("Profile link copied!");
      }
    });
  }

  // ----- STUDENT FEEDBACK PREVIEW -----
  let allTutorRatings = [];
  let feedbackShownCount = 0;

  function renderFeedbackSlice() {
    const list = elements.feedbackList;
    if (!list) return;

    list.innerHTML = "";

    if (!allTutorRatings.length) {
      const p = document.createElement("p");
      p.className = "text-white/60";
      p.textContent =
        "This tutor hasn't received any feedback yet. Be the first to leave a review after your session.";
      list.appendChild(p);
      elements.feedbackLoadMore?.classList.add("hidden");
      return;
    }

    const toShow = allTutorRatings.slice(0, feedbackShownCount);

    toShow.forEach((r) => {
      const wrapper = document.createElement("div");
      wrapper.className =
        "bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 items-start";

      const initials =
        (r.studentName || "")
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase() || "?";

      const dateLabel = r.createdAt
        ? new Date(r.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "";

      const starsHtml = Array(5)
        .fill(0)
        .map(
          (_, i) =>
            `<i data-lucide="star" class="w-4 h-4 ${
              i < (r.rating || 0)
                ? "fill-current text-yellow-400"
                : "text-slate-400"
            }"></i>`
        )
        .join("");

      wrapper.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-sm font-semibold">
          ${initials}
        </div>
        <div class="flex-1 space-y-1">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="font-semibold text-white">${
                r.studentName || "Anonymous student"
              }</p>
              <p class="text-xs text-white/60">${r.subject || "General"}${
        dateLabel ? " • " + dateLabel : ""
      }</p>
            </div>
            <div class="flex items-center gap-1 text-yellow-400">
              ${starsHtml}
            </div>
          </div>
          <p class="text-sm text-white/80">${
            r.feedback || "No written comment."
          }</p>
        </div>
      `;

      list.appendChild(wrapper);
    });

    if (elements.feedbackLoadMore) {
      if (feedbackShownCount < allTutorRatings.length) {
        elements.feedbackLoadMore.textContent = "View more feedback";
        elements.feedbackLoadMore.classList.remove("hidden");
      } else {
        elements.feedbackLoadMore.classList.add("hidden");
      }
    }

    if (typeof lucide !== "undefined" && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  async function loadTutorFeedback(id) {
    if (!id || !elements.feedbackList) return;
    try {
      const res = await fetch(`/api/ratings/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to load ratings for tutor profile:", data.error);
        return;
      }
      allTutorRatings = Array.isArray(data.ratings) ? data.ratings : [];

      // Summary
      if (
        allTutorRatings.length > 0 &&
        elements.feedbackSummary &&
        elements.feedbackAverage &&
        elements.feedbackCount
      ) {
        const avg =
          allTutorRatings.reduce(
            (sum, r) => sum + (Number(r.rating) || 0),
            0
          ) / allTutorRatings.length;
        elements.feedbackAverage.textContent = avg.toFixed(1);
        elements.feedbackCount.textContent =
          allTutorRatings.length === 1
            ? "1 rating"
            : `${allTutorRatings.length} ratings`;
        elements.feedbackSummary.classList.remove("hidden");
      }

      // Initial slice: show up to 3 feedbacks
      feedbackShownCount = Math.min(3, allTutorRatings.length || 3);
      renderFeedbackSlice();

      if (elements.feedbackLoadMore) {
        elements.feedbackLoadMore.onclick = () => {
          feedbackShownCount = allTutorRatings.length;
          renderFeedbackSlice();
        };
      }
    } catch (err) {
      console.error("Error loading tutor feedback:", err);
    }
  }

  async function loadTutorFeedback(id) {
    if (!id || !elements.feedbackList) return;
    try {
      const res = await fetch(`/api/ratings/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to load ratings for tutor profile:", data.error);
        return;
      }
      const ratings = Array.isArray(data.ratings) ? data.ratings : [];

      // Summary
      if (ratings.length > 0 && elements.feedbackSummary && elements.feedbackAverage && elements.feedbackCount) {
        const avg =
          ratings.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / ratings.length;
        elements.feedbackAverage.textContent = avg.toFixed(1);
        elements.feedbackCount.textContent =
          ratings.length === 1 ? "1 rating" : `${ratings.length} ratings`;
        elements.feedbackSummary.classList.remove("hidden");
      }

      // List
      elements.feedbackList.innerHTML = "";
      if (ratings.length === 0) {
        const p = document.createElement("p");
        p.className = "text-white/60";
        p.textContent =
          "This tutor hasn't received any feedback yet. Be the first to leave a review after your session.";
        elements.feedbackList.appendChild(p);
        return;
      }

      const recent = ratings.slice(0, 3);
      recent.forEach((r) => {
        const wrapper = document.createElement("div");
        wrapper.className =
          "bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 items-start";

        const initials =
          (r.studentName || "")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase() || "?";

        const dateLabel = r.createdAt
          ? new Date(r.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "";

        const starsHtml = Array(5)
          .fill(0)
          .map(
            (_, i) =>
              `<i data-lucide="star" class="w-4 h-4 ${i < (r.rating || 0) ? "fill-current text-yellow-400" : "text-slate-400"}"></i>`
          )
          .join("");

        wrapper.innerHTML = `
          <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-sm font-semibold">
            ${initials}
          </div>
          <div class="flex-1 space-y-1">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="font-semibold text-white">${r.studentName || "Anonymous student"}</p>
                <p class="text-xs text-white/60">${r.subject || "General"}${dateLabel ? " • " + dateLabel : ""}</p>
              </div>
              <div class="flex items-center gap-1 text-yellow-400">
                ${starsHtml}
              </div>
            </div>
            <p class="text-sm text-white/80">${r.feedback || "No written comment."}</p>
          </div>
        `;

        elements.feedbackList.appendChild(wrapper);
      });

      if (typeof lucide !== "undefined" && lucide.createIcons) {
        lucide.createIcons();
      }
    } catch (err) {
      console.error("Error loading tutor feedback:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
    wireActions();
    loadTutor();
  });
})();
