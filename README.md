# taskich - Google Tasks Clone

A lightweight, self-hosted Google Tasks clone built with Python Flask and Alpine Linux. Perfect for your personal task management needs.

## Features

✨ **Core Features**
- Create, edit, and delete tasks
- Add descriptions to tasks
- Set due dates and times
- Mark tasks as complete
- View completed tasks
- Simple, intuitive interface

🔄 **Recurring Tasks**
- Daily, weekly, monthly, and yearly recurrence patterns
- Automatically generates next occurrence when task is completed
- Optional end dates for recurring tasks
- Track recurring task instances

⏰ **Smart Filtering**
- Active tasks view (incomplete tasks)
- All tasks view (all tasks)
- Completed tasks view
- Overdue task indicators
- Due date grouping

📱 **User Experience**
- Responsive design (desktop and mobile)
- Real-time task updates
- Task count indicators
- Quick edit and delete actions
- Modal-based task editor

## Quick Start

### Using Docker Compose

```bash
cd taskich
docker-compose up -d
```

Access the application at `http://localhost:5000`

### Manual Setup

**Requirements:**
- Python 3.11+
- Flask 2.3.3

**Installation:**

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
```

Access at `http://localhost:5000`

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks (with `?include_past=true` for archived)
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/<id>` - Get specific task
- `PUT /api/tasks/<id>` - Update task
- `DELETE /api/tasks/<id>` - Delete task
- `POST /api/tasks/<id>/complete` - Mark as complete
- `POST /api/tasks/<id>/reopen` - Reopen completed task
- `GET /api/tasks/<id>/recurring` - Get all instances of recurring task

### Health
- `GET /health` - Health check endpoint

## Database Schema

**tasks table**
- `id`: Primary key
- `title`: Task title (required)
- `description`: Task description
- `due_date`: Due date/time
- `completed`: Completion status (0 or 1)
- `completed_date`: When task was completed
- `recurring`: Recurring indicator
- `recurring_interval`: Recurrence pattern (daily, weekly, monthly, yearly)
- `recurring_end_date`: When recurring task ends
- `created_date`: Creation timestamp
- `updated_date`: Last modification timestamp

**recurring_history table**
- Tracks instances of recurring tasks
- Links parent tasks to generated instances

## Development

The application uses SQLite for data persistence (stored in `/app/data/tasks.db`).

### Project Structure

```
taskich/
├── Dockerfile           # Alpine-based Docker image
├── compose.yaml         # Docker Compose configuration
├── requirements.txt     # Python dependencies
├── app.py              # Flask application & API
├── database.py         # Database models & operations
├── templates/
│   └── index.html      # Frontend HTML
└── static/
    ├── style.css       # CSS styling
    └── script.js       # Frontend JavaScript
```

## Configuration

- **Port**: 5000 (configurable in compose.yaml)
- **Database**: SQLite in `/app/data/tasks.db`
- **Data Persistence**: Volume-mounted in Docker

## Image Details

- **Base Image**: `python:3.11-alpine` (~150MB)
- **Minimal Dependencies**: Only Flask and python-dateutil
- **Health Checks**: Built-in container health monitoring
- **Auto-restart**: Configured in Docker Compose

## License

MIT License - Feel free to use, modify, and distribute

---

**Created for your homelab!** 🏠⚙️
