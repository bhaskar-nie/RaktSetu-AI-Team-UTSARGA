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

## ☁️ AWS Deployment Guide

There are two primary ways to deploy this application on AWS depending on your architecture: **AWS Amplify** (easiest for Next.js App Router applications) and **AWS App Runner** (recommended for production containerized deployment using the existing `Dockerfile`).

### Option 1: AWS Amplify (Recommended & Quickest)

AWS Amplify is a fully managed hosting service that natively supports Next.js SSR (Server-Side Rendering) apps and handles route routing automatically.

1. **Push your code** to a Git provider (GitHub, GitLab, or Bitbucket).
2. **Open the AWS Management Console** and navigate to **AWS Amplify**.
3. Click **Create new app** and choose **Host web app**.
4. Connect your Git repository and select the target branch.
5. **Configure Build Settings:** Amplify will automatically detect Next.js. Ensure the build command is:
   ```yaml
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
   ```
6. **Set Environment Variables:** In the Amplify Console under **App Settings > Environment Variables**, add all the variables from your `.env.local` file (MongoDB URI, AWS keys, Lyzr Agent IDs).
7. Click **Save and Deploy**. AWS Amplify will provision the build container, compile the server-side routes, and deploy the application to a public URL.

---

### Option 2: AWS App Runner (Containerized Deployment)

Since the project includes a production-ready `Dockerfile`, deploying via AWS App Runner is a highly scalable, serverless container hosting option.

1. **Create an ECR (Elastic Container Registry) Repository:**
   ```bash
   aws ecr create-repository --repository-name raktsetu-ai --region us-east-1
   ```
2. **Build and Tag the Docker Image:**
   ```bash
   # Authenticate Docker to your ECR registry
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com

   # Build the container
   docker build -t raktsetu-ai .

   # Tag the image for ECR
   docker tag raktsetu-ai:latest <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/raktsetu-ai:latest

   # Push to AWS
   docker push <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/raktsetu-ai:latest
   ```
3. **Configure AWS App Runner:**
   * Go to the **App Runner Console** and click **Create Service**.
   * Select **Repository type: Container Registry** and choose **Amazon ECR**.
   * Browse and select the `raktsetu-ai:latest` image.
   * Under **Deployment settings**, choose **Automatic** to auto-deploy on image updates.
4. **Configure Service Settings:**
   * **Port:** Set the port to `3333` (matching the port defined in the `Dockerfile` and `.env`).
   * **Environment Variables:** Define all environment variables from `.env.local`.
   * **IAM Role:** Assign an IAM role that grants access to AWS Bedrock, SNS, SES, Polly, and Comprehend (see IAM Policy below).
5. Click **Create & Deploy**. App Runner will pull the image, expose port `3333` to a secure public load-balancer, and provision health-monitored runtime instances.

---

## 🔒 Required AWS IAM Policy

Ensure that the IAM credentials or App Runner instance role has the following permissions enabled:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AWSBedrockAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:*:*:model/*"
    },
    {
      "Sid": "AWSSNSAccess",
      "Effect": "Allow",
      "Action": [
        "sns:Publish",
        "sns:SetSMSAttributes"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AWSSESAccess",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AWSPollyAccess",
      "Effect": "Allow",
      "Action": [
        "polly:SynthesizeSpeech",
        "polly:DescribeVoices"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AWSComprehendAccess",
      "Effect": "Allow",
      "Action": [
        "comprehend:DetectSentiment",
        "comprehend:DetectKeyPhrases"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AWSS3Access",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::raktsetu-donor-documents",
        "arn:aws:s3:::raktsetu-donor-documents/*"
      ]
    }
  ]
}
```
