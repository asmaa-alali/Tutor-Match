 lucide.createIcons();
        
        // Theme Management
        function toggleTheme() {
            document.body.classList.toggle('dark');
            const isDark = document.body.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateThemeIcon(isDark);
        }
        
        function updateThemeIcon(isDark) {
            const icon = document.getElementById('themeIcon');
            icon.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
            lucide.createIcons();
        }
        
        // Initialize theme
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
        
        if (isDark) {
            document.body.classList.add('dark');
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            updateThemeIcon(isDark);
        });
        
        // Progress tracking
        function updateProgress() {
            const form = document.getElementById('tutorForm');
            const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
            const checkboxes = form.querySelectorAll('input[name="subjects"]:checked');
            
            let completed = 0;
            let total = inputs.length;
            
            inputs.forEach(input => {
                if (input.type === 'checkbox') {
                    // Handle agreements separately
                    if (input.checked) completed++;
                } else if (input.name === 'subjects') {
                    // Skip individual subject checkboxes, we'll count them as one
                    total--;
                } else if (input.value.trim() !== '') {
                    completed++;
                }
            });
            
            // Add subjects as one requirement
            if (checkboxes.length > 0) {
                completed++;
            }
            total++; // Add subjects requirement to total
            
            const progress = (completed / total) * 100;
            document.getElementById('progressFill').style.width = progress + '%';
        }
        
        // File upload handling
        function setupFileUpload(inputId, previewId, maxSize) {
            const input = document.getElementById(inputId);
            const preview = document.getElementById(previewId);
            
            input.addEventListener('change', function(e) {
                const file = e.target.files[0];
                const errorElement = document.getElementById(inputId + 'Error');
                
                if (file) {
                    // Validate file size
                    if (file.size > maxSize) {
                        errorElement.textContent = `File size must be less than ${maxSize / (1024 * 1024)}MB`;
                        errorElement.style.display = 'block';
                        input.value = '';
                        return;
                    }
                    
                    // Validate file type
                    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
                        errorElement.textContent = 'Only JPG and PNG files are allowed';
                        errorElement.style.display = 'block';
                        input.value = '';
                        return;
                    }
                    
                    errorElement.style.display = 'none';
                    
                    // Show preview
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
        
        // Setup file uploads
        setupFileUpload('passportPhoto', 'passportPhotoPreview', 2 * 1024 * 1024); // 2MB
        setupFileUpload('certificate', 'certificatePreview', 5 * 1024 * 1024); // 5MB
        
        // Subject checkbox handling
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
        
        // Password validation
        function validatePassword(password) {
            const minLength = password.length >= 8;
            const hasUpper = /[A-Z]/.test(password);
            const hasLower = /[a-z]/.test(password);
            const hasNumber = /\d/.test(password);
            const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
            
            return minLength && hasUpper && hasLower && hasNumber && hasSpecial;
        }
        
        // Email validation
        function validateEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
        
        // Real-time validation
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
        
        // Add event listeners for progress tracking
        document.querySelectorAll('input, select, textarea').forEach(element => {
            element.addEventListener('input', updateProgress);
            element.addEventListener('change', updateProgress);
        });
        
        // Form submission
        document.getElementById('tutorForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validate all fields
            let isValid = true;
            const errors = [];
            
            // Check required fields
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
            
            // Validate password
            const password = document.getElementById('password').value;
            if (!validatePassword(password)) {
                document.getElementById('passwordError').textContent = 'Password must meet all requirements';
                document.getElementById('passwordError').style.display = 'block';
                isValid = false;
            }
            
            // Validate password confirmation
            const confirmPassword = document.getElementById('confirmPassword').value;
            if (password !== confirmPassword) {
                document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
                document.getElementById('confirmPasswordError').style.display = 'block';
                isValid = false;
            }
            
            // Validate email
            const email = document.getElementById('email').value;
            if (!validateEmail(email)) {
                document.getElementById('emailError').textContent = 'Please enter a valid email address';
                document.getElementById('emailError').style.display = 'block';
                isValid = false;
            }
            
            // Validate subjects
            const selectedSubjects = document.querySelectorAll('input[name="subjects"]:checked');
            if (selectedSubjects.length === 0) {
                document.getElementById('subjectsError').textContent = 'Please select at least one subject';
                document.getElementById('subjectsError').style.display = 'block';
                isValid = false;
            } else {
                document.getElementById('subjectsError').style.display = 'none';
            }
            
            // Validate file uploads
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
            
            // Validate agreements
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
                // Simulate form submission
                const submitBtn = document.getElementById('submitBtn');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i data-lucide="loader" class="w-5 h-5 mr-2 inline animate-spin"></i>Creating Account...';
                lucide.createIcons();
                
                setTimeout(() => {
                    // Store success message in localStorage
                    localStorage.setItem('registrationSuccess', '🎉 Welcome, your Tutor account has been created.');
                    localStorage.setItem('userType', 'tutor');
                    localStorage.setItem('userName', document.getElementById('firstName').value);
                    
                    // Redirect to homepage
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                // Scroll to first error
                const firstError = document.querySelector('.error-message[style*="block"]');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
        
        // Initialize progress
        updateProgress();
   
(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'98029528931de309',t:'MTc1ODA0ODk3NC4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();