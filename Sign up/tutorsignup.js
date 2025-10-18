import { supabase } from "../DataBase/supabaseClient.js";
await supabase.auth.signOut();

lucide.createIcons();

function toggleTheme() {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateThemeIcon(isDark);
}
window.toggleTheme = toggleTheme; 

function updateThemeIcon(isDark) {
  const icon = document.getElementById("themeIcon");
  icon.setAttribute("data-lucide", isDark ? "moon" : "sun");
  lucide.createIcons();
}
        
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
        
        if (isDark) {
            document.body.classList.add('dark');
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            updateThemeIcon(isDark);
        });
        
        function updateProgress() {
            const form = document.getElementById('tutorForm');
            const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
            const checkboxes = form.querySelectorAll('input[name="subjects"]:checked');
            
            let completed = 0;
            let total = inputs.length;
            
            inputs.forEach(input => {
                if (input.type === 'checkbox') {
                    if (input.checked) completed++;
                } else if (input.name === 'subjects') {
                    total--;
                } else if (input.value.trim() !== '') {
                    completed++;
                }
            });
            
            if (checkboxes.length > 0) {
                completed++;
            }
            total++; 
            
            const progress = (completed / total) * 100;
            document.getElementById('progressFill').style.width = progress + '%';
        }
        
        function setupFileUpload(inputId, previewId, maxSize) {
            const input = document.getElementById(inputId);
            const preview = document.getElementById(previewId);
            
            input.addEventListener('change', function(e) {
                const file = e.target.files[0];
                const errorElement = document.getElementById(inputId + 'Error');
                
                if (file) {
                    if (file.size > maxSize) {
                        errorElement.textContent = `File size must be less than ${maxSize / (1024 * 1024)}MB`;
                        errorElement.style.display = 'block';
                        input.value = '';
                        return;
                    }
                    
                    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
                        errorElement.textContent = 'Only JPG and PNG files are allowed';
                        errorElement.style.display = 'block';
                        input.value = '';
                        return;
                    }
                    
                    errorElement.style.display = 'none';
                    
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        preview.innerHTML = `
                            <div class="flex items-center space-x-3 bg-teal-500/20 p-3 rounded-lg">
                                <i data-lucide="check-circle" class="w-5 h-5 text-teal-400"></i>
                                <span class="text-white text-sm">${file.name}</span>
                                <button type="button" onclick="clearFile('${inputId}', '${previewId}')" class="text-red-400 hover:text-red-300">
                                    <i data-lucide="x" class="w-4 h-4"></i>
                                </button>
                            </div>
                        `;
                        lucide.createIcons();
                    };
                    reader.readAsDataURL(file);
                }
                updateProgress();
            });
        }
        
        function clearFile(inputId, previewId) {
            document.getElementById(inputId).value = '';
            document.getElementById(previewId).innerHTML = '';
            updateProgress();
        }
        
        setupFileUpload('passportPhoto', 'passportPhotoPreview', 2 * 1024 * 1024); // 2MB
        setupFileUpload('certificate', 'certificatePreview', 5 * 1024 * 1024); // 5MB
        
        document.querySelectorAll('.checkbox-item[data-subject]').forEach(item => {
            item.addEventListener('click', function(e) {
                if (e.target.type !== 'checkbox') {
                    const checkbox = this.querySelector('input[type="checkbox"]');
                    checkbox.checked = !checkbox.checked;
                }
                
                if (this.querySelector('input[type="checkbox"]').checked) {
                    this.classList.add('selected');
                } else {
                    this.classList.remove('selected');
                }
                updateProgress();
            });
        });
        
        function validatePassword(password) {
            const minLength = password.length >= 8;
            const hasUpper = /[A-Z]/.test(password);
            const hasLower = /[a-z]/.test(password);
            const hasNumber = /\d/.test(password);
            const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
            
            return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
        }
        
        function validateEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
        
        document.getElementById('password').addEventListener('input', function() {
            const password = this.value;
            const errorElement = document.getElementById('passwordError');
            
            if (password && !validatePassword(password)) {
                errorElement.textContent = 'Password must be 8+ characters with uppercase, lowercase, number, and special character';
                errorElement.style.display = 'block';
            } else {
                errorElement.style.display = 'none';
            }
            updateProgress();
        });
        
        document.getElementById('confirmPassword').addEventListener('input', function() {
            const password = document.getElementById('password').value;
            const confirmPassword = this.value;
            const errorElement = document.getElementById('confirmPasswordError');
            
            if (confirmPassword && password !== confirmPassword) {
                errorElement.textContent = 'Passwords do not match';
                errorElement.style.display = 'block';
            } else {
                errorElement.style.display = 'none';
            }
            updateProgress();
        });
        
        document.getElementById('email').addEventListener('input', function() {
            const email = this.value;
            const errorElement = document.getElementById('emailError');
            
            if (email && !validateEmail(email)) {
                errorElement.textContent = 'Please enter a valid email address';
                errorElement.style.display = 'block';
            } else {
                errorElement.style.display = 'none';
            }
            updateProgress();
        });
        
        document.querySelectorAll('input, select, textarea').forEach(element => {
            element.addEventListener('input', updateProgress);
            element.addEventListener('change', updateProgress);
        });
        
        document.getElementById('tutorForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validate all fields
            let isValid = true;
            const errors = [];
            
            const requiredFields = [
                'firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword', 
                'birthdate', 'major', 'degree', 'motivation', 'format', 'availability'
            ];
            
            requiredFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                const errorElement = document.getElementById(fieldId + 'Error');
                
                if (!field.value.trim()) {
                    errorElement.textContent = 'This field is required';
                    errorElement.style.display = 'block';
                    isValid = false;
                } else {
                    errorElement.style.display = 'none';
                }
            });
            
            const password = document.getElementById('password').value;
            if (!validatePassword(password)) {
                document.getElementById('passwordError').textContent = 'Password must meet all requirements';
                document.getElementById('passwordError').style.display = 'block';
                isValid = false;
            }
            
            const confirmPassword = document.getElementById('confirmPassword').value;
            if (password !== confirmPassword) {
                document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
                document.getElementById('confirmPasswordError').style.display = 'block';
                isValid = false;
            }
            
            const email = document.getElementById('email').value;
            if (!validateEmail(email)) {
                document.getElementById('emailError').textContent = 'Please enter a valid email address';
                document.getElementById('emailError').style.display = 'block';
                isValid = false;
            }
            
            const selectedSubjects = document.querySelectorAll('input[name="subjects"]:checked');
            if (selectedSubjects.length === 0) {
                document.getElementById('subjectsError').textContent = 'Please select at least one subject';
                document.getElementById('subjectsError').style.display = 'block';
                isValid = false;
            } else {
                document.getElementById('subjectsError').style.display = 'none';
            }
            
            const passportPhoto = document.getElementById('passportPhoto').files[0];
            const certificate = document.getElementById('certificate').files[0];
            
            if (!passportPhoto) {
                document.getElementById('passportPhotoError').textContent = 'Passport photo is required';
                document.getElementById('passportPhotoError').style.display = 'block';
                isValid = false;
            }
            
            if (!certificate) {
                document.getElementById('certificateError').textContent = 'Bachelor certificate is required';
                document.getElementById('certificateError').style.display = 'block';
                isValid = false;
            }
            
            const accurateInfo = document.getElementById('accurateInfo').checked;
            const terms = document.getElementById('terms').checked;
            
            if (!accurateInfo || !terms) {
                document.getElementById('agreementsError').textContent = 'Please accept all agreements';
                document.getElementById('agreementsError').style.display = 'block';
                isValid = false;
            } else {
                document.getElementById('agreementsError').style.display = 'none';
            }
            
            if (isValid) {
                const submitBtn = document.getElementById('submitBtn');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 mr-2 inline animate-spin"></i>Creating Account...';
                lucide.createIcons();
                
                (async () => {
    try {
      const subjects = Array.from(
        document.querySelectorAll('input[name="subjects"]:checked')
      )
        .map((cb) => cb.value)
        .join(", ");
      const experience = document.getElementById("experience")?.value || "";
      const motivation = document.getElementById("motivation").value.trim();
      const format = document.getElementById("format").value.trim();
      const availability = document.getElementById("availability").value.trim();

      const passportPhoto = document.getElementById("passportPhoto").files[0];
      const certificate = document.getElementById("certificate").files[0];

      let passport_photo = null;
      let certificate_url = null;

      if (passportPhoto) {
        const { data: passData, error: passError } = await supabase.storage
          .from("tutor_uploads")
          .upload(`passports/${Date.now()}_${passportPhoto.name}`, passportPhoto, {
            cacheControl: "3600",
            upsert: true,
          });
        if (passError) throw passError;
        passport_photo = supabase.storage
          .from("tutor_uploads")
          .getPublicUrl(passData.path).data.publicUrl;
      }

      if (certificate) {
        const { data: certData, error: certError } = await supabase.storage
          .from("tutor_uploads")
          .upload(`certificates/${Date.now()}_${certificate.name}`, certificate, {
            cacheControl: "3600",
            upsert: true,
          });
        if (certError) throw certError;
        certificate_url = supabase.storage
          .from("tutor_uploads")
          .getPublicUrl(certData.path).data.publicUrl;
      }

const emailValue = document.getElementById("email").value.trim();

const { data: existingTutor, error: checkError } = await supabase
  .from("tutor_profiles")
  .select("email")
  .eq("email", emailValue)
  .maybeSingle();

if (checkError) {
  console.error("Error checking existing email:", checkError);
  alert("Something went wrong while checking your email. Please try again.");
  submitBtn.disabled = false;
  submitBtn.innerHTML = "Create Account";
  return;
}

if (existingTutor) {
  alert("⚠️ This email is already registered. Please use a different email.");
  submitBtn.disabled = false;
  submitBtn.innerHTML = "Create Account";
  return;
}

const { data, error } = await supabase.from("tutor_profiles").insert([
  {
    first_name: document.getElementById("firstName").value.trim(),
    last_name: document.getElementById("lastName").value.trim(),
    email: emailValue,
    password: document.getElementById("password").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    birthdate: document.getElementById("birthdate").value,
    major: document.getElementById("major").value.trim(),
    degree: document.getElementById("degree").value.trim(),
    gpa: document.getElementById("gpa").value.trim(),
    subjects,
    experience,
    motivation,
    format,
    availability,
    passport_photo,
    certificate_url,
  },
]);


      if (error) throw error;

console.log("✅ Tutor profile saved:", data);

const firstName = document.getElementById("firstName").value.trim();
document.getElementById("welcomeMessage").textContent =
  `🎉 Welcome ${firstName}, your Tutor account has been created successfully! You can now start connecting with students.`;

const modal = document.getElementById("successModal");
modal.style.display = "flex"; // show modal

setTimeout(() => goToHome(), 3000);

    } catch (error) {
      console.error("❌ Supabase error:", error.message);
      alert("Error creating tutor profile: " + error.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Create Account";
    }
  })();
}        });

function goToHome() {
  window.location.href = "../Homepage/home.html";
}

document.getElementById("successModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("successModal")) goToHome();
});
