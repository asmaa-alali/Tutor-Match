
lucide.createIcons();
let isEditMode = false;
        let originalData = {};
        let currentSkills = ['Advanced Mathematics', 'Calculus', 'Linear Algebra', 'Physics', 'Statistics', 'SAT/ACT Prep', 'AP Mathematics', 'Differential Equations'];
        
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
        
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
        
        if (isDark) {
            document.body.classList.add('dark');
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            updateThemeIcon(isDark);
        });
        
        function storeOriginalData() {
            originalData = {
                name: document.getElementById('displayName').textContent,
                title: document.getElementById('titleDisplay').textContent,
                city: document.getElementById('cityEdit').value,
                degree: document.getElementById('degreeEdit').value,
                experience: document.getElementById('experienceEdit').value,
                bio: document.getElementById('bioDisplay').innerHTML,
                email: document.getElementById('emailDisplay').textContent,
                phone: document.getElementById('phoneDisplay').textContent,
                location: document.getElementById('locationDisplay').textContent,
                linkedin: document.getElementById('linkedinDisplay').textContent,
                twitter: document.getElementById('twitterDisplay').textContent,
                website: document.getElementById('websiteDisplay').textContent,
                totalStudents: document.getElementById('totalStudentsDisplay').textContent,
                hoursTaught: document.getElementById('hoursTaughtDisplay').textContent,
                responseRate: document.getElementById('responseRateDisplay').textContent,
                memberSince: document.getElementById('memberSinceDisplay').textContent,
                skills: [...currentSkills]
            };
        }
        
        function toggleEditMode() {
            isEditMode = !isEditMode;
            
            if (isEditMode) {
                storeOriginalData();
                enterEditMode();
            } else {
                exitEditMode();
            }
        }
        
        function enterEditMode() {
            document.getElementById('editBtn').style.display = 'none';
            document.getElementById('editActions').style.display = 'flex';
            
            document.getElementById('uploadOverlay').style.display = 'flex';
            
            toggleField('displayName', 'nameEdit');
            toggleField('titleDisplay', 'titleEdit');
            
            document.getElementById('infoDisplay').style.display = 'none';
            document.getElementById('infoEdit').style.display = 'block';
            
            document.getElementById('bioDisplay').style.display = 'none';
            document.getElementById('bioEdit').style.display = 'block';
            document.getElementById('bioTextarea').value = document.getElementById('bioDisplay').textContent.trim();
            
            document.getElementById('skillsDisplay').style.display = 'none';
            document.getElementById('skillsEdit').style.display = 'block';
            updateEditableSkills();
            
            toggleContactField('email');
            toggleContactField('phone');
            toggleContactField('location');
            toggleContactField('linkedin');
            toggleContactField('twitter');
            toggleContactField('website');
            
            toggleContactField('totalStudents');
            toggleContactField('hoursTaught');
            toggleContactField('responseRate');
            toggleContactField('memberSince');
            
            setupEventListeners();
        }
        
        function exitEditMode() {
            document.getElementById('editBtn').style.display = 'flex';
            document.getElementById('editActions').style.display = 'none';
            
            document.getElementById('uploadOverlay').style.display = 'none';
            
            toggleField('displayName', 'nameEdit', false);
            toggleField('titleDisplay', 'titleEdit', false);
            
            document.getElementById('infoDisplay').style.display = 'block';
            document.getElementById('infoEdit').style.display = 'none';
            
            document.getElementById('bioDisplay').style.display = 'block';
            document.getElementById('bioEdit').style.display = 'none';
            
            document.getElementById('skillsDisplay').style.display = 'flex';
            document.getElementById('skillsEdit').style.display = 'none';
            
            toggleContactField('email', false);
            toggleContactField('phone', false);
            toggleContactField('location', false);
            toggleContactField('linkedin', false);
            toggleContactField('twitter', false);
            toggleContactField('website', false);
            
            toggleContactField('totalStudents', false);
            toggleContactField('hoursTaught', false);
            toggleContactField('responseRate', false);
            toggleContactField('memberSince', false);
        }
        
        function toggleField(displayId, editId, show = true) {
            const display = document.getElementById(displayId);
            const edit = document.getElementById(editId);
            
            if (show) {
                display.style.display = 'none';
                edit.style.display = 'block';
                edit.value = display.textContent.trim();
            } else {
                display.style.display = 'block';
                edit.style.display = 'none';
            }
        }
        
        function toggleContactField(fieldName, show = true) {
            const display = document.getElementById(fieldName + 'Display');
            const edit = document.getElementById(fieldName + 'Edit');
            
            if (show) {
                display.style.display = 'none';
                edit.style.display = 'block';
                edit.value = display.textContent;
            } else {
                display.style.display = 'block';
                edit.style.display = 'none';
            }
        }
        
        function setupEventListeners() {
            const bioTextarea = document.getElementById('bioTextarea');
            bioTextarea.addEventListener('input', updateBioCharCount);
            updateBioCharCount();
            
            const skillInput = document.getElementById('skillInput');
            skillInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                }
            });
            
            document.getElementById('uploadOverlay').addEventListener('click', function() {
                document.getElementById('profileImageInput').click();
            });
            
            document.getElementById('profileImageInput').addEventListener('change', handleImageUpload);
        }
        
        function updateBioCharCount() {
            const textarea = document.getElementById('bioTextarea');
            const count = document.getElementById('bioCharCount');
            count.textContent = textarea.value.length;
            
            if (textarea.value.length > 1000) {
                count.style.color = '#ef4444';
            } else {
                count.style.color = '';
            }
        }
        
        function updateEditableSkills() {
            const container = document.getElementById('editableSkills');
            container.innerHTML = '';
            
            currentSkills.forEach(skill => {
                const skillElement = document.createElement('span');
                skillElement.className = 'skill-tag cursor-pointer';
                skillElement.innerHTML = `
                    ${skill}
                    <i data-lucide="x" class="w-4 h-4"></i>
                `;
                skillElement.addEventListener('click', () => removeSkill(skill));
                container.appendChild(skillElement);
            });
            
            lucide.createIcons();
        }
        
        function addSkill() {
            const input = document.getElementById('skillInput');
            const skill = input.value.trim();
            
            if (skill && !currentSkills.includes(skill)) {
                currentSkills.push(skill);
                updateEditableSkills();
                input.value = '';
            }
        }
        
        function removeSkill(skillToRemove) {
            currentSkills = currentSkills.filter(skill => skill !== skillToRemove);
            updateEditableSkills();
        }
        
        function handleImageUpload(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
                    showNotification('Please select a valid image file (JPG, PNG, GIF, or WebP)', 'error');
                    e.target.value = ''; // Clear the input
                    return;
                }
                
                if (file.size > 5 * 1024 * 1024) {
                    showNotification('Image size must be less than 5MB', 'error');
                    e.target.value = ''; // Clear the input
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = document.getElementById('profileImage');
                    img.src = event.target.result;
                    showNotification('Profile picture updated! Remember to save changes.', 'success');
                };
                reader.onerror = function() {
                    showNotification('Error reading file. Please try again.', 'error');
                    e.target.value = ''; // Clear the input
                };
                reader.readAsDataURL(file);
            }
        }
        
        function saveProfile() {
            const name = document.getElementById('displayName').textContent.trim();
            const email = document.getElementById('emailEdit').value.trim();
            const bio = document.getElementById('bioTextarea').value.trim();
            
            if (!name) {
                showNotification('Name is required', 'error');
                return;
            }
            
            if (!email || !isValidEmail(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            if (bio.length > 1000) {
                showNotification('Bio must be less than 1000 characters', 'error');
                return;
            }
            
            setTimeout(() => {
                // Update display values
                updateDisplayValues();
                
                isEditMode = false;
                exitEditMode();
                
                showNotification('Profile updated successfully!', 'success');
            }, 1000);
        }
        
        function updateDisplayValues() {
            document.getElementById('displayName').textContent = document.getElementById('nameEdit').value;
            document.getElementById('titleDisplay').textContent = document.getElementById('titleEdit').value;
            
            const city = document.getElementById('cityEdit').value;
            const degree = document.getElementById('degreeEdit').value;
            const experience = document.getElementById('experienceEdit').value;
            document.getElementById('infoDisplay').textContent = `${city} • ${degree} • ${experience}`;
            
            const bioText = document.getElementById('bioTextarea').value;
            document.getElementById('bioDisplay').innerHTML = bioText.split('\n').map(p => `<p class="mb-4">${p}</p>`).join('');
            
            document.getElementById('emailDisplay').textContent = document.getElementById('emailEdit').value;
            document.getElementById('phoneDisplay').textContent = document.getElementById('phoneEdit').value;
            document.getElementById('locationDisplay').textContent = document.getElementById('locationEdit').value;
            document.getElementById('linkedinDisplay').textContent = document.getElementById('linkedinEdit').value;
            document.getElementById('twitterDisplay').textContent = document.getElementById('twitterEdit').value;
            document.getElementById('websiteDisplay').textContent = document.getElementById('websiteEdit').value;
            
            const totalStudents = document.getElementById('totalStudentsEdit').value;
            const hoursTaught = document.getElementById('hoursTaughtEdit').value;
            const responseRate = document.getElementById('responseRateEdit').value;
            const memberSince = document.getElementById('memberSinceEdit').value;
            
            document.getElementById('totalStudentsDisplay').textContent = totalStudents;
            document.getElementById('hoursTaughtDisplay').textContent = parseInt(hoursTaught).toLocaleString();
            document.getElementById('responseRateDisplay').textContent = responseRate + '%';
            document.getElementById('memberSinceDisplay').textContent = memberSince;
            
            const skillsContainer = document.getElementById('skillsDisplay');
            skillsContainer.innerHTML = '';
            currentSkills.forEach(skill => {
                const skillElement = document.createElement('span');
                skillElement.className = 'skill-tag';
                skillElement.textContent = skill;
                skillsContainer.appendChild(skillElement);
            });
        }
        
        function cancelEdit() {
            document.getElementById('displayName').textContent = originalData.name;
            document.getElementById('titleDisplay').textContent = originalData.title;
            document.getElementById('nameEdit').value = originalData.name;
            document.getElementById('titleEdit').value = originalData.title;
            document.getElementById('cityEdit').value = originalData.city;
            document.getElementById('degreeEdit').value = originalData.degree;
            document.getElementById('experienceEdit').value = originalData.experience;
            document.getElementById('bioDisplay').innerHTML = originalData.bio;
            document.getElementById('emailEdit').value = originalData.email;
            document.getElementById('phoneEdit').value = originalData.phone;
            document.getElementById('locationEdit').value = originalData.location;
            document.getElementById('linkedinEdit').value = originalData.linkedin;
            document.getElementById('twitterEdit').value = originalData.twitter;
            document.getElementById('websiteEdit').value = originalData.website;
            document.getElementById('totalStudentsEdit').value = originalData.totalStudents;
            document.getElementById('hoursTaughtEdit').value = originalData.hoursTaught.replace(',', '');
            document.getElementById('responseRateEdit').value = originalData.responseRate.replace('%', '');
            document.getElementById('memberSinceEdit').value = originalData.memberSince;
            
            currentSkills = [...originalData.skills];
            
            isEditMode = false;
            exitEditMode();
            
            showNotification('Changes cancelled', 'error');
        }
        
        function isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
        
        function showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            const text = document.getElementById('notificationText');
            
            text.textContent = message;
            notification.className = `notification ${type}`;
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
        
        storeOriginalData();
