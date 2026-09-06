# taskich - Multi-user Task Management

A lightweight, self-hosted multi-user task management application built with Python Flask. Perfect for personal or small team collaboration with Google Tasks-style features.

## Features

✨ **User Authentication**
- User accounts with username/email authentication
- Secure password hashing (Werkzeug)
- Session-based authentication with configurable lifetime
- Optional signup controls via environment variable

📋 **Task Management**
- Create, edit, and delete tasks per user
- Rich descriptions and titles
- Due dates and timestamps
- Mark tasks as complete/incomplete
- Separate completed tasks view
- Bulk deletion of completed tasks

🔄 **Recurring Tasks**
- Daily, weekly, monthly, and yearly recurrence patterns
- Custom intervals (e.g., "3_weeks", "2_months")
- Automatic instance generation on completion
- Optional end dates for recurring series
- Track recurring instances with parent relationships
- Scope updates to this task or all future instances

🏷️ **Tags & Organization**
- Tag-based organization per task
- User-scoped data isolation

⏰ **Smart Views**
- Active tasks (recent incomplete)
- All tasks view
- Completed tasks view
- Due date sorting and grouping

## Quick Start

### Using Docker Compose

```bash
cd taskich
docker-compose up -d
```

By default, uses SQLite with user accounts enabled. Access at `http://localhost:5000`

**First-time setup:**
```bash
# Generate a secure secret key (required for sessions)
export SECRET_KEY=$(openssl rand -hex 32)

# Or add to compose.yaml environment section:
# - SECRET_KEY=your-secure-key-here
```

### PostgreSQL Setup (Optional)

Enable the PostgreSQL service in `compose.yaml` and configure:

```yaml
environment:
  - DATABASE_URL=postgresql://taskich:taskich_password@postgres:5432/taskich
  - ALLOW_SIGNUPS=true  # Enable signups or disable via 'false'
```

Restart with: `docker-compose up -d`

### Manual Setup

**Requirements:**
- Python 3.11+
- Flask 2.3.3
- Werkzeug 2.3.7
- psycopg2-binary (for PostgreSQL)

**Installation:**

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export SECRET_KEY=$(openssl rand -hex 32)
export ALLOW_SIGNUPS=true

# For SQLite (default):
export DATABASE_URL="sqlite:////app/data/tasks.db"

# Or for PostgreSQL:
# export DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Initialize database and run
python app.py
```

Access at `http://localhost:5000`

## API Endpoints

All task endpoints require authentication. Include credentials in session or use the login flow.

### Authentication

- `POST /api/auth/login` - Login with username/password
- `POST /api/auth/signup` - Create new user (controlled by ALLOW_SIGNUPS)
- `POST /api/auth/logout` - Log out current user
- `GET /api/auth/status` - Check authentication status

### Tasks

- `GET /api/tasks` - Get active tasks (`?include_past=true` for all tasks)
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/<id>` - Get specific task
- `PUT /api/tasks/<id>` - Update task (`scope`: 'this_only' or 'all_following')
- `DELETE /api/tasks/<id>` - Delete task (`scope`: 'this_only' or 'all_following')
- `POST /api/tasks/<id>/complete` - Mark as complete (triggers recurring instance)
- `POST /api/tasks/<id>/reopen` - Reopen completed task
- `GET /api/tasks/<id>/recurring` - Get all instances of recurring task
- `GET /api/tasks/<id>/is-recurring-instance` - Check if task is an instance
- `GET /api/tasks/<id>/parent` - Get parent task of recurring instance

### Health
- `GET /health` - Health check endpoint

## Database Schema

**users table**
- `id`: Primary key
- `username`: Unique username
- `email`: Unique email address
- `password_hash`: Bcrypt password hash
- `created_date`: Account creation timestamp

**tasks table**
- `id`: Primary key (also used for instance ordering)
- `user_id`: Foreign key to users (multi-user isolation)
- `title`: Task title (required)
- `description`: Task description
- `due_date`: Due date/time
- `completed`: Completion status (0 or 1)
- `completed_date`: When task was completed
- `recurring`: Recurring indicator
- `recurring_interval`: Recurrence pattern (daily, weekly, monthly, yearly)
- `recurring_end_date`: When recurring series ends
- `parent_task_id`: Parent task for recurring instances
- `tags`: Tag list as JSON string or NULL
- `created_date`: Task creation timestamp
- `updated_date`: Last modification timestamp

**recurring_history table**
- Tracks occurrences of recurring tasks
- Links parent tasks to generated instances
- Stores occurrence dates and instance IDs

## Development

### Database Options

- **SQLite** (default): Stored in `/app/data/tasks.db` - simple, file-based
- **PostgreSQL**: External database for larger deployments

### Project Structure

```
taskich/
├── Dockerfile           # Alpine 3.19-based minimal image (~150MB)
├── compose.yaml         # Docker Compose with PostgreSQL support
├── requirements.txt     # Python dependencies (Flask, psycopg2-binary)
├── app.py              # Flask application with authentication & API routes
├── database.py         # Database models, multi-user isolation, CRUD operations
├── templates/
│   ├── index.html      # Main task list view
│   └── login.html      # Login/Signup page
└── static/
    ├── style.css       # CSS styling (~34KB)
    └── script.js       # Frontend JavaScript (~32KB)
```

### Environment Variables

- `SECRET_KEY`: Flask session secret key (generate with `openssl rand -hex 32`)
- `ALLOW_SIGNUPS`: Enable/disable user registration (true/false)
- `SESSION_LIFETIME_DAYS`: Session duration in days (default: 365)
- `DATABASE_URL`: Database connection string (SQLite or PostgreSQL)

## Deployment

### Docker Compose (Recommended)

```bash
docker-compose up -d
```

**Volumes:**
- `taskich_data`: Persistent storage for SQLite database
- PostgreSQL volume (optional, commented in compose.yaml)

### Image Details

- **Base**: `python:3.11-alpine` with GCC/musl-dev for compilation
- **Size**: ~150MB (minimal dependencies only)
- **Health Checks**: Built-in 30s interval monitoring
- **Auto-restart**: `restart: unless-stopped` in Docker Compose

**Built for homelabs!** 🏠⚙️
