# Coffee Shop API

Express + MySQL backend for Cafe Corazon.

## Setup

1. Start MySQL (WAMP) with user `root` and no password.
2. Import the schema:

```bash
mysql -u root < src/database/schema.sql
```

3. Install and run:

```bash
npm install
npm run dev
```

API base URL: `http://localhost:5000/api`

## Default admin

- Email: `admin@gmail.com`
- Password: `admin123`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET/POST/PUT/DELETE | `/api/users` | User management |
| GET/POST/PUT/DELETE | `/api/products` | Products |
| GET/POST | `/api/orders` | Orders |
| GET/POST | `/api/inventory` | Inventory logs & adjustments |
| GET/POST | `/api/reports` | Sales reports |
