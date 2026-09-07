import os
import sqlite3
import json
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from werkzeug.security import generate_password_hash, check_password_hash

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:////app/data/tasks.db')
IS_POSTGRESQL = DATABASE_URL.startswith('postgresql://')
DB_PATH = Path("/app/data/tasks.db") if not IS_POSTGRESQL else None

if IS_POSTGRESQL:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    import psycopg2.pool

def get_connection():
    """Get database connection"""
    if IS_POSTGRESQL:
        # For PostgreSQL
        try:
            conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
            return conn
        except Exception as e:
            print(f"PostgreSQL connection error: {e}")
            raise
    else:
        # For SQLite
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        return conn

def dict_from_row(row):
    """Convert row to dictionary"""
    if IS_POSTGRESQL:
        return dict(row)
    else:
        return dict(row) if row else {}

def init_db():
    """Initialize database schema"""
    conn = get_connection()
    c = conn.cursor()
    
    if IS_POSTGRESQL:
        c.execute('''CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        c.execute('''CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                due_date TIMESTAMP,
                completed INTEGER DEFAULT 0,
                completed_date TIMESTAMP,
                recurring VARCHAR(50),
                recurring_interval VARCHAR(50),
                recurring_end_date TIMESTAMP,
                parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
                tags TEXT,
                created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        c.execute('''CREATE TABLE IF NOT EXISTS recurring_history (
                id SERIAL PRIMARY KEY,
                task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                occurrence_date TIMESTAMP NOT NULL,
                instance_id INTEGER NOT NULL
            )
        ''')
    else:
        c.execute('''CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        c.execute('''CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                due_date TIMESTAMP,
                completed INTEGER DEFAULT 0,
                completed_date TIMESTAMP,
                recurring TEXT,
                recurring_interval TEXT,
                recurring_end_date TIMESTAMP,
                parent_task_id INTEGER,
                tags TEXT,
                created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
            )
        ''')
        
        c.execute('''CREATE TABLE IF NOT EXISTS recurring_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                occurrence_date TIMESTAMP NOT NULL,
                instance_id INTEGER NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            )
        ''')
    
    conn.commit()
    c.close()
    conn.close()

def _parse_interval(interval_str):
    """Parse interval string and return timedelta kwargs"""
    if not interval_str:
        return {'days': 1}
    
    # Standard intervals
    standard_map = {
        'daily': {'days': 1},
        'weekly': {'days': 7},
        'monthly': {'days': 30},
        'yearly': {'days': 365}
    }
    
    if interval_str in standard_map:
        return standard_map[interval_str]
    
    # Custom intervals (format: "number_unit", e.g., "3_weeks", "2_months")
    if '_' in interval_str:
        parts = interval_str.split('_')
        if len(parts) == 2:
            try:
                number = int(parts[0])
                unit = parts[1].lower()
                
                unit_map = {
                    'day': 'days',
                    'days': 'days',
                    'week': 'weeks',
                    'weeks': 'weeks',
                    'month': 'days',  # Approximate
                    'months': 'days',  # Approximate
                    'year': 'days',  # Approximate
                    'years': 'days'  # Approximate
                }
                
                if unit not in unit_map:
                    return {'days': 1}
                
                mapped_unit = unit_map[unit]
                
                if unit in ['month', 'months']:
                    # Approximate month as 30 days
                    return {'days': number * 30}
                elif unit in ['year', 'years']:
                    # Approximate year as 365 days
                    return {'days': number * 365}
                else:
                    return {mapped_unit: number}
            except (ValueError, IndexError):
                return {'days': 1}
    
    return {'days': 1}

def create_task(user_id, title, description, due_date=None, recurring=None, recurring_interval=None, recurring_end_date=None, parent_task_id=None, tags=None):
    """Create a new task"""
    conn = get_connection()
    c = conn.cursor()
    
    if IS_POSTGRESQL:
        c.execute('''
            INSERT INTO tasks (user_id, title, description, due_date, recurring, recurring_interval, recurring_end_date, parent_task_id, tags)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (user_id, title, description, due_date, recurring, recurring_interval, recurring_end_date, parent_task_id, tags))
        task_id = c.fetchone()['id']
    else:
        c.execute('''
            INSERT INTO tasks (user_id, title, description, due_date, recurring, recurring_interval, recurring_end_date, parent_task_id, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, title, description, due_date, recurring, recurring_interval, recurring_end_date, parent_task_id, tags))
        task_id = c.lastrowid
    
    conn.commit()
    c.close()
    conn.close()
    
    return task_id

def get_tasks(user_id, include_past=False):
    """Get active tasks for a specific user, optionally including past tasks"""
    return get_tasks_by_user(user_id, include_past)

def get_task(task_id, user_id):
    """Get a single task for a specific user"""
    return get_task_by_user(task_id, user_id)

def update_task(task_id, user_id, title=None, description=None, due_date=None, scope='this_only', tags=None):
    """Update a task for a specific user. scope can be 'this_only' or 'all_following'"""
    conn = get_connection()
    c = conn.cursor()
    
    task = get_task_by_user(task_id, user_id)
    if not task:
        conn.close()
        return
    
    updates = []
    params = []
    
    if title is not None:
        if IS_POSTGRESQL:
            updates.append("title = %s")
        else:
            updates.append("title = ?")
        params.append(title)
    if description is not None:
        if IS_POSTGRESQL:
            updates.append("description = %s")
        else:
            updates.append("description = ?")
        params.append(description)
    if due_date is not None:
        if IS_POSTGRESQL:
            updates.append("due_date = %s")
        else:
            updates.append("due_date = ?")
        params.append(due_date)
    if tags is not None:
        if IS_POSTGRESQL:
            updates.append("tags = %s")
        else:
            updates.append("tags = ?")
        params.append(tags)
    
    if updates:
        if IS_POSTGRESQL:
            updates.append("updated_date = CURRENT_TIMESTAMP")
            params.append(task_id)
            params.append(user_id)
            query = f"UPDATE tasks SET {', '.join(updates)} WHERE {'id >= %s' if scope == 'all_following' else 'id = %s'} AND user_id = %s"
        else:
            updates.append("updated_date = CURRENT_TIMESTAMP")
            params.append(task_id)
            params.append(user_id)
            query = f"UPDATE tasks SET {', '.join(updates)} WHERE {'id >= ?' if scope == 'all_following' else 'id = ?'} AND user_id = ?"
        
        c.execute(query, params)
        conn.commit()
    
    c.close()
    conn.close()

def complete_task(task_id, user_id):
    """Mark a task as complete for a specific user"""
    conn = get_connection()
    c = conn.cursor()
    
    task = get_task_by_user(task_id, user_id)
    if not task:
        conn.close()
        return
    
    if task.get('recurring'):
        # Create next recurring instance
        _create_next_recurring_instance(task_id, task, user_id)
    
    if IS_POSTGRESQL:
        c.execute('''
            UPDATE tasks 
            SET completed = 1, completed_date = CURRENT_TIMESTAMP
            WHERE id = %s AND user_id = %s
        ''', (task_id, user_id))
    else:
        c.execute('''
            UPDATE tasks 
            SET completed = 1, completed_date = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
        ''', (task_id, user_id))
    
    conn.commit()
    c.close()
    conn.close()

def _create_next_recurring_instance(task_id, task, user_id):
    """Create next instance of recurring task"""
    conn = get_connection()
    c = conn.cursor()
    
    if task['recurring_end_date'] and datetime.fromisoformat(task['recurring_end_date']) < datetime.now():
        c.close()
        conn.close()
        return
    
    # Calculate next due date
    if task['due_date']:
        current_due = datetime.fromisoformat(task['due_date'])
    else:
        current_due = datetime.now()
    
    interval = _parse_interval(task['recurring_interval'])
    next_due = current_due + timedelta(**interval)
    
    # Create new instance
    if IS_POSTGRESQL:
        c.execute('''
            INSERT INTO tasks (user_id, title, description, due_date, recurring, recurring_interval, recurring_end_date, parent_task_id, tags)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            user_id,
            task['title'],
            task['description'],
            next_due.isoformat(),
            task['recurring'],
            task['recurring_interval'],
            task['recurring_end_date'],
            task.get('parent_task_id') or task_id,
            task.get('tags')
        ))
        new_task_id = c.fetchone()[0]
    else:
        c.execute('''
            INSERT INTO tasks (user_id, title, description, due_date, recurring, recurring_interval, recurring_end_date, parent_task_id, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id,
            task['title'],
            task['description'],
            next_due.isoformat(),
            task['recurring'],
            task['recurring_interval'],
            task['recurring_end_date'],
            task.get('parent_task_id') or task_id,
            task.get('tags')
        ))
        new_task_id = c.lastrowid
    
    # Record in history
    if IS_POSTGRESQL:
        c.execute('''
            INSERT INTO recurring_history (task_id, occurrence_date, instance_id)
            VALUES (%s, %s, %s)
        ''', (task_id, datetime.now().isoformat(), new_task_id))
    else:
        c.execute('''
            INSERT INTO recurring_history (task_id, occurrence_date, instance_id)
            VALUES (?, ?, ?)
        ''', (task_id, datetime.now().isoformat(), new_task_id))
    
    conn.commit()
    c.close()
    conn.close()

def reopen_task(task_id, user_id):
    """Reopen a completed task for a specific user"""
    conn = get_connection()
    c = conn.cursor()
    
    if IS_POSTGRESQL:
        c.execute('''
            UPDATE tasks 
            SET completed = 0, completed_date = NULL
            WHERE id = %s AND user_id = %s
        ''', (task_id, user_id))
    else:
        c.execute('''
            UPDATE tasks 
            SET completed = 0, completed_date = NULL
            WHERE id = ? AND user_id = ?
        ''', (task_id, user_id))
    
    conn.commit()
    c.close()
    conn.close()

def delete_task(task_id, user_id, scope='this_only'):
    """Delete a task for a specific user. scope can be 'this_only' or 'all_following'"""
    conn = get_connection()
    c = conn.cursor()
    
    if scope == 'all_following':
        # Delete this task and all tasks with higher IDs (future instances) for this user
        if IS_POSTGRESQL:
            c.execute('DELETE FROM tasks WHERE id >= %s AND user_id = %s', (task_id, user_id))
            c.execute('DELETE FROM recurring_history WHERE instance_id >= %s', (task_id,))
        else:
            c.execute('DELETE FROM tasks WHERE id >= ? AND user_id = ?', (task_id, user_id))
            c.execute('DELETE FROM recurring_history WHERE instance_id >= ?', (task_id,))
    else:
        # Delete only this task
        if IS_POSTGRESQL:
            c.execute('DELETE FROM tasks WHERE id = %s AND user_id = %s', (task_id, user_id))
            c.execute('DELETE FROM recurring_history WHERE task_id = %s OR instance_id = %s', (task_id, task_id))
        else:
            c.execute('DELETE FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id))
            c.execute('DELETE FROM recurring_history WHERE task_id = ? OR instance_id = ?', (task_id, task_id))
    
    conn.commit()
    c.close()
    conn.close()

def get_completed_tasks(user_id):
    """Get all completed tasks for a specific user"""
    conn = get_connection()
    c = conn.cursor()
    
    if IS_POSTGRESQL:
        c.execute('SELECT * FROM tasks WHERE completed = 1 AND user_id = %s ORDER BY completed_date DESC', (user_id,))
    else:
        c.execute('SELECT * FROM tasks WHERE completed = 1 AND user_id = ? ORDER BY completed_date DESC', (user_id,))
    
    if IS_POSTGRESQL:
        tasks = [dict(row) for row in c.fetchall()]
    else:
        tasks = [dict_from_row(row) for row in c.fetchall()]
    
    c.close()
    conn.close()
    
    return tasks

def delete_all_completed(user_id):
    """Delete all completed tasks for a specific user"""
    conn = get_connection()
    c = conn.cursor()
    
    if IS_POSTGRESQL:
        c.execute('DELETE FROM tasks WHERE completed = 1 AND user_id = %s', (user_id,))
    else:
        c.execute('DELETE FROM tasks WHERE completed = 1 AND user_id = ?', (user_id,))
    
    conn.commit()
    c.close()
    conn.close()

def is_recurring_instance(task_id, user_id):
    """Check if a task is an instance of a recurring task for a specific user"""
    conn = get_connection()
    c = conn.cursor()
    
    if IS_POSTGRESQL:
        c.execute('SELECT parent_task_id FROM tasks WHERE id = %s AND user_id = %s', (task_id, user_id))
    else:
        c.execute('SELECT parent_task_id FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id))
    
    row = c.fetchone()
    c.close()
    conn.close()
    
    return row and row[0] is not None

def get_parent_recurring_task(task_id, user_id):
    """Get the parent recurring task for a specific user"""
    conn = get_connection()
    c = conn.cursor()
    
    if IS_POSTGRESQL:
        c.execute('SELECT parent_task_id FROM tasks WHERE id = %s AND user_id = %s', (task_id, user_id))
    else:
        c.execute('SELECT parent_task_id FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id))
    
    row = c.fetchone()
    c.close()
    conn.close()
    
    if row and row[0]:
        return get_task_by_user(row[0], user_id)
    return None

def get_recurring_instances(task_id, user_id):
    """Get all instances of a recurring task for a specific user"""
    conn = get_connection()
    c = conn.cursor()
    
    if IS_POSTGRESQL:
        c.execute('''
            SELECT * FROM tasks 
            WHERE user_id = %s AND (id = %s OR id IN (
                SELECT instance_id FROM recurring_history WHERE task_id = %s
            ))
            ORDER BY due_date ASC
        ''', (user_id, task_id, task_id))
    else:
        c.execute('''
            SELECT * FROM tasks 
            WHERE user_id = ? AND (id = ? OR id IN (
                SELECT instance_id FROM recurring_history WHERE task_id = ?
            ))
            ORDER BY due_date ASC
        ''', (user_id, task_id, task_id))
    
    if IS_POSTGRESQL:
        tasks = [dict(row) for row in c.fetchall()]
    else:
        tasks = [dict_from_row(row) for row in c.fetchall()]
    
    c.close()
    conn.close()
    
    return tasks


def get_user(username):
    """Get a user by username"""
    conn = get_connection()
    c = conn.cursor()
    
    if IS_POSTGRESQL:
        c.execute('SELECT * FROM users WHERE username = %s', (username,))
    else:
        c.execute('SELECT * FROM users WHERE username = ?', (username,))
    
    row = c.fetchone()
    result = dict_from_row(row) if row else None
    
    c.close()
    conn.close()
    return result


def get_user_by_email(email):
    """Get a user by email"""
    conn = get_connection()
    c = conn.cursor()
    
    if IS_POSTGRESQL:
        c.execute('SELECT * FROM users WHERE email = %s', (email,))
    else:
        c.execute('SELECT * FROM users WHERE email = ?', (email,))
    
    row = c.fetchone()
    result = dict_from_row(row) if row else None
    
    c.close()
    conn.close()
    return result


def create_user(username, email, password):
    """Create a new user. Returns user dict or None if username/email exists."""
    conn = get_connection()
    c = conn.cursor()
    
    # Check if username or email already exists
    if IS_POSTGRESQL:
        c.execute('SELECT id FROM users WHERE username = %s OR email = %s', (username, email))
    else:
        c.execute('SELECT id FROM users WHERE username = ? OR email = ?', (username, email))
    
    if c.fetchone():
        c.close()
        conn.close()
        return None
    
    # Create user
    password_hash = generate_password_hash(password)
    
    if IS_POSTGRESQL:
        c.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s) RETURNING id, username, email',
            (username, email, password_hash)
        )
        row = c.fetchone()
        user_id = row[0]
        username = row[1]
        email = row[2]
    else:
        c.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            (username, email, password_hash)
        )
        user_id = c.lastrowid
        username = username
        email = email
    
    conn.commit()
    c.close()
    conn.close()
    
    return {'id': user_id, 'username': username, 'email': email}


def authenticate_user(username, password):
    """Authenticate a user and return user dict if valid"""
    user = get_user(username)
    if user and check_password_hash(user['password_hash'], password):
        return user
    return None


def get_tasks_by_user(user_id, include_past=False):
    """Get tasks for a specific user"""
    conn = get_connection()
    c = conn.cursor()
    
    if include_past:
        if IS_POSTGRESQL:
            c.execute('SELECT * FROM tasks WHERE user_id = %s ORDER BY due_date ASC, created_date DESC', (user_id,))
        else:
            c.execute('SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC, created_date DESC', (user_id,))
    else:
        if IS_POSTGRESQL:
            c.execute('''
                SELECT * FROM tasks 
                WHERE user_id = %s AND (completed = 0 OR completed_date > NOW() - INTERVAL '7 days')
                ORDER BY due_date ASC, created_date DESC
            ''', (user_id,))
        else:
            c.execute('''
                SELECT * FROM tasks 
                WHERE user_id = ? AND (completed = 0 OR completed_date > datetime('now', '-7 days'))
                ORDER BY due_date ASC, created_date DESC
            ''', (user_id,))
    
    if IS_POSTGRESQL:
        tasks = [dict(row) for row in c.fetchall()]
    else:
        tasks = [dict_from_row(row) for row in c.fetchall()]
    
    c.close()
    conn.close()
    return tasks


def get_task_by_user(task_id, user_id):
    """Get a single task for a specific user"""
    conn = get_connection()
    c = conn.cursor()
    
    if IS_POSTGRESQL:
        c.execute('SELECT * FROM tasks WHERE id = %s AND user_id = %s', (task_id, user_id))
    else:
        c.execute('SELECT * FROM tasks WHERE id = ? AND user_id = ?', (task_id, user_id))
    
    row = c.fetchone()
    task = dict_from_row(row) if row else {}
    
    c.close()
    conn.close()
    return task
