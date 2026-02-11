# wakapadi


## Overview
Wakapadi is a travel-focused social platform that connects travelers nearby, supports both anonymous and registered participation, and provides admin analytics. It is designed for travelers to discover, chat, and interact with others in their vicinity, while also offering robust moderation and feedback tools for administrators.

---

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Setup & Installation](#setup--installation)
- [Usage](#usage)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---


## Features
- **Whois Page:** Discover travelers near your city, with real-time distance calculation using geolocation. Start chats with other users.
- **Anonymous Users:** Join instantly as an anonymous user with a fun, random name (e.g., "Gentle Panda") and device-based identity.
- **Admin Dashboard:** View feedback, reports, blocks, paginated contact-us messages, and the total number of tours.
- **Contact/Feedback:** Send messages or feedback to admins, who can review and respond.
- **User Profiles:** Update travel preferences, languages, social links, and visibility settings.
- **Presence:** See who is online, idle, or offline, with last seen tracking.
- **Geolocation:** Browser-based geolocation and reverse geocoding to detect city and calculate distances.
- **Chat:** Real-time, socket-based chat between users, with emoji reactions, typing indicators, and read receipts.
- **Moderation:** Block or report users, with admin review tools.

---


## Architecture
- **Frontend:** Next.js (React), Material UI, custom hooks, API integration, i18n, and socket.io for real-time chat.
- **Backend:** NestJS, Mongoose (MongoDB), RESTful API, JWT authentication, socket.io for chat, and robust admin endpoints.
- **Anonymous Auth:** Device-based hash, fun random names, and local/session storage for persistence.
- **Geolocation:** Browser API and backend reverse geocoding for city detection and distance calculation.
- **Infrastructure:** Docker Compose for local development, with MongoDB. (Qdrant/embedding service is present but disabled by default.)

---


## Setup & Installation

### Prerequisites
- Node.js (v18+ recommended)
- Docker & Docker Compose (for local development)
- Yarn or npm

### Quickstart (Development)
1. Clone the repository:
	```sh
	git clone https://github.com/your-org/wakapadi.git
	cd wakapadi
	```
2. Copy `.env.example` to `.env` and fill in required secrets (see backend and frontend for details).
3. Start all services with Docker Compose:
	```sh
	docker-compose up --build
	```
	- This will start the backend (NestJS) and MongoDB. The frontend can be started separately:
	```sh
	cd frontend
	npm install
	npm run dev
	```
4. Visit [http://localhost:3000](http://localhost:3000) for the frontend.

---

## Usage
- On first visit, your location is detected and you are shown travelers nearby.
- You can join as an anonymous user or register for more features.
- Start chats, send feedback, or contact admins from the UI.
- Admins can log in to access the dashboard for analytics and moderation.

---

## Development

### Project Structure
- `frontend/` — Next.js app (UI, pages, components, hooks, styles)
- `backend/` — NestJS API (controllers, services, schemas, modules)
- `embed_service/` — (Optional) Python embedding service (disabled by default)
- `docker-compose.yml` — Local dev orchestration

### Key Scripts
- `npm run dev` (frontend/backend): Start in development mode
- `npm run test` (backend): Run backend tests
- `npm run lint` (frontend/backend): Lint code

### Testing
- Backend: `cd backend && npm run test`
- Frontend: Use Jest/React Testing Library (add tests in `frontend/__tests__/`)

### Environment Variables
- See `.env.example` in root, `backend/`, and `frontend/` for required variables.

---

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repo and create your branch.
2. Make your changes and add tests as needed.
3. Run lint and tests before submitting:
	```sh
	npm run lint
	npm run test
	```
4. Submit a pull request with a clear description of your changes.

---

## License
MIT

---

If you want a deeper dive into any specific feature or flow, see the code or ask for more details!

## Special Infrastructure
- **Embed Service & Qdrant:** Previously used for vector search/ML, now disabled by default.
- **Anonymous User Handling:** Fun names, device-based identity, and session caching.

---
If you want a deeper dive into any specific feature or flow, see the code or ask for more details!