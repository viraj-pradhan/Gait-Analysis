# 🚀 Deploying Underwater Gait Analysis to Render.com

This repository is pre-configured for automatic deployment on [Render.com](https://render.com) using the included `render.yaml` Blueprint specification.

---

## 📋 Quick Step-by-Step Deployment (2 Minutes)

### Step 1: Push Repository to GitHub
Ensure all code is pushed to your GitHub repository (`https://github.com/viraj-pradhan/Gait-Analysis` or your fork):
```bash
git add -A
git commit -m "Configure Render deployment"
git push -u origin main
```

---

### Step 2: Connect to Render.com Blueprint
1. Log in to [https://dashboard.render.com/](https://dashboard.render.com/).
2. Click the **New +** button in the top right corner.
3. Select **Blueprint**.
4. Connect your GitHub account and choose the repository: **`Gait-Analysis`**.

---

### Step 3: Configure Environment Variables
Render will automatically detect `render.yaml` and prompt you for required variables:
- **`MONGODB_URI`**: Paste your MongoDB connection string (e.g., from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free tier cluster):
  ```
  mongodb+srv://<username>:<password>@cluster0.mongodb.net/gait_analysis?retryWrites=true&w=majority
  ```

---

### Step 4: Click Apply
Click **Apply Blueprint**. Render will build and deploy both services automatically:

1. **`gait-analysis-backend`** (Python/FastAPI Service):
   - Handles MediaPipe pose processing, step detection, and REST APIs.
2. **`gait-analysis-frontend`** (Next.js Node Service):
   - Modern clinical web dashboard connected automatically to the backend.

---

## 🛠️ Manual Deployment Settings (If Not Using Blueprint)

If you prefer deploying services manually on Render:

### Backend Service (Web Service):
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn fastapi_app.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `MONGODB_URI`: `mongodb+srv://...`
  - `DB_NAME`: `gait_analysis`
  - `ALLOWED_ORIGINS`: `https://your-frontend.onrender.com`

### Frontend Service (Web Service):
- **Runtime**: `Node`
- **Build Command**: `cd frontend && npm install && npm run build`
- **Start Command**: `cd frontend && npm start`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: `https://your-backend.onrender.com`
