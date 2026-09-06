from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from functools import wraps
from datetime import datetime, timedelta
import database
import os

app = Flask(__name__, template_folder='templates', static_folder='static')

# Secret key for sessions
app.secret_key = os.getenv('SECRET_KEY', os.urandom(24))

# Permanent session lifetime (default: 365 days for indefinite sessions)
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=int(os.getenv('SESSION_LIFETIME_DAYS', 365)))

# Check if signups are allowed
ALLOW_SIGNUPS = os.getenv('ALLOW_SIGNUPS', 'false').lower() == 'true'

# Initialize database on startup
database.init_db()

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})

@app.route('/')
def index():
    """Main page - redirect to login if not authenticated"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login')
def login():
    """Login/Signup page"""
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('login.html', allow_signups=ALLOW_SIGNUPS)

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """Create a new user"""
    if not ALLOW_SIGNUPS:
        return jsonify({'error': 'Signups are currently disabled'}), 403
    
    data = request.get_json()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    if not username or not email or not password:
        return jsonify({'error': 'All fields are required'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    user = database.create_user(username, email, password)
    if not user:
        return jsonify({'error': 'Username or email already exists'}), 409
    
    # Log the user in with permanent session
    session.permanent = True
    session['user_id'] = user['id']
    session['username'] = user['username']
    
    return jsonify({'id': user['id'], 'username': user['username'], 'email': user['email']}), 201

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    """Log in a user"""
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    user = database.authenticate_user(username, password)
    if not user:
        return jsonify({'error': 'Invalid username or password'}), 401
    
    # Set permanent session
    session.permanent = True
    session['user_id'] = user['id']
    session['username'] = user['username']
    
    return jsonify({'id': user['id'], 'username': user['username'], 'email': user['email']})

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Log out the current user"""
    session.clear()
    return jsonify({'status': 'logged_out'})

@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    """Check authentication status"""
    if 'user_id' in session:
        return jsonify({
            'authenticated': True,
            'username': session.get('username'),
            'user_id': session['user_id']
        })
    return jsonify({'authenticated': False, 'allow_signups': ALLOW_SIGNUPS})

def login_required(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/tasks', methods=['GET'])
@login_required
def get_tasks():
    """Get all tasks for the current user"""
    user_id = session['user_id']
    include_past = request.args.get('include_past', 'false').lower() == 'true'
    tasks = database.get_tasks(user_id, include_past=include_past)
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
@login_required
def create_task():
    """Create a new task for the current user"""
    user_id = session['user_id']
    data = request.get_json()
    
    try:
        task_id = database.create_task(
            user_id=user_id,
            title=data.get('title'),
            description=data.get('description'),
            due_date=data.get('due_date'),
            recurring=data.get('recurring'),
            recurring_interval=data.get('recurring_interval'),
            recurring_end_date=data.get('recurring_end_date'),
            tags=data.get('tags')
        )
        return jsonify({'id': task_id, 'status': 'created'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/tasks/<int:task_id>', methods=['GET'])
@login_required
def get_task(task_id):
    """Get a single task for the current user"""
    user_id = session['user_id']
    task = database.get_task(task_id, user_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify(task)

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@login_required
def update_task(task_id):
    """Update a task for the current user"""
    user_id = session['user_id']
    data = request.get_json()
    scope = data.get('scope', 'this_only')
    
    try:
        database.update_task(
            task_id,
            user_id=user_id,
            title=data.get('title'),
            description=data.get('description'),
            due_date=data.get('due_date'),
            scope=scope,
            tags=data.get('tags')
        )
        return jsonify({'status': 'updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/tasks/<int:task_id>/complete', methods=['POST'])
@login_required
def complete_task(task_id):
    """Mark a task as complete for the current user"""
    user_id = session['user_id']
    try:
        database.complete_task(task_id, user_id)
        return jsonify({'status': 'completed'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/tasks/<int:task_id>/reopen', methods=['POST'])
@login_required
def reopen_task(task_id):
    """Reopen a completed task for the current user"""
    user_id = session['user_id']
    try:
        database.reopen_task(task_id, user_id)
        return jsonify({'status': 'reopened'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    """Delete a task for the current user"""
    user_id = session['user_id']
    scope = request.args.get('scope', 'this_only')
    
    try:
        database.delete_task(task_id, user_id, scope=scope)
        return jsonify({'status': 'deleted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/tasks/<int:task_id>/is-recurring-instance', methods=['GET'])
@login_required
def is_recurring_instance(task_id):
    """Check if a task is a recurring instance for the current user"""
    user_id = session['user_id']
    try:
        is_instance = database.is_recurring_instance(task_id, user_id)
        return jsonify({'is_recurring_instance': is_instance})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/tasks/<int:task_id>/parent', methods=['GET'])
@login_required
def get_parent_recurring_task(task_id):
    """Get the parent recurring task of an instance for the current user"""
    user_id = session['user_id']
    try:
        parent = database.get_parent_recurring_task(task_id, user_id)
        if not parent:
            return jsonify({'error': 'Not a recurring instance'}), 404
        return jsonify(parent)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/tasks/<int:task_id>/recurring', methods=['GET'])
@login_required
def get_recurring_instances(task_id):
    """Get all instances of a recurring task for the current user"""
    user_id = session['user_id']
    try:
        tasks = database.get_recurring_instances(task_id, user_id)
        return jsonify(tasks)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/completed', methods=['GET'])
@login_required
def get_completed_tasks():
    """Get all completed tasks for the current user"""
    user_id = session['user_id']
    try:
        tasks = database.get_completed_tasks(user_id)
        return jsonify(tasks)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/completed', methods=['DELETE'])
@login_required
def delete_all_completed():
    """Delete all completed tasks for the current user"""
    user_id = session['user_id']
    try:
        database.delete_all_completed(user_id)
        return jsonify({'status': 'all_completed_deleted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
