// Global state
let currentFilter = 'active';
let allTasks = [];
let currentEditingTaskId = null;
let pendingAction = null;
let pendingActionData = null;
let warningResolve = null;

// DOM elements
const taskTitleInput = document.getElementById('taskTitle');
const taskDescriptionInput = document.getElementById('taskDescription');
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
                usernameDisplay.textContent = `👤 ${data.username}`;
            }
        }
    } catch (error) {
        console.error('Error loading username:', error);
    }
}

// Dark mode functions
function initializeDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        updateDarkModeToggle(true);
    }
}

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    updateDarkModeToggle(isDarkMode);
}

function updateDarkModeToggle(isDarkMode) {
    darkModeToggle.textContent = isDarkMode ? '☀️ Light' : '🌙 Dark';
}

// Toggle recurring options
function toggleRecurringOptions() {
    const isRecurring = recurringSelect.value !== '';
    const isCustom = recurringSelect.value === 'custom';
    
    recurringEndDateGroup.style.display = isRecurring ? 'grid' : 'none';
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
    const dueDate = dueDateInput.value;
    const recurring = recurringSelect.value || null;
    const recurringInterval = getRecurringInterval();
    const recurringEndDate = recurringUndefinedCheckbox.checked ? null : (recurringEndDateInput.value || null);

    if (!title) {
        await showWarning('Please enter a task title');
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
                recurring_end_date: recurringEndDate
            })
        });

        if (response.ok) {
            taskTitleInput.value = '';
            taskDescriptionInput.value = '';
            dueDateInput.value = '';
            recurringSelect.value = '';
            customRecurringNumber.value = 1;
            customRecurringUnit.value = 'days';
            recurringEndDateInput.value = '';
            recurringUndefinedCheckbox.checked = false;
            recurringEndDateGroup.style.display = 'none';
            customRecurringGroup.style.display = 'none';
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
        renderTasks();
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Filter tasks based on current filter
function getFilteredTasks() {
    let filtered = allTasks;

    if (currentFilter === 'active') {
        filtered = filtered.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(task => task.completed);
    }

    return filtered;
}

// Render tasks list
function renderTasks() {
    const filtered = getFilteredTasks();
    taskCount.textContent = filtered.length;

    // Show delete all completed button only when viewing completed tasks
    if (deleteAllCompletedBtn) {
        deleteAllCompletedBtn.style.display = currentFilter === 'completed' && filtered.length > 0 ? 'block' : 'none';
    }

    if (filtered.length === 0) {
        tasksList.innerHTML = '<div class="empty-state"><p>No tasks yet. Add one to get started! 🚀</p></div>';
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

    let badges = '';
    if (task.recurring) {
        badges += `<span class="task-badge badge-recurring">🔄 ${formatRecurringInterval(task.recurring_interval)}</span>`;
    }
    if (isOverdue) {
        badges += `<span class="task-badge badge-overdue">⚠️ Overdue</span>`;
    }

    // For completed tasks, show a simple delete icon instead of edit/delete buttons
    let actionsHtml = '';
    if (isCompleted) {
        actionsHtml = `
            <div class="task-actions">
                <button class="action-delete-icon" title="Delete completed task">🗑️</button>
            </div>
        `;
    } else {
        actionsHtml = `
            <div class="task-actions">
                <button class="action-edit">Edit</button>
                <button class="action-delete">Delete</button>
            </div>
        `;
    }

    return `
        <div class="task-item ${isCompleted ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}" data-task-id="${task.id}">
            <div class="task-header">
                <div style="display: flex; align-items: center; flex: 1;">
                    <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''}>
                    <div class="task-title">${escapeHtml(task.title)}</div>
                </div>
            </div>
            
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            
            <div class="task-meta">
                ${dueDateStr ? `<div class="task-meta-item">📅 Due: ${dueDateStr}</div>` : ''}
                ${task.created_date ? `<div class="task-meta-item">📝 Created: ${formatDate(new Date(task.created_date))}</div>` : ''}
                ${task.completed && task.completed_date ? `<div class="task-meta-item">✓ Completed: ${formatDate(new Date(task.completed_date))}</div>` : ''}
            </div>
            
            ${badges ? `<div>${badges}</div>` : ''}
            
            ${actionsHtml}
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
    const dueDate = document.getElementById('modalDueDate').value;

    if (!title) {
        await showWarning('Please enter a task title');
        return;
    }

    const updateData = { title, description: description || null, due_date: dueDate || null };
    
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
    const filter = e.target.dataset.filter;
    currentFilter = filter;

    filterBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    // Update title
    const titles = {
        active: '📌 Active Tasks',
        all: '📚 All Tasks',
        completed: '✓ Completed'
    };
    tasksTitle.textContent = titles[filter];

    renderTasks();
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
