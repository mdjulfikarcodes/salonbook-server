
---

### ২️⃣ Backend (Server) - `README.md`

```markdown
<div align="center">
  <h1>⚙️ SalonBook - Server (Backend)</h1>
  <p>A robust Express.js & MongoDB backend for the SalonBook platform, featuring secure JWT authentication and Stripe payment integration.</p>
  
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
</div>

---

## 📖 Project Overview
This repository contains the backend REST API for **SalonBook**. It handles data management, authentication verification, role-based access control, payment verification, and image uploads. 

### 🔗 Important Links
- **Server API URL:** [https://salonbook-server.onrender.com](https://salonbook-server.onrender.com)
- **Frontend Repository:** [https://github.com/your-username/salonbook-client](https://github.com/your-username/salonbook-client)

---

## ✨ Core Features & Endpoints

### 🔐 Authentication & Authorization
- **JWT Verification:** Secure middleware (`verifyToken`) using **jose** to verify Better Auth JWT tokens via the JWKS endpoint.
- **Role-Based Access:** `verifyAdmin` middleware ensures only users with the `admin` role can perform admin actions.

### 🛠️ API Endpoints Overview:
- **Services (`/services`):** 
  - `GET` (All users) - Fetch active services.
  - `POST, PATCH, DELETE` (Admin only) - Manage services.
- **Appointments (`/appointments`):**
  - `POST` (Protected) - Book a new appointment.
  - `GET` (Protected) - Get customer's own appointments.
  - `PATCH` (Protected) - Cancel an appointment.
- **Admin Appointments (`/admin/appointments`):**
  - `GET, PATCH` (Admin only) - View all requests and update status (Confirm/Cancel).
- **Payments (`/payments`):**
  - `POST /payments-verify` - Verifies Stripe sessions and updates appointment payment status to "Paid".
- **Uploads (`/upload`):**
  - `POST` - Uploads images to ImgBB and returns the image URL.

---

## 🛠️ Technology Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Official Native Driver)
- **Authentication:** Better Auth & Jose (JWT)
- **Payments:** Stripe API
- **Image Hosting:** ImgBB API

---

## 🚀 Getting Started

### 1. Prerequisites
Make sure you have Node.js and a MongoDB database (local or Atlas) ready.

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/salonbook-server.git

# Navigate to the project directory
cd salonbook-server

# Install dependencies
npm install