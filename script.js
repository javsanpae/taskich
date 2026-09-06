// Global state
let currentFilter = 'active';
let currentTagFilter = null;
let allTasks = [];
let currentEditingTaskId = null;
let pendingAction = null;
let pendingActionData = null;
let warningResolve = null;

// DOM elements
const taskTitleInput = document.getElementById('taskTitle');
const taskDescriptionInput = document.getElementById('taskDescription');
const taskTagsInput = document.getElementById('taskTags');
const dueDateInput = document.getElementById('dueDate');
const recurringSelect = document.getElementById('recurring');
const customRecurringGroup = document.getElementById('customRecurringGroup');
const customRecurringNumber = document.getElementById('customRecurringNumber');
const customRecurringUnit = document.getElementById('customRecurringUnit');
const recurringEndDateGroup = document.getElementById('recurringEndDateGroup');
const recurringEndDateInput = document.getElementById('recurringEndDate');
const recurringUndefinedCheckbox = document.getElementById('recurringUndefined');
const addTaskBtn = document.getElementById('addTaskBtn');
const tasksList = document.getElementById('tasksList');
const taskCount = document.getElementById('taskCount');
const tasksTitle = document.getElementById('tasksTitle');
const filterBtns = document.querySelectorAll('.filter-btn');
const modal = document.getElementById('taskModal');
const modalTaskTagsInput = document.getElementById('modalTaskTags');
const scopeModal = document.getElementById('scopeModal');
const warningModal = document.getElementById('warningModal');
const closeModalBtns = document.querySelectorAll('.close-btn');
const saveTaskBtn = document.getElementById('saveTaskBtn');
const deleteTaskBtn = document.getElementById('deleteTaskBtn');
const darkModeToggle = document.getElementById('darkModeToggle');
const logoutBtn = document.getElementById('logoutBtn');
const usernameDisplay = document.getElementById('usernameDisplay');
const scopeThisOnly = document.getElementById('scopeThisOnly');
const scopeAllFollowing = document.getElementById('scopeAllFollowing');
const scopeCancel = document.getElementById('scopeCancel');
const deleteAllCompletedBtn = document.getElementById('deleteAllCompletedBtn');
const warningConfirmBtn = document.getElementById('warningConfirmBtn');
const warningCancelBtn = document.getElementById('warningCancelBtn');
const warningMessage = document.getElementById('warningMessage');
const toggleDrawerBtn = document.getElementById('toggleDrawerBtn');
const composerDrawer = document.getElementById('composerDrawer');
const sidebarTagsSection = document.getElementById('sidebarTagsSection');
const tagsList = document.getElementById('tagsList');
const clearTagFilterBtn = document.getElementById('clearTagFilterBtn');

// SVG Icon Helpers for Dynamic Content
const ICONS = {
    calendar: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    repeat: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"></path><path d="M3 11v-1a4 4 0 0 1 4-4h14"></path><path d="m7 22-4-4 4-4"></path><path d="M21 13v1a4 4 0 0 1-4 4H3"></path></svg>`,
    alert: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    edit: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>`,
    trash: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>`,
    check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
};

// Logout function
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Custom dialog functions
function showWarning(message) {
    return new Promise((resolve) => {
        warningResolve = resolve;
        warningMessage.textContent = message;
        warningModal.classList.add('active');
    });
}

function closeWarning(result) {
    warningModal.classList.remove('active');
    if (warningResolve) {
        warningResolve(result);
        warningResolve = null;
    }
}

// Event listeners for warning modal
warningConfirmBtn.addEventListener('click', () => closeWarning(true));
warningCancelBtn.addEventListener('click', () => closeWarning(false));
warningModal.addEventListener('click', (e) => {
    if (e.target === warningModal) {
        closeWarning(false);
    }
});

// Event listeners
addTaskBtn.addEventListener('click', addTask);
filterBtns.forEach(btn => btn.addEventListener('click', setFilter));
closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));
saveTaskBtn.addEventListener('click', saveTaskChanges);
deleteTaskBtn.addEventListener('click', deleteCurrentTask);
recurringSelect.addEventListener('change', toggleRecurringOptions);
recurringUndefinedCheckbox.addEventListener('change', toggleRecurringEndDateInput);
darkModeToggle.addEventListener('click', toggleDarkMode);
logoutBtn.addEventListener('click', logout);
scopeThisOnly.addEventListener('click', () => handleScopeChoice('this_only'));
scopeAllFollowing.addEventListener('click', () => handleScopeChoice('all_following'));
scopeCancel.addEventListener('click', closeScopeModal);

if (deleteAllCompletedBtn) {
    deleteAllCompletedBtn.addEventListener('click', deleteAllCompleted);
}

if (clearTagFilterBtn) {
    clearTagFilterBtn.addEventListener('click', () => {
        currentTagFilter = null;
        updateTitle();
        renderTasks();
        updateTagsSidebar();
    });
}

// Parse comma-separated tags helper
function parseTags(tagsStr) {
    if (!tagsStr) return [];
    return tagsStr
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
}

if (toggleDrawerBtn && composerDrawer) {
    toggleDrawerBtn.addEventListener('click', () => {
        const isOpen = composerDrawer.classList.toggle('open');
        toggleDrawerBtn.classList.toggle('active', isOpen);
    });
}

// Keyboard shortcuts
if (taskTitleInput) {
    taskTitleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addTask();
        }
    });
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (warningModal.classList.contains('active')) closeWarning(false);
        else if (scopeModal.classList.contains('active')) closeScopeModal();
        else if (modal.classList.contains('active')) closeModal();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeDarkMode();
    loadUsername();
    loadTasks();
    setInterval(loadTasks, 30000); // Refresh every 30 seconds
});

// Load username from auth status
async function loadUsername() {
    try {
        const response = await fetch('/api/auth/status');
        if (response.ok) {
            const data = await response.json();
            if (data.authenticated && usernameDisplay) {
                usernameDisplay.textContent = data.username;
            }
        }
    } catch (error) {
        console.error('Error loading username:', error);
    }
}

// Dark mode functions
function initializeDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true' || 
                       (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    updateDarkModeToggle(isDarkMode);
}

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    updateDarkModeToggle(isDarkMode);
}

function updateDarkModeToggle(isDarkMode) {
    const moonIcon = darkModeToggle.querySelector('.theme-icon-moon');
    const sunIcon = darkModeToggle.querySelector('.theme-icon-sun');
    if (moonIcon && sunIcon) {
        moonIcon.style.display = isDarkMode ? 'none' : 'block';
        sunIcon.style.display = isDarkMode ? 'block' : 'none';
    }
}

// Toggle recurring options
function toggleRecurringOptions() {
    const isRecurring = recurringSelect.value !== '';
    const isCustom = recurringSelect.value === 'custom';
    
    recurringEndDateGroup.style.display = isRecurring ? 'block' : 'none';
    customRecurringGroup.style.display = isCustom ? 'grid' : 'none';
}

// Toggle recurring end date input
function toggleRecurringEndDateInput() {
    const isUndefined = recurringUndefinedCheckbox.checked;
    recurringEndDateInput.disabled = isUndefined;
    if (isUndefined) {
        recurringEndDateInput.value = '';
    }
}

// Parse recurring interval
function getRecurringInterval() {
    const recurring = recurringSelect.value;
    
    if (recurring === 'custom') {
        const number = customRecurringNumber.value || 1;
        const unit = customRecurringUnit.value;
        return `${number}_${unit}`;
    }
    
    return recurring || null;
}

// Add a new task
async function addTask() {
    const title = taskTitleInput.value.trim();
    const description = taskDescriptionInput.value.trim();
    const tags = taskTagsInput ? taskTagsInput.value.trim() : '';
    const dueDate = dueDateInput.value;
    const recurring = recurringSelect.value || null;
    const recurringInterval = getRecurringInterval();
    const recurringEndDate = recurringUndefinedCheckbox.checked ? null : (recurringEndDateInput.value || null);

    if (!title) {
        await showWarning('Please enter a task title');
        taskTitleInput.focus();
        return;
    }

    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description: description || null,
                due_date: dueDate || null,
                recurring: recurring ? 'recurring' : null,
                recurring_interval: recurringInterval,
                recurring_end_date: recurringEndDate,
                tags: tags || null
            })
        });

        if (response.ok) {
            taskTitleInput.value = '';
            taskDescriptionInput.value = '';
            if (taskTagsInput) taskTagsInput.value = '';
            dueDateInput.value = '';
            recurringSelect.value = '';
            customRecurringNumber.value = 1;
            customRecurringUnit.value = 'days';
            recurringEndDateInput.value = '';
            recurringUndefinedCheckbox.checked = false;
            recurringEndDateGroup.style.display = 'none';
            customRecurringGroup.style.display = 'none';
            
            // Close drawer after adding
            if (composerDrawer && composerDrawer.classList.contains('open')) {
                composerDrawer.classList.remove('open');
                if (toggleDrawerBtn) toggleDrawerBtn.classList.remove('active');
            }

            loadTasks();
        } else {
            await showWarning('Failed to create task');
        }
    } catch (error) {
        console.error('Error:', error);
        await showWarning('Error creating task');
    }
}

// Load tasks from server
async function loadTasks() {
    try {
        const includePast = currentFilter === 'all';
        const response = await fetch(`/api/tasks?include_past=${includePast}`);
        allTasks = await response.json();
        updateMetrics();
        updateTagsSidebar();
        renderTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Update sidebar badge metrics and productivity bar
function updateMetrics() {
    const activeTasks = allTasks.filter(t => !t.completed);
    const completedTasks = allTasks.filter(t => t.completed);
    
    const activeBadge = document.getElementById('activeBadge');
    const allBadge = document.getElementById('allBadge');
    const completedBadge = document.getElementById('completedBadge');
    
    if (activeBadge) activeBadge.textContent = activeTasks.length;
    if (allBadge) allBadge.textContent = allTasks.length;
    if (completedBadge) completedBadge.textContent = completedTasks.length;

    const total = activeTasks.length + completedTasks.length;
    const percent = total > 0 ? Math.round((completedTasks.length / total) * 100) : 0;
    
    const progressBar = document.getElementById('progressBar');
    const productivityPercent = document.getElementById('productivityPercent');
    const productivityCaption = document.getElementById('productivityCaption');

    if (progressBar) progressBar.style.width = `${percent}%`;
    if (productivityPercent) productivityPercent.textContent = `${percent}%`;
    if (productivityCaption) {
        if (percent === 100 && total > 0) productivityCaption.textContent = 'All tasks finished! 🎉';
        else if (percent >= 50) productivityCaption.textContent = 'More than halfway done! ⚡';
        else if (total === 0) productivityCaption.textContent = 'No tasks active';
        else productivityCaption.textContent = `${activeTasks.length} tasks remaining`;
    }
}

// Filter tasks based on current filter and tag filter
function getFilteredTasks() {
    let filtered = allTasks;

    if (currentFilter === 'active') {
        filtered = filtered.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(task => task.completed);
    }

    if (currentTagFilter) {
        const target = currentTagFilter.toLowerCase();
        filtered = filtered.filter(task => {
            const tags = parseTags(task.tags).map(t => t.toLowerCase());
            return tags.includes(target);
        });
    }

    return filtered;
}

// Render tasks list
function renderTasks() {
    const filtered = getFilteredTasks();
    taskCount.textContent = filtered.length;

    // Show delete all completed button only when viewing completed tasks
    if (deleteAllCompletedBtn) {
        deleteAllCompletedBtn.style.display = currentFilter === 'completed' && filtered.length > 0 ? 'inline-flex' : 'none';
    }

    if (filtered.length === 0) {
        let emptyMessage = 'You have no tasks in this view. Use the input above to capture a new task.';
        if (currentTagFilter) {
            emptyMessage = `No tasks tagged with #${escapeHtml(currentTagFilter)} found in this view.`;
        } else if (currentFilter === 'completed') {
            emptyMessage = 'No completed tasks yet. Keep moving forward!';
        }
        tasksList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                        <path d="m9 14 2 2 4-4"></path>
                    </svg>
                </div>
                <h3>All clear for now</h3>
                <p>${emptyMessage}</p>
            </div>
        `;
        return;
    }

    tasksList.innerHTML = filtered.map(task => createTaskElement(task)).join('');

    // Add event listeners to task elements
    document.querySelectorAll('.task-item').forEach(el => {
        el.addEventListener('click', () => openTaskModal(el.dataset.taskId));
    });

    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            const taskId = e.target.closest('.task-item').dataset.taskId;
            toggleTaskCompletion(taskId, e.target.checked);
        });
    });

    document.querySelectorAll('.action-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openTaskModal(btn.closest('.task-item').dataset.taskId);
        });
    });

    document.querySelectorAll('.action-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const taskId = btn.closest('.task-item').dataset.taskId;
            const confirmed = await showWarning('Are you sure you want to delete this task?');
            if (confirmed) {
                await handleDeleteTask(taskId);
            }
        });
    });

    // Add event listeners for delete completed task icons
    document.querySelectorAll('.action-delete-icon').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const taskId = btn.closest('.task-item').dataset.taskId;
            const confirmed = await showWarning('Delete this completed task?');
            if (confirmed) {
                await performDelete(null, 'this_only', taskId);
            }
        });
    });

    // Add event listeners for tag chips on task items
    document.querySelectorAll('.task-item .badge-tag').forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.stopPropagation();
            const tag = chip.dataset.tag;
            toggleTagFilter(tag);
        });
    });
}

// Create task element HTML
function createTaskElement(task) {
    const isCompleted = task.completed;
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    const now = new Date();
    const isOverdue = dueDate && dueDate < now && !isCompleted;

    let dueDateStr = '';
    if (dueDate) {
        dueDateStr = formatDate(dueDate);
    }

    let metaChips = '';
    if (dueDateStr) {
        metaChips += `<span class="task-meta-chip">${ICONS.calendar} ${dueDateStr}</span>`;
    }
    if (task.recurring) {
        metaChips += `<span class="task-meta-chip badge-recurring">${ICONS.repeat} ${escapeHtml(formatRecurringInterval(task.recurring_interval))}</span>`;
    }
    if (isOverdue) {
        metaChips += `<span class="task-meta-chip badge-overdue">${ICONS.alert} Overdue</span>`;
    }
    if (task.completed && task.completed_date) {
        metaChips += `<span class="task-meta-chip">${ICONS.check} ${formatDate(new Date(task.completed_date))}</span>`;
    }

    // Render tag chips
    const tags = parseTags(task.tags);
    tags.forEach(tag => {
        const isActive = currentTagFilter && currentTagFilter.toLowerCase() === tag.toLowerCase();
        metaChips += `<span class="task-meta-chip badge-tag ${isActive ? 'active' : ''}" data-tag="${escapeHtml(tag)}" title="Filter by #${escapeHtml(tag)}">#${escapeHtml(tag)}</span>`;
    });

    let actionsHtml = '';
    if (isCompleted) {
        actionsHtml = `
            <div class="task-actions">
                <button class="task-action-btn action-delete-icon" title="Delete completed task">
                    ${ICONS.trash}
                </button>
            </div>
        `;
    } else {
        actionsHtml = `
            <div class="task-actions">
                <button class="task-action-btn action-edit" title="Edit task">
                    ${ICONS.edit}
                </button>
                <button class="task-action-btn action-delete" title="Delete task">
                    ${ICONS.trash}
                </button>
            </div>
        `;
    }

    return `
        <div class="task-item ${isCompleted ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" data-task-id="${task.id}">
            <div class="task-header">
                <div style="display: flex; align-items: flex-start; gap: 0.75rem; flex: 1;">
                    <div class="task-checkbox-wrap">
                        <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''} aria-label="Mark task complete">
                    </div>
                    <div class="task-title">${escapeHtml(task.title)}</div>
                </div>
                ${actionsHtml}
            </div>
            
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            
            ${metaChips ? `<div class="task-meta">${metaChips}</div>` : ''}
        </div>
    `;
}

// Format recurring interval
function formatRecurringInterval(interval) {
    if (!interval) return '';
    
    const standardMap = {
        'daily': 'Daily',
        'weekly': 'Weekly',
        'monthly': 'Monthly',
        'yearly': 'Yearly'
    };
    
    if (standardMap[interval]) {
        return standardMap[interval];
    }
    
    // Custom interval
    if (interval.includes('_')) {
        const [number, unit] = interval.split('_');
        return `Every ${number} ${unit}`;
    }
    
    return interval;
}

// Format date (date only, no time)
function formatDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    if (checkDate.getTime() === today.getTime()) {
        return 'Today';
    } else if (checkDate.getTime() === tomorrow.getTime()) {
        return 'Tomorrow';
    }
    
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Toggle task completion
async function toggleTaskCompletion(taskId, checked) {
    try {
        const endpoint = checked ? 'complete' : 'reopen';
        const response = await fetch(`/api/tasks/${taskId}/${endpoint}`, {
            method: 'POST'
        });

        if (response.ok) {
            loadTasks();
        } else {
            await showWarning('Failed to update task');
        }
    } catch (error) {
        console.error('Error:', error);
        await showWarning('Error updating task');
    }
}

// Open task modal
async function openTaskModal(taskId) {
    currentEditingTaskId = taskId;
    const task = allTasks.find(t => t.id == taskId);

    if (!task) return;

    document.getElementById('modalTitle').textContent = 'Edit Task';
    document.getElementById('modalTaskTitle').value = task.title;
    document.getElementById('modalTaskDescription').value = task.description || '';
    if (modalTaskTagsInput) {
        modalTaskTagsInput.value = task.tags || '';
    }
    document.getElementById('modalDueDate').value = task.due_date ? formatDateForInput(new Date(task.due_date)) : '';

    const recurringInfo = document.getElementById('recurringInfo');
    if (task.recurring) {
        recurringInfo.style.display = 'block';
        document.getElementById('recurringType').textContent = formatRecurringInterval(task.recurring_interval);
        if (task.recurring_end_date) {
            document.getElementById('recurringEndInfo').textContent = `Until: ${formatDate(new Date(task.recurring_end_date))}`;
        } else {
            document.getElementById('recurringEndInfo').textContent = 'No end date';
        }
    } else {
        recurringInfo.style.display = 'none';
    }

    modal.classList.add('active');
}

// Format date for input
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Close modal
function closeModal() {
    modal.classList.remove('active');
    currentEditingTaskId = null;
}

// Scope modal functions
function openScopeModal(title, message, action, actionData) {
    pendingAction = action;
    pendingActionData = actionData;
    
    document.getElementById('scopeTitle').textContent = title;
    document.getElementById('scopeMessage').textContent = message;
    
    scopeModal.classList.add('active');
}

function closeScopeModal() {
    scopeModal.classList.remove('active');
    pendingAction = null;
    pendingActionData = null;
}

async function handleScopeChoice(scope) {
    if (pendingAction === 'update') {
        await performUpdate(pendingActionData, scope);
    } else if (pendingAction === 'delete') {
        await performDelete(pendingActionData, scope);
    }
    closeScopeModal();
}

// Save task changes
async function saveTaskChanges() {
    if (!currentEditingTaskId) return;

    const title = document.getElementById('modalTaskTitle').value.trim();
    const description = document.getElementById('modalTaskDescription').value.trim();
    const tags = modalTaskTagsInput ? modalTaskTagsInput.value.trim() : '';
    const dueDate = document.getElementById('modalDueDate').value;

    if (!title) {
        await showWarning('Please enter a task title');
        return;
    }

    const updateData = { 
        title, 
        description: description || null, 
        due_date: dueDate || null,
        tags: tags || null
    };
    
    // Check if this is a recurring instance
    const task = allTasks.find(t => t.id == currentEditingTaskId);
    if (task && task.recurring) {
        openScopeModal(
            'Update Recurring Task',
            'This task is part of a recurring series. How should this change be applied?',
            'update',
            updateData
        );
    } else {
        await performUpdate(updateData, 'this_only');
    }
}

async function performUpdate(updateData, scope) {
    try {
        const response = await fetch(`/api/tasks/${currentEditingTaskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...updateData,
                scope
            })
        });

        if (response.ok) {
            closeModal();
            loadTasks();
        } else {
            await showWarning('Failed to save task');
        }
    } catch (error) {
        console.error('Error:', error);
        await showWarning('Error saving task');
    }
}

// Delete current task
async function deleteCurrentTask() {
    if (!currentEditingTaskId) return;

    const confirmed = await showWarning('Are you sure you want to delete this task?');
    if (!confirmed) return;

    const task = allTasks.find(t => t.id == currentEditingTaskId);
    if (task && task.recurring) {
        openScopeModal(
            'Delete Recurring Task',
            'This task is part of a recurring series. How should this deletion be applied?',
            'delete',
            null
        );
    } else {
        await performDelete(null, 'this_only');
    }
}

// Handle delete task from task list
async function handleDeleteTask(taskId) {
    const task = allTasks.find(t => t.id == taskId);
    if (task && task.recurring) {
        currentEditingTaskId = taskId;
        openScopeModal(
            'Delete Recurring Task',
            'This task is part of a recurring series. How should this deletion be applied?',
            'delete',
            null
        );
    } else {
        await performDelete(null, 'this_only', taskId);
    }
}

// Perform delete
async function performDelete(data, scope, taskId = null) {
    const idToDelete = taskId || currentEditingTaskId;
    
    try {
        const response = await fetch(`/api/tasks/${idToDelete}?scope=${scope}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            closeModal();
            loadTasks();
        } else {
            await showWarning('Failed to delete task');
        }
    } catch (error) {
        console.error('Error:', error);
        await showWarning('Error deleting task');
    }
}

// Set filter
function setFilter(e) {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    const filter = btn.dataset.filter;
    currentFilter = filter;

    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    updateTitle();
    renderTasks();
}

// Update title based on view and tag filter
function updateTitle() {
    const titles = {
        active: 'Active Tasks',
        all: 'All Tasks',
        completed: 'Completed Tasks'
    };
    let title = titles[currentFilter] || 'Tasks';
    if (currentTagFilter) {
        title += ` • #${currentTagFilter}`;
    }
    tasksTitle.textContent = title;
}

// Toggle tag filter
function toggleTagFilter(tag) {
    if (currentTagFilter && currentTagFilter.toLowerCase() === tag.toLowerCase()) {
        currentTagFilter = null;
    } else {
        currentTagFilter = tag;
    }
    updateTitle();
    renderTasks();
    updateTagsSidebar();
}

// Update tags sidebar list with count of tasks using each tag
function updateTagsSidebar() {
    if (!sidebarTagsSection || !tagsList) return;

    const tagCounts = {};
    allTasks.forEach(task => {
        const tags = parseTags(task.tags);
        const uniqueInTask = [...new Set(tags.map(t => t.trim()))];
        uniqueInTask.forEach(tag => {
            const key = tag.toLowerCase();
            if (!tagCounts[key]) {
                tagCounts[key] = { display: tag, count: 0 };
            }
            tagCounts[key].count++;
        });
    });

    const tagKeys = Object.keys(tagCounts).sort();

    if (tagKeys.length === 0) {
        sidebarTagsSection.style.display = 'none';
        if (currentTagFilter) {
            currentTagFilter = null;
            updateTitle();
        }
        return;
    }

    sidebarTagsSection.style.display = 'block';
    if (clearTagFilterBtn) {
        clearTagFilterBtn.style.display = currentTagFilter ? 'inline-block' : 'none';
    }

    tagsList.innerHTML = tagKeys.map(key => {
        const { display, count } = tagCounts[key];
        const isActive = currentTagFilter && currentTagFilter.toLowerCase() === key;
        return `
            <button type="button" class="sidebar-tag-btn ${isActive ? 'active' : ''}" data-tag="${escapeHtml(display)}" title="Filter tasks by #${escapeHtml(display)}">
                <span class="nav-btn-content">
                    <span class="sidebar-tag-hash">#</span>
                    <span>${escapeHtml(display)}</span>
                </span>
                <span class="nav-badge">${count}</span>
            </button>
        `;
    }).join('');

    tagsList.querySelectorAll('.sidebar-tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            toggleTagFilter(btn.dataset.tag);
        });
    });
}

// Delete all completed tasks
async function deleteAllCompleted() {
    const confirmed = await showWarning('Delete ALL completed tasks? This cannot be undone.');
    if (!confirmed) return;

    try {
        const response = await fetch('/api/completed', {
            method: 'DELETE'
        });

        if (response.ok) {
            loadTasks();
        } else {
            await showWarning('Failed to delete completed tasks');
        }
    } catch (error) {
        console.error('Error:', error);
        await showWarning('Error deleting completed tasks');
    }
}

// Close modal when clicking outside
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

scopeModal.addEventListener('click', (e) => {
    if (e.target === scopeModal) {
        closeScopeModal();
    }
});

