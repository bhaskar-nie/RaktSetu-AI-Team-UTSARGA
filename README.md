# RaktSetu AI

> **Turning NGO Operations into Agentic Intelligence**
> 
> *Built for the **AI for Good 2.0** Hackathon (Organized by Blend360 India) in partnership with the **Blood Warriors Foundation**.*

---

RaktSetu AI is an agentic care coordination platform designed to automate and optimize blood donor-patient matching and bridge management for chronic conditions like Thalassemia. By orchestrating a collaborative network of autonomous **Lyzr AI Agents** and **AWS serverless services**, the platform replaces manual spreadsheet tracking with real-time, event-driven intelligence.

---

## 💻 Tech Stack & Architecture

RaktSetu AI integrates three core layers:
1. **User Interface & Database:** Built using **Next.js (React/TypeScript)** with a premium glassmorphic Tailwind CSS layout and **MongoDB** for real-time persistence of donor profiles, patient metrics, and bridge rotation statuses.
2. **Agentic Layer (Lyzr Agent SDK):** Runs autonomous matching, prediction, and communication agents configured with RAG (Retrieval-Augmented Generation) knowledge bases.
3. **Communication & Analysis Layer (AWS Serverless Hub):**
   * **AWS Bedrock (Claude):** Composes contextual SMS alerts and hospital emails.
   * **AWS Comprehend:** Performs sentiment and intent classification on donor replies.
   * **AWS Polly:** Synthesizes natural multilingual speech synthesis (English, Hindi, Telugu, Tamil, Kannada).
   * **AWS SNS:** Distributes emergency SMS broadcasts to donor topics instantly.
   * **AWS SES:** Delivers clinical briefs and matched donor rosters to hospital blood banks.
   * **AWS S3:** Manages secure storage for donor documents and lab reports.

---

## 🚀 Key Features

* **AI Donor Matching Engine:** Matches donor compatibility in real time based on ABO/Rh rules, active status, location proximity (GPS), and donation recency (enforces a >56-day cooldown).
* **Explainable Demand Forecast:** Forecasts 7-day demand across all 8 blood groups using Lyzr prediction models. Explains forecasts using SHAP (Shapley Additive exPlanations) factors (dataset prevalence, pending requests, inventory levels) and displays donor dropout analytics.
* **WhatsApp Blood Bridge Simulator:** Simulates a continuous 6-stage communication lifecycle (`T-14` awareness down to `D+5` microlearning) for thalassemia patients. Features automated intent classification (AWS Comprehend), multilingual voice reminders (AWS Polly), fail-safe backup rotations, and automated daily briefing generation (AWS Bedrock).
* **One-Tap Emergency Response Pipeline:** Orchestrates a 5-step automated sequence in under 5 seconds: confirms the deficit -> matches compatible donors -> drafts alerts (Bedrock) -> broadcasts SMS to compatible donors (SNS) -> emails the hospital coordinator (SES).
* **Operations Suite:** Includes interactive donor GIS mapping, a gamified Hall of Fame leaderboard (streaks and milestone badges), and an AWS Admin Hub test bench.

---

## 🛠️ Environment Variables Configuration

Create a `.env.local` file in the root directory and configure the following variables:

```env
# Next.js Settings
PORT=3333

# Database Configuration
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/raktsetu

# Lyzr Agent Credentials
LYZR_API_KEY=lyzr-usr-xxxxxxxxxxxxxxxxxxxxx
LYZR_MATCH_AGENT_ID=6a2484c16c86ec3584c733c4
LYZR_PREDICT_AGENT_ID=6a248453baf2abd89dc3c406
LYZR_CHAT_AGENT_ID=6a2483ed8dd4e60c5ed289ea
LYZR_RAG_KB_ID=6a24afd2a563cbef5db16369

# AWS Credentials & Region
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_S3_BUCKET_NAME=raktsetu-donor-documents
AWS_SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:RaktSetuEmergencyTopic
AWS_SES_FROM_EMAIL=coordination@raktsetu.org
```

---

## 📦 Local Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourteam/raktsetu-ai.git
   cd raktsetu-ai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3333](http://localhost:3333) in your browser to view the application.

---
