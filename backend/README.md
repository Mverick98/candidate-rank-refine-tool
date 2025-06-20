
# Resume Comparison Backend

FastAPI backend for the resume comparison application.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit `http://localhost:8000/docs` for interactive API documentation.

## Database

The application uses SQLite for local development. The database file `comparison.db` will be created automatically.

## Environment Variables

- `SECRET_KEY`: JWT secret key (default: "your-secret-key-here")

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/comparison/request-jd` - Request new JD comparison
- `POST /api/comparison/submit-feedback` - Submit comparison feedback
- `POST /api/comparison/submit-equal` - Submit equal candidates feedback
- `POST /api/comparison/submit-bad` - Submit bad candidates feedback
- `GET /api/comparison/session-results` - Get session results
