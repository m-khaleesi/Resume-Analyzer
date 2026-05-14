# Smart Resume Analyzer

This is an AI-powered resume evaluation web application developed to help students, fresh graduates, and job seekers improve their resumes through Artificial Intelligence and Natural Language Processing (NLP). The system analyzes uploaded resumes, generates ATS compatibility feedback, provides professional recommendations, and calculates an overall resume quality score.

The project was developed using modern web technologies including React, TypeScript, Tailwind CSS, Supabase, and AI-based processing tools.

## Project Features

- User authentication and account management
- Resume upload support for PDF, DOCX, and TXT files
- AI-powered resume analysis
- ATS compatibility evaluation
- Grammar, formatting, and readability checking
- Keyword relevance and skills matching
- Resume scoring system
- AI-generated recommendations
- Resume history dashboard
- Database management

## Technologies Used

### Frontend
- React
- TypeScript
- Tailwind CSS

### Backend and Database
- Supabase
- Supabase Authentication
- Supabase Cloud Storage

### AI and Processing
- Natural Language Processing (NLP)
- AI Recommendation System

### Deployment and Version Control
- Vercel
- GitHub

## Getting Started

### First, clone the repository:

```bash
git clone https://github.com/your-username/smart-resume-analyzer.git

### Navigate to the project directory:

cd smart-resume-analyzer

Install the project dependencies:

npm install

Create a .env file and configure the following environment variables:

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

Run the development server:

npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev

Open http://localhost:3000 with your browser to see the result.

You can start editing the application by modifying the frontend components and pages. The application automatically updates as you save changes during development.

System Overview

The Smart Resume Analyzer evaluates resumes using AI and NLP techniques. After a user uploads a resume and selects a target job role, the system performs text extraction and analyzes the content based on:

Grammar and spelling
Formatting consistency
Readability
Keyword relevance
ATS compatibility
Resume completeness

The system then generates:

A resume score from 0–100
AI-powered recommendations
Categorized feedback and improvement suggestions

All uploaded resumes and analysis records are securely stored using Supabase.

Resume Scoring Criteria
Category	Percentage
Grammar	25%
Keywords	30%
Formatting	20%
Readability	15%
Completeness	10%
Important Notes
The system currently supports English-language resumes only.
Complex PDF layouts with tables or graphics may affect text extraction accuracy.
Internet connectivity is required because AI processing and database services are cloud-based.
AI-generated recommendations may vary depending on resume content and context.
The application is designed primarily for general professional resume standards and common job roles.
Live Demo

You can try to access the website thru the link,
Here's the deployed Vercel link:
https://your-vercel-deployment-link.vercel.app


Live Demo Link:https://drive.google.com/file/d/1vI5Omp5GzJUivH8eytcTVml-Qxj6vxnR/view?usp=drivesdk


Team Members
Member	Role
Marian Claire D. Bacas	Team Leader / Full Stack Developer / UI/UX Support
Jeshua Emmanuel L. Cabading	Documentation / QA Support
Princess Velle Jaspe	UI/UX Support
Mariel Mae K. Mapiot	Testing Support

To learn more about the technologies used in this project, refer to the following resources:

React Documentation - https://react.dev/
TypeScript Documentation - https://www.typescriptlang.org/docs/
Tailwind CSS Documentation - https://tailwindcss.com/docs
Supabase Documentation - https://supabase.com/docs
Vercel Documentation - https://vercel.com/docs
Deployment

The recommended deployment platform for this project is Vercel.

For deployment instructions, visit:

https://vercel.com/docs
