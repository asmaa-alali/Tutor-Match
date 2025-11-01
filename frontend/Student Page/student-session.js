document.addEventListener("DOMContentLoaded", () => {
    const sessionRaw = localStorage.getItem("tmUserSession");
    if (!sessionRaw) return;

    let session;
    try {
        session = JSON.parse(sessionRaw);
    } catch (err) {
        console.warn("Invalid session data:", err);
        return;
    }

    if (session.role && session.role !== "student") {
        return;
    }

    const profile = session.profile || {};
    const firstName = (profile.firstName || "").trim();
    const lastName = (profile.lastName || "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const major = (profile.major || "").trim();

    if (fullName) {
        document.querySelectorAll("[data-student-name]").forEach((el) => {
            el.textContent = fullName;
        });
    }

    if (firstName) {
        const greeting = document.getElementById("studentGreeting");
        if (greeting) {
            greeting.textContent = `Welcome back, ${firstName}! ✨`;
        }
    }

    const welcomeSub = document.getElementById("studentWelcomeSub");
    if (welcomeSub && fullName) {
        welcomeSub.textContent = `${fullName}, here’s everything you need for a great study session today.`;
    }

    const avatar = document.getElementById("profileAvatar");
    if (avatar && fullName) {
        const initials = [firstName[0], lastName[0]].filter(Boolean).join("");
        avatar.style.backgroundImage = "";
        avatar.textContent = initials ? initials.toUpperCase() : fullName.slice(0, 2).toUpperCase();
    }

    const headerName = document.getElementById("profileHeaderName");
    if (headerName && fullName) {
        headerName.textContent = fullName;
    }

    const fullNameInput = document.getElementById("fullName");
    if (fullNameInput && fullName) {
        fullNameInput.value = fullName;
    }

    const emailInput = document.getElementById("email");
    if (emailInput && session.email) {
        emailInput.value = session.email;
    }

    const phoneInput = document.getElementById("phone");
    if (phoneInput && profile.phone) {
        phoneInput.value = profile.phone;
    }

    const majorInput = document.getElementById("major");
    if (majorInput && major) {
        majorInput.value = major;
        if (typeof updateMajorCaption === "function") {
            updateMajorCaption();
        } else {
            const majorCaption = document.getElementById("majorCaption");
            if (majorCaption) {
                majorCaption.textContent = `${major} Student`;
            }
        }
    }

    const yearSelect = document.getElementById("yearOfStudy");
    if (yearSelect && profile.currentYear) {
        yearSelect.value = profile.currentYear;
    }

    const studentIdInput = document.getElementById("studentId");
    if (studentIdInput && profile.studentId) {
        studentIdInput.value = profile.studentId;
    }
});
