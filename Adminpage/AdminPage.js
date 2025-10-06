lucide.createIcons();

const users = [
  { id: 1, username: 'johndoe', email: 'john@example.com', status: 'active', role: 'user', joined: '2024-01-15', avatar: 'JD' },
  { id: 2, username: 'janedoe', email: 'jane@example.com', status: 'active', role: 'moderator', joined: '2024-01-20', avatar: 'JD' },
  { id: 3, username: 'mikebrown', email: 'mike@example.com', status: 'blocked', role: 'user', joined: '2024-02-01', avatar: 'MB' },
  { id: 4, username: 'sarahwilson', email: 'sarah@example.com', status: 'active', role: 'user', joined: '2024-02-10', avatar: 'SW' },
  { id: 5, username: 'tomjones', email: 'tom@example.com', status: 'active', role: 'user', joined: '2024-02-15', avatar: 'TJ' }
];

const posts = [
  { id: 1, user: 'johndoe', content: 'Just had an amazing day at the beach! 🏖️', type: 'text', status: 'active', date: '2024-03-01', reports: 0 },
  { id: 2, user: 'janedoe', content: 'Check out this sunset photo I took!', type: 'image', status: 'active', date: '2024-03-02', reports: 0 },
  { id: 3, user: 'mikebrown', content: 'This is inappropriate content that should be removed', type: 'text', status: 'reported', date: '2024-03-03', reports: 3 },
  { id: 4, user: 'sarahwilson', content: 'My cooking tutorial video', type: 'video', status: 'active', date: '2024-03-04', reports: 0 },
  { id: 5, user: 'tomjones', content: 'Spam content with links', type: 'text', status: 'removed', date: '2024-03-05', reports: 5 }
];

const activityLogs = [
  { id: 1, action: 'User Blocked', details: 'Blocked user @mikebrown for violating community guidelines', admin: 'Admin User', timestamp: '2024-03-10 14:30:00', type: 'user' },
  { id: 2, action: 'Post Removed', details: 'Removed inappropriate post by @tomjones', admin: 'Admin User', timestamp: '2024-03-10 14:25:00', type: 'post' },
  { id: 3, action: 'User Unblocked', details: 'Unblocked user @janedoe after appeal review', admin: 'Admin User', timestamp: '2024-03-10 13:15:00', type: 'user' },
  { id: 4, action: 'Post Approved', details: 'Approved reported post by @sarahwilson after review', admin: 'Admin User', timestamp: '2024-03-10 12:45:00', type: 'post' },
  { id: 5, action: 'Settings Updated', details: 'Updated content moderation settings', admin: 'Admin User', timestamp: '2024-03-10 11:30:00', type: 'system' }
];

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
  loadUsers();
  loadPosts();
  loadActivityLog();
});

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
            ? `<button class="btn-danger text-xs" onclick="blockUser(${user.id})">Block</button>`
            : `<button class="btn-success text-xs" onclick="unblockUser(${user.id})">Unblock</button>`
          }
          <button class="btn-secondary text-xs" onclick="viewUser(${user.id})">View</button>
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

function blockUser(userId) {
  const user = users.find(u => u.id === userId);
  showConfirmModal(
    `Are you sure you want to block user "${user.username}"? They will no longer be able to access the website.`,
    () => {
      user.status = 'blocked';
      logActivity('User Blocked', `Blocked user @${user.username} for violating community guidelines`);
      loadUsers();
      showNotification(`User ${user.username} has been blocked`, 'success');
    }
  );
}

function unblockUser(userId) {
  const user = users.find(u => u.id === userId);
  showConfirmModal(
    `Are you sure you want to unblock user "${user.username}"? They will regain access to the website.`,
    () => {
      user.status = 'active';
      logActivity('User Unblocked', `Unblocked user @${user.username} after review`);
      loadUsers();
      showNotification(`User ${user.username} has been unblocked`, 'success');
    }
  );
}

function viewUser(userId) {
  const user = users.find(u => u.id === userId);
  showNotification(`Viewing details for ${user.username}`, 'success');
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
  const newLog = {
    id: activityLogs.length + 1,
    action: action,
    details: details,
    admin: 'Admin User',
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
