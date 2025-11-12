(function () {
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
    bio: $("#profileBio"),
    academic: $("#profileAcademic"),
    formatDetails: $("#profileFormatDetails"),
    languages: $("#profileLanguages"),
    subjectsWrap: $("#profileSubjects"),
    subjectsCount: $("#subjectsCount"),
    degree: $("#profileDegree"),
    certificates: $("#profileCertificates"),
    email: $("#profileEmail"),
    phone: $("#profilePhone"),
  };

  const params = new URLSearchParams(window.location.search);
  const tutorId = params.get("id");

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
    if (!list.length) {
      elements.subjectsWrap.innerHTML = '<span class="text-white/60 text-sm">Subject list will appear here.</span>';
      setText(elements.subjectsCount, "0 subjects");
      return;
    }
    list.forEach((subject) => {
      const span = document.createElement("span");
      span.className = "info-chip";
      span.innerHTML = `<i data-lucide="zap" class="w-4 h-4"></i>${subject}`;
      elements.subjectsWrap.appendChild(span);
    });
    setText(elements.subjectsCount, `${list.length} subject${list.length === 1 ? "" : "s"}`);
  }

  function renderCertificates(tutor) {
    if (!elements.certificates) return;
    const certs = [];
    if (tutor.certificate) certs.push({ label: "Certificate", url: tutor.certificate });
    if (tutor.additionalCertificates) {
      toArray(tutor.additionalCertificates).forEach((url, idx) => {
        certs.push({ label: `Certificate ${idx + 1}`, url });
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
      elements.avatar.src = tutor.avatarUrl || tutor.profilePhoto || tutor.passportPhoto || elements.avatar.src;
      elements.avatar.alt = `${fullName} avatar`;
    }
    const rate = Number(tutor.rate || tutor.hourlyRate);
    setText(elements.rate, Number.isFinite(rate) ? `$${rate}/hr` : "$40/hr");
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
    setText(elements.availabilitySummary, tutor.availability || "Flexible");
    setText(elements.bio, tutor.motivation || tutor.bio, elements.bio?.textContent);
    setText(elements.academic, tutor.major || tutor.experience);
    setText(elements.formatDetails, tutor.format || "Online & In-person");
    setText(elements.languages, tutor.languages || "English");
    setText(elements.degree, [tutor.degree, tutor.major].filter(Boolean).join(" • "));
    setText(elements.email, tutor.email, "Not shared");
    setText(elements.phone, tutor.phone, "Not shared");
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
    $("#bookButton")?.addEventListener("click", () =>
      alert("Booking flow coming soon. Share your course and preferred time slot with the tutor.")
    );
    $("#messageButton")?.addEventListener("click", () =>
      alert("Messaging will open soon. Use the contact info below for now.")
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

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
    wireActions();
    loadTutor();
  });
})();
