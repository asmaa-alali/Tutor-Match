lucide.createIcons();

// Add this at the very top of the file

// ==================== ADMIN SESSION GUARD ====================
(function enforceAdminSession() {
  const sessionData = localStorage.getItem("tmUserSession");
  
  if (!sessionData) {
    alert("Access denied. Please log in as admin.");
    window.location.href = "/Sign in/signin.html";
    return;
  }

  try {
    const session = JSON.parse(sessionData);
    const userEmail = session.email || "";
    const userRole = session.role || "";

    // Check if admin
    if (userEmail !== "admintm01@proton.me" && userRole !== "admin") {
      alert("Access denied. Admin privileges required.");
      window.location.href = "/Sign in/signin.html";
      return;
    }

    console.log("✅ Admin access granted:", userEmail);
  } catch (err) {
    console.error("Session validation failed:", err);
    localStorage.removeItem("tmUserSession");
    window.location.href = "/Sign in/signin.html";
  }
})();



let users = [];

const posts = [
  { id: 1, user: 'johndoe', content: 'Just had an amazing day at the beach! 🏖️', type: 'text', status: 'active', date: '2024-03-01', reports: 0 },
  { id: 2, user: 'janedoe', content: 'Check out this sunset photo I took!', type: 'image', status: 'active', date: '2024-03-02', reports: 0 },
  { id: 3, user: 'mikebrown', content: 'This is inappropriate content that should be removed', type: 'text', status: 'reported', date: '2024-03-03', reports: 3 },
  { id: 4, user: 'sarahwilson', content: 'My cooking tutorial video', type: 'video', status: 'active', date: '2024-03-04', reports: 0 },
  { id: 5, user: 'tomjones', content: 'Spam content with links', type: 'text', status: 'removed', date: '2024-03-05', reports: 5 }
];

// Initialize with empty array - will be populated by user actions
let activityLogs = [];

let currentSection = 'dashboard';
let filteredUsers = [...users];
let filteredPosts = [...posts];

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
  fetchUsers();
  loadPosts();
  loadActivityLog();
});

// Fetch users from backend admin API
async function fetchUsers() {
  try {
    const sessionData = localStorage.getItem('tmUserSession');
    const session = sessionData ? JSON.parse(sessionData) : null;
    const email = (session && session.email) ? String(session.email).trim() : '';
    
    console.log('Fetching users with email:', email);

    const res = await fetch('/api/admin/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': email
      }
    });

    console.log('API response status:', res.status);
    
    if (!res.ok) {
      const errorBody = await res.json();
      console.error('API error response:', errorBody);
      throw new Error(errorBody.error || 'Failed to fetch users');
    }

    const body = await res.json();
    console.log('Users fetched:', body.users);
    const remote = body.users || [];

    // Map to UI expected shape
    users = remote.map(u => ({
      id: u.id,
      username: u.username || (u.email ? u.email.split('@')[0] : 'user'),
      email: u.email || '',
      status: u.raw?.email_confirmed_at || u.email_confirmed_at ? 'active' : 'unverified',
      role: u.role || 'user',
      joined: u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
      avatar: (u.email && u.email.charAt(0).toUpperCase()) || 'U'
    }));

    filteredUsers = [...users];
    loadUsers();
    console.log('Users loaded successfully:', users.length, 'users');
  } catch (err) {
    console.error('fetchUsers error:', err);
    showNotification('Unable to load users from server: ' + err.message, 'error');
    // fallback to current users array (may be empty)
    filteredUsers = [...users];
    loadUsers();
  }
}

function showSection(section) {
  document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
  document.getElementById(section).style.display = 'block';

  document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
  event.target.classList.add('active');

  currentSection = section;
  document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = '';

  filteredUsers.forEach(user => {
    const row = document.createElement('tr');
    row.className = 'table-row';
    const encodedEmail = encodeURIComponent(user.email);
    row.innerHTML = `
      <td class="py-3 px-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span class="text-white text-sm font-semibold">${user.avatar}</span>
          </div>
          <span class="font-medium text-gray-900 dark:text-white">${user.username}</span>
        </div>
      </td>
      <td class="py-3 px-4 text-gray-600 dark:text-gray-300">${user.email}</td>
      <td class="py-3 px-4">
        <span class="status-badge status-${user.status}">${user.status}</span>
      </td>
      <td class="py-3 px-4 text-gray-600 dark:text-gray-300">${user.role}</td>
      <td class="py-3 px-4 text-gray-600 dark:text-gray-300">${user.joined}</td>
      <td class="py-3 px-4">
        <div class="flex gap-2">
          ${user.status === 'active'
            ? `<button class="btn-danger text-xs" onclick="blockUser('${encodedEmail}')">Block</button>`
            : `<button class="btn-success text-xs" onclick="unblockUser('${encodedEmail}')">Unblock</button>`
          }
          <button class="btn-secondary text-xs" onclick="viewUser('${encodedEmail}')">View</button>
          <button class="btn-danger text-xs" onclick="deleteUser('${encodedEmail}')" style="background-color: #dc2626;">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function filterUsers() {
  const search = document.getElementById('userSearch').value.toLowerCase();
  const statusFilter = document.getElementById('userStatusFilter').value;
  const roleFilter = document.getElementById('userRoleFilter').value;

  filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(search) ||
                          user.email.toLowerCase().includes(search);
    const matchesStatus = !statusFilter || user.status === statusFilter;
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  loadUsers();
}

function resetUserFilters() {
  document.getElementById('userSearch').value = '';
  document.getElementById('userStatusFilter').value = '';
  document.getElementById('userRoleFilter').value = '';
  filteredUsers = [...users];
  loadUsers();
}

function blockUser(userEmail) {
  userEmail = decodeURIComponent(userEmail);
  const user = users.find(u => u.email === userEmail);
  if (!user) {
    showNotification('User not found', 'error');
    return;
  }
  showConfirmModal(
    `Are you sure you want to block user "${user.email}"? They will no longer be able to access the website.`,
    () => {
      user.status = 'blocked';
      logActivity('User Blocked', `Blocked user ${user.email} for violating community guidelines`);
      loadUsers();
      showNotification(`User ${user.email} has been blocked`, 'success');
    }
  );
}

function unblockUser(userEmail) {
  userEmail = decodeURIComponent(userEmail);
  const user = users.find(u => u.email === userEmail);
  if (!user) {
    showNotification('User not found', 'error');
    return;
  }
  showConfirmModal(
    `Are you sure you want to unblock user "${user.email}"? They will regain access to the website.`,
    () => {
      user.status = 'active';
      logActivity('User Unblocked', `Unblocked user ${user.email} after review`);
      loadUsers();
      showNotification(`User ${user.email} has been unblocked`, 'success');
    }
  );
}

function viewUser(userEmail) {
  userEmail = decodeURIComponent(userEmail);
  const user = users.find(u => u.email === userEmail);
  if (!user) {
    showNotification('User not found', 'error');
    return;
  }
  showNotification(`Viewing details for ${user.email}`, 'success');
}

function deleteUser(userEmail) {
  userEmail = decodeURIComponent(userEmail);
  const user = users.find(u => u.email === userEmail);
  if (!user) {
    showNotification('User not found', 'error');
    return;
  }
  showConfirmModal(
    `Are you sure you want to permanently delete user "${user.email}"? This action cannot be undone.`,
    async () => {
      try {
        const session = JSON.parse(localStorage.getItem('tmUserSession') || 'null');
        const adminEmail = (session && session.email) ? String(session.email).trim() : '';
        
        const res = await fetch('/api/admin/delete-user', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': adminEmail
          },
          body: JSON.stringify({ userEmail: user.email })
        });

        if (!res.ok) {
          const error = await res.json();
          showNotification(error.error || 'Failed to delete user', 'error');
          return;
        }

        // Remove user from local array
        const index = users.findIndex(u => u.email === user.email);
        if (index > -1) {
          users.splice(index, 1);
        }
        filteredUsers = [...users];
        
        logActivity('User Deleted', `Deleted user ${user.email} permanently`);
        loadUsers();
        showNotification(`User ${user.email} has been deleted`, 'success');
      } catch (err) {
        console.error('Delete user error:', err);
        showNotification('Server error, could not delete user', 'error');
      }
    }
  );
}

function loadPosts() {
  const grid = document.getElementById('postsGrid');
  grid.innerHTML = '';

  filteredPosts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'card p-4';
    card.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <span class="text-white text-xs font-semibold">${post.user.charAt(0).toUpperCase()}</span>
          </div>
          <span class="text-sm font-medium text-gray-900 dark:text-white">@${post.user}</span>
        </div>
        <span class="status-badge status-${post.status}">${post.status}</span>
      </div>

      <div class="mb-3">
        <p class="text-gray-700 dark:text-gray-300 text-sm">${post.content}</p>
        <div class="flex items-center gap-2 mt-2">
          <span class="text-xs text-gray-500">Type: ${post.type}</span>
          <span class="text-xs text-gray-500">•</span>
          <span class="text-xs text-gray-500">${post.date}</span>
          ${post.reports > 0 ? `<span class="text-xs text-red-500">• ${post.reports} reports</span>` : ''}
        </div>
      </div>

      <div class="flex gap-2">
        ${post.status !== 'removed'
          ? `<button class="btn-danger text-xs" onclick="removePost(${post.id})">Remove</button>`
          : `<button class="btn-success text-xs" onclick="restorePost(${post.id})">Restore</button>`
        }
        <button class="btn-secondary text-xs" onclick="viewPost(${post.id})">View Full</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filterPosts() {
  const search = document.getElementById('postSearch').value.toLowerCase();
  const typeFilter = document.getElementById('postTypeFilter').value;
  const statusFilter = document.getElementById('postStatusFilter').value;

  filteredPosts = posts.filter(post => {
    const matchesSearch = post.content.toLowerCase().includes(search) ||
                          post.user.toLowerCase().includes(search);
    const matchesType = !typeFilter || post.type === typeFilter;
    const matchesStatus = !statusFilter || post.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  loadPosts();
}

function resetPostFilters() {
  document.getElementById('postSearch').value = '';
  document.getElementById('postTypeFilter').value = '';
  document.getElementById('postStatusFilter').value = '';
  filteredPosts = [...posts];
  loadPosts();
}

function removePost(postId) {
  const post = posts.find(p => p.id === postId);
  showConfirmModal(
    `Are you sure you want to remove this post by @${post.user}? This action cannot be undone.`,
    () => {
      post.status = 'removed';
      logActivity('Post Removed', `Removed inappropriate post by @${post.user}`);
      loadPosts();
      showNotification('Post has been removed', 'success');
    }
  );
}

function restorePost(postId) {
  const post = posts.find(p => p.id === postId);
  showConfirmModal(
    `Are you sure you want to restore this post by @${post.user}?`,
    () => {
      post.status = 'active';
      logActivity('Post Restored', `Restored post by @${post.user} after review`);
      loadPosts();
      showNotification('Post has been restored', 'success');
    }
  );
}

function viewPost(postId) {
  const post = posts.find(p => p.id === postId);
  showNotification(`Viewing full post by @${post.user}`, 'success');
}

// Activity Log
function loadActivityLog() {
  const container = document.getElementById('activityLog');
  container.innerHTML = '';

  activityLogs.forEach(log => {
    const iconClass = log.type === 'user' ? 'users' : log.type === 'post' ? 'file-text' : 'settings';
    const iconColor = log.type === 'user' ? 'blue' : log.type === 'post' ? 'green' : 'gray';

    const entry = document.createElement('div');
    entry.className = 'flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg';

    entry.innerHTML = `
      <div class="w-10 h-10 bg-${iconColor}-100 dark:bg-${iconColor}-900/20 rounded-full flex items-center justify-center">
        <i data-lucide="${iconClass}" class="w-5 h-5 text-${iconColor}-600 dark:text-${iconColor}-400"></i>
      </div>
      <div class="flex-1">
        <div class="flex items-center justify-between mb-1">
          <h4 class="font-semibold text-gray-900 dark:text-white">${log.action}</h4>
          <span class="text-xs text-gray-500">${log.timestamp}</span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-1">${log.details}</p>
        <p class="text-xs text-gray-500">by ${log.admin}</p>
      </div>
    `;
    container.appendChild(entry);
  });

  lucide.createIcons();
}

function logActivity(action, details) {
  const sessionData = localStorage.getItem('tmUserSession');
  const session = sessionData ? JSON.parse(sessionData) : {};
  const adminEmail = session.email || 'Admin User';
  
  const newLog = {
    id: activityLogs.length + 1,
    action: action,
    details: details,
    admin: adminEmail,
    timestamp: new Date().toLocaleString(),
    type: action.toLowerCase().includes('user') ? 'user' : 'post'
  };

  activityLogs.unshift(newLog);
  if (currentSection === 'activity') {
    loadActivityLog();
  }
}

// Modal Functions
function showConfirmModal(message, onConfirm) {
  document.getElementById('confirmMessage').textContent = message;
  document.getElementById('confirmButton').onclick = () => {
    onConfirm();
    closeModal();
  };
  document.getElementById('confirmModal').classList.add('show');
}

function closeModal() {
  document.getElementById('confirmModal').classList.remove('show');
}

// Notification System
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

// Close modal when clicking outside
document.getElementById('confirmModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(e) {
  const sidebar = document.getElementById('sidebar');
  const menuButton = document.querySelector('[onclick="toggleSidebar()"]');

  if (window.innerWidth <= 768 &&
      !sidebar.contains(e.target) &&
      !menuButton.contains(e.target) &&
      sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
  }
});

// Admin Logout Function
function adminLogout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("tmUserSession");
    showNotification("Logged out successfully", "success");
    setTimeout(() => {
      window.location.href = "/Sign in/signin.html";
    }, 1000);
  }
}

// Make it available globally
window.adminLogout = adminLogout;

/* === Cloudflare snippet moved as-is (unchanged) === */
(function(){
  function c(){
    var b=a.contentDocument||a.contentWindow.document;
    if(b){
      var d=b.createElement('script');
      d.innerHTML="window.__CF$cv$params={r:'989f04147421e30e',t:'MTc1OTY4OTI5Ni4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";
      b.getElementsByTagName('head')[0].appendChild(d)
    }
  }
  if(document.body){
    var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';
    document.body.appendChild(a);
    if('loading'!==document.readyState) c();
    else if(window.addEventListener) document.addEventListener('DOMContentLoaded',c);
    else{
      var e=document.onreadystatechange||function(){};
      document.onreadystatechange=function(b){ e(b); 'loading'!==document.readyState&&(document.onreadystatechange=e,c()) }
    }
  }
})();
