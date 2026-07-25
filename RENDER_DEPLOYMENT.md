# 🚀 Single-Service Render.com Deployment Guide

This project is configured as a **Single Unified Web Service** that runs both the **FastAPI Backend** and **Next.js Frontend** together on a single Render service with **one URL** and **zero CORS setup needed**.

---

## ⚡ Quick Deployment Instructions (Single Web Service)

### Step 1: Push Code to GitHub
Ensure your code is pushed to your GitHub repository ([https://github.com/viraj-pradhan/Gait-Analysis](https://github.com/viraj-pradhan/Gait-Analysis)):
```bash
git add -A
git commit -m "Single-service Render Docker deployment setup"
git push -u origin main
```

---

### Step 2: Create Service on Render.com
1. Go to [https://dashboard.render.com/](https://dashboard.render.com/).
2. Click **New +** -> **Web Service** (or **Blueprint**).
3. Connect your repository: **`Gait-Analysis`**.

---

### Step 3: Deployment Settings (Single Service)
- **Environment / Runtime**: `Docker` (Render automatically uses the included `Dockerfile`)
- **Region**: Any (e.g., Singapore or US East)
- **Instance Type**: `Free`

#### Environment Variables:
Add the following under **Environment Variables**:
- **`MONGODB_URI`**: Your MongoDB connection string (e.g. from MongoDB Atlas):
  ```
  mongodb+srv://<user>:<password>@cluster.mongodb.net/gait_analysis?retryWrites=true&w=majority
  ```
- **`DB_NAME`**: `gait_analysis`
- **`JWT_SECRET`**: Any secret key string

---

### Step 4: Click Deploy!
Render will build the Docker container and start your single-service app.
You will get **ONE single URL** (e.g. `https://gait-analysis.onrender.com`) containing the full application!
