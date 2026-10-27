# Cafe Corazon - Setup & Local Launch Guide

This guide provides step-by-step instructions on how to start and view the Cafe Corazon Coffee Shop web application locally.

---

## 📋 Prerequisites

Before running the application, ensure the following are installed and running:

1. **WAMP Server (or MySQL Server)**
   - Start **WAMP Server** and ensure the MySQL service is active (green tray icon).
   - Database Host: `127.0.0.1`

2. **Node.js**
   - Ensure Node.js (v18+) is installed on your Windows system.

---

## 🚀 Step-by-Step Launch Instructions

### Step 1: Start the Backend API Server

1. Open **PowerShell** or **Command Prompt**.
2. Navigate to the `api` folder:
   ```powershell
   cd d:\wamp64\www\coffeeshop\coffeeshop\api
   ```
3. *(First time only)* Install backend dependencies:
   ```powershell
   npm install
   ```
4. Start the backend development server:
   ```powershell
   npm run dev
   ```
   > ℹ️ The backend will start on **`http://localhost:5000/api`**. Keep this terminal open.

---

### Step 2: Start the Frontend Application

1. Open a **second** PowerShell or Command Prompt window.
2. Navigate to the `project` folder:
   ```powershell
   cd d:\wamp64\www\coffeeshop\coffeeshop\project
   ```
3. *(First time only)* Install frontend dependencies:
   ```powershell
   npm install
   ```
4. Start the Vite development server:
   ```powershell
   npm run dev
   ```
   > ℹ️ Vite will spin up the local development server (typically at **`http://localhost:5173`**). Keep this terminal open.

---

### Step 3: Open in Your Browser

1. Open your web browser (Chrome, Edge, Firefox, Brave, etc.).
2. Navigate to:
   ```text
   http://localhost:5173
   ```

---

## 🔑 Default Credentials & Access

- **Admin Email:** `admin@gmail.com`
- **Admin Password:** `admin123`

---

## 🌐 Production Deployment (Vercel & TiDB Cloud)

- **Production Frontend & API URL:** [https://cafecorazon.vercel.app](https://cafecorazon.vercel.app)
- **Production Health Endpoint:** [https://cafecorazon.vercel.app/api/health](https://cafecorazon.vercel.app/api/health)
- **Database Status:** [https://cafecorazon.vercel.app/api/ping](https://cafecorazon.vercel.app/api/ping) (`{"status":"ok","db":"connected"}`)
- **Vercel Project:** `troy-jayson-s-projects / cafecorazon`
- **Database:** TiDB Cloud Serverless (`Cluster0`, Singapore AWS `ap-southeast-1`)

---

## 🛠️ Summary of Port Configuration & URLs

| Component | Directory | Dev Command | Local / Production URL |
| :--- | :--- | :--- | :--- |
| **Production App** | Full-Stack | Vercel Live | `https://cafecorazon.vercel.app` |
| **Backend API** | `backend/` | `npm run dev` | `http://localhost:5000/api` |
| **Frontend Web App** | `project/` | `npm run dev` | `http://localhost:5173` |

---

## 🔧 Environment File Overview

- **Frontend (`project/.env`)**:
  ```env
  VITE_API_URL=http://localhost:5000/api
  ```
- **Backend (`backend/.env`)**:
  ```env
  PORT=5000
  DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
  DB_PORT=4000
  DB_USER=mE1mQ79jxvi2LmR.root
  DB_PASSWORD=bLkIogYXov7kI0l1
  DB_NAME=corazondb
  DB_SSL=true
  JWT_SECRET=cafe-corazon-jwt-secret-production
  ```
