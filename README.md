<div align="center">
  <h1>⚙️ SalonBook - Backend Server</h1>
  <p>A robust, secure, and scalable REST API for the SalonBook platform.</p>
  
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
  [![Stripe](https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=Stripe&logoColor=white)](https://stripe.com/)
</div>

---

## 📖 Project Overview
This repository contains the backend REST API for **SalonBook**. It handles core business logic, database management, secure JWT authentication, role-based access control, Stripe payment verification, and image uploads.

### 🔗 Important Links
- **Server API URL:** [https://your-server-link.onrender.com](https://your-server-link.onrender.com)
- **Client Repository:** [https://github.com/your-username/salonbook-client](https://github.com/your-username/salonbook-client)

---

## ✨ Key Features & API Endpoints

### 🔐 Security & Authentication
- **JWT Verification:** Custom middleware (`verifyToken`) using **jose** to validate Better Auth JWT tokens via the JWKS endpoint.
- **Admin Role Verification:** `verifyAdmin` middleware ensures that only users with the `admin` role can access admin-specific routes.

### 🛠️ API Modules
| Module | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `GET` | `/users` | Fetch all users (Admin only) |
| **Services** | `GET` | `/services` | Fetch active salon services (Public) |
| | `POST` | `/services` | Create a new service (Admin only) |
| | `PATCH` | `/services/:id` | Update service details (Admin only) |
| | `DELETE` | `/services/:id` | Delete a service (Admin only) |
| **Appointments** | `POST` | `/appointments` | Book a new appointment (Protected) |
| | `GET` | `/appointments` | Get customer's own appointments |
| | `PATCH` | `/appointments/:id` | Cancel an appointment (Protected) |
| **Admin** | `GET` | `/admin/appointments` | View all appointment requests (Admin) |
| | `PATCH` | `/admin/appointments/:id`| Confirm or Cancel an appointment |
| | `GET` | `/admin/transactions` | View all payment transactions (Admin) |
| **Payments** | `POST` | `/payments-verify` | Verify Stripe session and update status |
| **Uploads** | `POST` | `/upload` | Upload images to ImgBB and return URL |

---

## 🛠️ Technology Stack
- **Runtime Environment:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB 
- **Authentication:** Better Auth & Jose (JWT)
- **Payments:** Stripe API
- **Image Hosting:** ImgBB API

---

## 🚀 Getting Started (Local Setup)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/salonbook-server.git
cd salonbook-server