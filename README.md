# Attendance-Tracker

A web-based attendance tracking system with Firebase integration for real-time data storage and synchronization.

## Features

- Track student attendance (Present, Absent, Late)
- Store and manage student data
- View attendance statistics and trends
- Export attendance records as CSV
- Import students from CSV
- Real-time database synchronization with Firebase

## Firebase Setup Instructions

This application uses Firebase Realtime Database for data storage. Here's how to set it up:

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup steps
3. Create a new project with your preferred name

### 2. Set up Firebase Realtime Database

1. In the Firebase Console, select your project
2. In the left sidebar, click "Build" > "Realtime Database"
3. Click "Create Database"
4. Start in test mode (for development) or locked mode (for production)
5. Choose a database location close to your users

### 3. Configure Web App

1. In the Firebase Console, click the gear icon next to "Project Overview" and select "Project settings"
2. Scroll down to "Your apps" section and click the web icon "</>"
3. Register your app with a nickname
4. Copy the firebaseConfig object
5. Replace the configuration in the `firebase-config.js` file with your values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 4. Database Structure

The application uses the following database structure:

```
attendance-tracker/
├── students/
│   ├── [studentId]/
│   │   ├── name
│   │   ├── id
│   │   ├── class
│   │   └── firebaseId
│   └── ...
└── attendance/
    ├── [YYYYMMDD]/
    │   ├── [0]/
    │   │   ├── name
    │   │   └── status
    │   ├── [1]/
    │   │   ├── name
    │   │   └── status
    │   └── ...
    └── ...
```

### 5. Security Rules

For production, update your Firebase security rules to protect your data:

```json
{
  "rules": {
    "students": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "attendance": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## Running the Application

1. Clone the repository
2. Configure Firebase as described above
3. Open `index.html` in a web browser or deploy to a web server

## Using the Application

1. Add students in the Teacher View
2. Mark attendance by selecting a date and marking students as Present, Late, or Absent
3. View statistics in the Statistics View
4. Students can check their own attendance in the Student View

## Development

The application uses:
- Firebase Realtime Database for data storage
- Chart.js for visualization
- Bootstrap 5 for UI components