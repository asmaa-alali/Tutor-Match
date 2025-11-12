(function () {
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const elements = {
    statusBadge: qs("#profileStatusBadge"),
    avatar: qs("#profileAvatar"),
    university: qs("#profileUniversity"),
    name: qs("#profileName"),
    tagline: qs("#profileTagline"),
    rating: qs("#profileRating"),
    reviews: qs("#profileReviews"),
    rate: qs("#profileRate"),
    format: qs("#profileFormat"),
    experience: qs("#profileExperience"),
    gpa: qs("#profileGpa"),
    primarySubject: qs("#profilePrimarySubject"),
    availabilitySummary: qs("#profileAvailabilitySummary"),
    bio: qs("#profileBio"),
    academicFocus: qs("#profileAcademicFocus"),
    teachingStyle: qs("#profileTeachingStyle"),
    languages: qs("#profileLanguages"),
    subjects: qs("#profileSubjects"),
    subjectsCount: qs("#subjectsCount"),
    availability: qs("#profileAvailability"),
    degree: qs("#profileDegree"),
    certifications: qs("#profileCertifications"),
    email: qs("#profileEmail"),
    phone: qs("#profilePhone"),
    callToAction: qs("#profileCallToAction"),
    content: qs("#profileContent"),
    error: qs("#profileError"),
    loading: qs("#profileLoading"),
  };

  const params = new URLSearchParams(window.location.search);
  const tutorId = params.get("id");

  const defaultMessages = {
    bio:
      "This tutor will update their bio soon. In the meantime, feel free to message them for details about their approach and experience.",
    availability:
      "This tutor will publish detailed availability soon. Send them a message to request a preferred time slot.",
  };

  const parseArray = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (!value) return [];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (_) {
        return value
          .split(/[,|\n]/)
          .map((v) => v.trim())
          .filter(Boolean);
      }
    }
    return [];
  };

  const normalizeText = (value, fallback = "—") => {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && !Number.isNaN(value)) return String(value);
    return fallback;
  };

  const showError = (message) => {
    if (elements.error) {
      elements.error.textContent = message;
      elements.error.classList.remove("hidden");
    }
    elements.content?.classList.add("hidden");
  };

  const setLoading = (isLoading) => {
    elements.loading?.classList.toggle("hidden", !isLoading);
    if (isLoading) {
      elements.content?.classList.add("opacity-25");
    } else {
      elements.content?.classList.remove("opacity-25");
    }
  };

  const pickAvatar = (tutor) =>
    tutor.avatarUrl ||
    tutor.profilePhoto ||
    tutor.passportPhoto ||
    "https://placehold.co/320x320?text=Tutor";

  const renderSubjects = (subjects) => {
    if (!elements.subjects) return;
    elements.subjects.innerHTML = "";
    if (!subjects.length) {
      elements.subjects.innerHTML =
        '<p class="text-white/60 text-sm">Subject details will appear once the tutor completes their profile.</p>';
      if (elements.subjectsCount) elements.subjectsCount.textContent = "0 subjects";
      return;
    }
    subjects.forEach((subject) => {
      const chip = document.createElement("span");
      chip.className = "subject-chip";
      chip.innerHTML = `<i data-lucide="sparkles"></i>${subject}`;
      elements.subjects.appendChild(chip);
    });
    if (elements.subjectsCount) {
      const count = subjects.length;
      elements.subjectsCount.textContent = `${count} subject${count === 1 ? "" : "s"}`;
    }
  };

  const renderAvailability = (slots) => {
    if (!elements.availability) return;
    elements.availability.innerHTML = "";
    if (!slots.length) {
      elements.availability.innerHTML = `<p>${defaultMessages.availability}</p>`;
      return;
    }
    slots.forEach((slot) => {
      const item = document.createElement("div");
      item.className = "flex items-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/10";
      item.innerHTML = `
        <i data-lucide="clock" class="w-5 h-5 text-blue-300"></i>
        <div>
          <p class="font-semibold">${slot}</p>
          <p class="text-white/60 text-xs">Available</p>
        </div>
      `;
      elements.availability.appendChild(item);
    });
  };

  const renderCertifications = (tutor) => {
    if (!elements.certifications) return;
    const certificates = [];
    if (tutor.certificate) {
      certificates.push({
        label: "Certification",
        url: tutor.certificate,
      });
    }
    if (tutor.additionalCertificates) {
      parseArray(tutor.additionalCertificates).forEach((value, idx) => {
        certificates.push({ label: `Certificate ${idx + 1}`, url: value });
      });
    }
    if (!certificates.length) {
      elements.certifications.innerHTML = "<p>No certificates uploaded yet.</p>";
      return;
    }
    elements.certifications.innerHTML = certificates
      .map(
        (cert) => `
        <a href="${cert.url}" target="_blank" rel="noopener" class="text-blue-300 hover:text-blue-200 underline flex items-center gap-2">
          <i data-lucide="external-link" class="w-4 h-4"></i>
          ${cert.label}
        </a>
      `
      )
      .join("");
  };

  const renderProfile = (tutor) => {
    const fullName = [tutor.firstName, tutor.lastName].filter(Boolean).join(" ").trim() || "Tutor Profile";
    const primarySubject = parseArray(tutor.subjects)[0] || tutor.major || "Subject expert";
    const subjects = parseArray(tutor.subjects);
    const availabilitySlots = parseArray(tutor.availability);

    document.title = `${fullName} • Tutor Match`;

    if (elements.name) elements.name.textContent = fullName;
    if (elements.tagline) {
      const degreePart = normalizeText(tutor.degree, "");
      const majorPart = normalizeText(tutor.major, "");
      elements.tagline.textContent = [degreePart, majorPart].filter(Boolean).join(" • ") || "Tutor Match Mentor";
    }
    if (elements.university) {
      const uni = normalizeText(tutor.university || tutor.campus, "Tutor Match");
      elements.university.textContent = uni;
    }
    if (elements.statusBadge) {
      elements.statusBadge.textContent = tutor.approved ? "Approved Tutor" : "Pending approval";
      elements.statusBadge.classList.toggle("bg-emerald-500/20", Boolean(tutor.approved));
      elements.statusBadge.classList.toggle("bg-yellow-500/20", !tutor.approved);
    }
    if (elements.avatar) {
      elements.avatar.src = pickAvatar(tutor);
      elements.avatar.alt = `${fullName} avatar`;
    }

    const rating = Number(tutor.rating || tutor.averageRating);
    const ratingText = Number.isFinite(rating) ? rating.toFixed(1) : "4.9";
    if (elements.rating) elements.rating.textContent = ratingText;
    const reviewsValue = normalizeText(tutor.reviews || tutor.reviewCount, "");
    if (elements.reviews) {
      elements.reviews.textContent = reviewsValue ? `(${reviewsValue} reviews)` : "(Awaiting reviews)";
    }

    const rateValue = Number(tutor.rate || tutor.hourlyRate);
    if (elements.rate) {
      elements.rate.textContent = Number.isFinite(rateValue) ? `$${rateValue}/hr` : "$35/hr";
    }
    if (elements.format) elements.format.textContent = normalizeText(tutor.format, "Online & In-person");
    if (elements.experience) elements.experience.textContent = normalizeText(tutor.experience, "—");
    if (elements.gpa) elements.gpa.textContent = normalizeText(tutor.gpa, "—");
    if (elements.primarySubject) elements.primarySubject.textContent = primarySubject;
    if (elements.availabilitySummary) {
      elements.availabilitySummary.textContent =
        availabilitySlots.slice(0, 2).join(" • ") || normalizeText(tutor.availabilitySummary, "Flexible");
    }

    if (elements.bio) elements.bio.textContent = normalizeText(tutor.motivation || tutor.bio, defaultMessages.bio);
    if (elements.academicFocus) {
      elements.academicFocus.textContent = normalizeText(tutor.major || tutor.experience, "Academic focus coming soon.");
    }
    if (elements.teachingStyle) {
      elements.teachingStyle.textContent = normalizeText(
        tutor.teachingStyle || tutor.experience,
        "Personalized study plans"
      );
    }
    if (elements.languages) {
      elements.languages.textContent = normalizeText(tutor.languages, "English");
    }

    renderSubjects(subjects);
    renderAvailability(availabilitySlots);
    renderCertifications(tutor);

    if (elements.degree) {
      const degree = normalizeText(tutor.degree, "");
      const major = normalizeText(tutor.major, "");
      elements.degree.textContent = [degree, major].filter(Boolean).join(" • ") || "Degree details coming soon";
    }

    if (elements.email) elements.email.textContent = normalizeText(tutor.email, "Not shared");
    if (elements.phone) elements.phone.textContent = normalizeText(tutor.phone, "Not shared");
    if (elements.callToAction) {
      elements.callToAction.textContent =
        tutor.callToAction ||
        "Tell the tutor about your course, deadlines, and preferred meeting style to get matched faster.";
    }

    if (typeof lucide !== "undefined" && lucide.createIcons) {
      setTimeout(() => lucide.createIcons(), 0);
    }
  };

  const fetchTutor = async () => {
    if (!tutorId) {
      showError("Missing tutor identifier. Please open this page from the Find Tutors list.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/tutors/${encodeURIComponent(tutorId)}`);
      if (!res.ok) throw new Error("Tutor not found");
      const payload = await res.json();
      if (!payload?.tutor) throw new Error("Tutor not found");
      renderProfile(payload.tutor);
    } catch (err) {
      console.error("Unable to load tutor profile", err);
      showError("Unable to load tutor profile right now. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const openBookingFlow = (action, tutorName) => {
    alert(
      `${action} with ${tutorName} coming soon.\n\nLet us know your preferred time, course, and goals so the tutor can prepare.`
    );
  };

  const backButton = qs("#backButton");
  backButton?.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.href = "./findtutor.html";
  });

  const shareButton = qs("#shareProfileBtn");
  shareButton?.addEventListener("click", async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url: shareUrl });
      } catch (err) {
        console.warn("Share cancelled", err);
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Profile link copied!");
    }
  });

  const wireCtas = () => {
    const tutorName = elements.name?.textContent || "this tutor";
    ["bookSessionBtn", "messageTutorBtn", "ctaBook", "ctaMessage"].forEach((id) => {
      const node = qs(`#${id}`);
      if (!node) return;
      node.addEventListener("click", (event) => {
        event.preventDefault();
        const action = id.toLowerCase().includes("message") ? "Messaging" : "Booking a session";
        openBookingFlow(action, tutorName);
      });
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    wireCtas();
    fetchTutor();
  });
})();
