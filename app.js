/* ════════════════════════════════════════════
   Task Tracker — Application Logic
   ════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Local Storage Key ──
  const STORAGE_KEY = 'taskTracker_tasks';

  // ── DOM References ──
  const taskForm        = document.getElementById('taskForm');
  const taskTitleInput  = document.getElementById('taskTitle');
  const taskDescInput   = document.getElementById('taskDesc');
  const taskPriorityEl  = document.getElementById('taskPriority');
  const taskDueInput    = document.getElementById('taskDue');
  const taskListEl      = document.getElementById('taskList');
  const emptyStateEl    = document.getElementById('emptyState');
  const searchInput     = document.getElementById('searchInput');
  const clearCompBtn    = document.getElementById('clearCompletedBtn');
  const currentDateEl   = document.getElementById('currentDate');

  // Stat elements
  const totalCountEl      = document.getElementById('totalCount');
  const activeCountEl     = document.getElementById('activeCount');
  const completedCountEl  = document.getElementById('completedCount');
  const progressPercentEl = document.getElementById('progressPercent');

  // Filter buttons
  const filterBtns = document.querySelectorAll('.filter-btn');

  // ── State ──
  let tasks = [];
  let currentFilter = 'all';
  let searchQuery = '';

  // ══════════════════════════════════════════════
  // Initialization
  // ══════════════════════════════════════════════
  function init() {
    loadTasks();
    renderCurrentDate();
    renderTasks();
    updateStats();
    bindEvents();
    setDefaultDueDate();
  }

  function renderCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.textContent = now.toLocaleDateString('en-US', options);
  }

  function setDefaultDueDate() {
    const today = new Date();
    taskDueInput.value = today.toISOString().split('T')[0];
  }

  // ══════════════════════════════════════════════
  // Event Binding
  // ══════════════════════════════════════════════
  function bindEvents() {
    taskForm.addEventListener('submit', handleAddTask);
    searchInput.addEventListener('input', handleSearch);
    clearCompBtn.addEventListener('click', handleClearCompleted);

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTasks();
      });
    });
  }

  // ══════════════════════════════════════════════
  // Task CRUD
  // ══════════════════════════════════════════════

  function handleAddTask(e) {
    e.preventDefault();

    const title = taskTitleInput.value.trim();
    if (!title) return;

    const task = {
      id: generateId(),
      title,
      description: taskDescInput.value.trim(),
      priority: taskPriorityEl.value,
      dueDate: taskDueInput.value || null,
      completed: false,
      createdAt: Date.now(),
    };

    tasks.unshift(task);
    saveTasks();
    renderTasks();
    updateStats();

    // Reset form
    taskTitleInput.value = '';
    taskDescInput.value = '';
    taskPriorityEl.value = 'medium';
    setDefaultDueDate();
    taskTitleInput.focus();
  }

  function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      saveTasks();
      renderTasks();
      updateStats();
    }
  }

  function deleteTask(id) {
    const el = document.querySelector(`[data-task-id="${id}"]`);
    if (el) {
      el.classList.add('removing');
      el.addEventListener('animationend', () => {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
        updateStats();
      });
    }
  }

  function handleClearCompleted() {
    const completedEls = document.querySelectorAll('.task-item.completed');
    if (completedEls.length === 0) return;

    completedEls.forEach(el => el.classList.add('removing'));

    setTimeout(() => {
      tasks = tasks.filter(t => !t.completed);
      saveTasks();
      renderTasks();
      updateStats();
    }, 350);
  }

  // ══════════════════════════════════════════════
  // Filtering & Search
  // ══════════════════════════════════════════════

  function handleSearch() {
    searchQuery = searchInput.value.trim().toLowerCase();
    renderTasks();
  }

  function getVisibleTasks() {
    return tasks.filter(task => {
      // Filter
      if (currentFilter === 'active' && task.completed) return false;
      if (currentFilter === 'completed' && !task.completed) return false;

      // Search
      if (searchQuery) {
        const matchTitle = task.title.toLowerCase().includes(searchQuery);
        const matchDesc  = task.description.toLowerCase().includes(searchQuery);
        if (!matchTitle && !matchDesc) return false;
      }

      return true;
    });
  }

  // ══════════════════════════════════════════════
  // Rendering
  // ══════════════════════════════════════════════

  function renderTasks() {
    const visible = getVisibleTasks();

    if (visible.length === 0) {
      taskListEl.innerHTML = '';
      emptyStateEl.classList.add('visible');
      updateEmptyMessage();
    } else {
      emptyStateEl.classList.remove('visible');
      taskListEl.innerHTML = visible.map(task => createTaskHTML(task)).join('');
      attachTaskEvents();
    }
  }

  function updateEmptyMessage() {
    const titleEl = emptyStateEl.querySelector('.empty-title');
    const subEl   = emptyStateEl.querySelector('.empty-sub');

    if (searchQuery) {
      titleEl.textContent = 'No matching tasks';
      subEl.textContent   = 'Try adjusting your search query.';
    } else if (currentFilter === 'active') {
      titleEl.textContent = 'All tasks completed!';
      subEl.textContent   = '🎉 Great job — nothing pending.';
    } else if (currentFilter === 'completed') {
      titleEl.textContent = 'No completed tasks';
      subEl.textContent   = 'Complete some tasks to see them here.';
    } else {
      titleEl.textContent = 'No tasks yet';
      subEl.textContent   = 'Add your first task above to get started!';
    }
  }

  function createTaskHTML(task) {
    const completedClass = task.completed ? 'completed' : '';
    const dueDateHTML = task.dueDate ? buildDueDateHTML(task.dueDate, task.completed) : '';

    return `
      <div class="task-item ${completedClass}" data-task-id="${task.id}">
        <label class="task-checkbox">
          <input type="checkbox" ${task.completed ? 'checked' : ''} />
          <span class="checkmark"></span>
        </label>
        <div class="task-content">
          <div class="task-title">${escapeHTML(task.title)}</div>
          ${task.description ? `<div class="task-desc">${escapeHTML(task.description)}</div>` : ''}
          <div class="task-meta">
            <span class="priority-badge ${task.priority}">${capitalize(task.priority)}</span>
            ${dueDateHTML}
          </div>
        </div>
        <button class="btn-delete" title="Delete task">✕</button>
      </div>
    `;
  }

  function buildDueDateHTML(dateStr, isCompleted) {
    const due = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffMs = due - today;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let label = formatDate(dateStr);
    let overdueClass = '';

    if (!isCompleted) {
      if (diffDays < 0) {
        overdueClass = 'overdue';
        label += ' (overdue)';
      } else if (diffDays === 0) {
        label += ' (today)';
      } else if (diffDays === 1) {
        label += ' (tomorrow)';
      }
    }

    return `<span class="due-date ${overdueClass}">📅 ${label}</span>`;
  }

  function attachTaskEvents() {
    taskListEl.querySelectorAll('.task-item').forEach(el => {
      const id = el.dataset.taskId;

      // Toggle complete
      el.querySelector('input[type="checkbox"]').addEventListener('change', () => {
        toggleTask(id);
      });

      // Delete
      el.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(id);
      });
    });
  }

  // ══════════════════════════════════════════════
  // Stats
  // ══════════════════════════════════════════════

  function updateStats() {
    const total     = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active    = total - completed;
    const progress  = total === 0 ? 0 : Math.round((completed / total) * 100);

    animateNumber(totalCountEl, parseInt(totalCountEl.textContent) || 0, total);
    animateNumber(activeCountEl, parseInt(activeCountEl.textContent) || 0, active);
    animateNumber(completedCountEl, parseInt(completedCountEl.textContent) || 0, completed);
    progressPercentEl.textContent = progress + '%';
  }

  function animateNumber(el, from, to) {
    if (from === to) { el.textContent = to; return; }
    const duration = 400;
    const start = performance.now();

    function step(timestamp) {
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(from + (to - from) * eased);
      el.textContent = current;
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  // ══════════════════════════════════════════════
  // Persistence
  // ══════════════════════════════════════════════

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  function loadTasks() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      tasks = data ? JSON.parse(data) : [];
    } catch (e) {
      tasks = [];
    }
  }

  // ══════════════════════════════════════════════
  // Utilities
  // ══════════════════════════════════════════════

  function generateId() {
    return 'task_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
  }

  // ── Start ──
  init();
})();
