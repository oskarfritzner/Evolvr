# Evolvr

Evolvr is a comprehensive personal development application that gamifies self-improvement through an engaging leveling system, life category management, and AI-assisted guidance. The app helps users track and improve different aspects of their lives while making personal growth engaging and rewarding.

## 🎯 Core Features

- **Life Categories System**:

  - Track progress across different life domains (Physical, Mental, Social, etc.)
  - Individual leveling system for each category
  - Experience points (XP) based progression

- **Challenge System**:

  - Challenge completion rewards and XP gains

- **Task Management**:

  - Create and organize tasks by life categories
  - Task difficulty levels and XP rewards
  - Progress tracking and completion statistics

- **Journaling**:

  - Daily reflection capabilities
  - Mood tracking
  - Achievement logging
  - Progress documentation

- **AI Integration**:

  - Task creator so users can create tasks that fit into our task and leveling system.
  - Mindset coach chat with different personalities
  - AI assistance for goal breakdown and guidance(Coming soon) - will devide a goal for the users into tasks they can do everyday to get closer to their goal, and track their efforts using our leveling system

- **User Profile & Progress**:

  - Personal level and XP tracking
  - Achievement badges and rewards
  - Progress visualization across categories
  - Historical performance tracking
  - Post sharing with privacy setting for progress documentation

- **Authentication & Data**:
  - Real-time data synchronization
  - Personal progress backup

## 🚀 Tech Stack

- **Framework:** React Native with Expo (SDK 52, Managed Workflow)
- **Language:** TypeScript
- **State Management & Storage:**
  - Zustand for global state
  - React Query for server state
  - Async Storage for local persistence
- **UI Components:**
  - React Native Elements
  - React Native Paper
  - Material UI components
  - Bottom Sheet (@gorhom/bottom-sheet)
  - Custom components with React Native Reanimated
  - Dropdown Picker
  - Popup Menu
- **Navigation:**
  - Expo Router
  - React Navigation (Bottom Tabs & Native Stack)
- **Authentication:**
  - Firebase Email and Password
  - Google Sign-In (planned)
  - Apple Sign-In (planned)
  - Expo Auth Session
  - Secure Store
- **Data & Media:**
  - React Native Chart Kit for visualizations
  - Expo Image Picker
  - Expo Blur effects
- **Styling & Animations:**
  - Moti & Framer Motion
  - React Native Reanimated
  - Expo Linear Gradient
- **User Experience:**
  - Toast notifications
  - Haptic feedback
  - Date handling with date-fns
- **Backend Integration:**
  - Firebase
  - OpenAI API
  - Azure OpenAI Services
- **Testing:**
  - Jest with React Native Testing Library
  - React Test Renderer

## 📱 Features

- Modern UI with smooth animations and transitions
- Secure authentication flow
- Real-time data synchronization
- Background task processing
- Responsive design across different device sizes
- Comprehensive error handling
- Toast notifications
- Bottom sheet interactions
- Image handling and manipulation
- Chart and data visualization
- Haptic feedback integration

## 🛠 Prerequisites

- Node.js (LTS version)
- npm or yarn
- iOS Simulator or iOS device (for iOS development)
- Xcode (for iOS development)
- Expo CLI

## ⚙️ Environment Setup

1. Create a `.env` file in the `Evolvr` directory with the following variables:

```bash
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

# Google Auth Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key

# Azure OpenAI Configuration
EXPO_PUBLIC_AZURE_OPENAI_API_KEY1=your_azure_openai_api_key
EXPO_PUBLIC_AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
EXPO_PUBLIC_AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name

# Azure Deployments Config
EXPO_PUBLIC_DEPLOYMENT_TARGET_URI=your_deployment_target_uri
EXPO_PUBLIC_DEPLOYMENT_KEY=your_deployment_key
```

Contact the development team to obtain the necessary API keys and configuration values.

## 🚀 Getting Started

1. **Clone the repository**

   ```bash
   git clone [repository-url]
   cd EvolvrApp
   ```

2. **Install dependencies**

   ```bash
   cd Evolvr
   npm install
   # or
   yarn install
   ```

3. **Start the development server**

   ```bash
   npm start
   # or
   yarn start
   ```

4. **Run on iOS**
   ```bash
   npm run ios
   # or
   yarn ios
   ```

## ⚠️ Platform Support Status

### iOS

- ✅ Fully configured and tested with Expo go.
- ✅ Native features implemented
- ✅ UI/UX optimized for iOS

### Android

- ⚠️ Basic configuration pending
- ❌ Google Sign-In not yet configured
- ❌ Native features need implementation
- ⚠️ UI/UX testing required

**Note:** The application is currently optimized for iOS. Android support is planned but not yet implemented. If you need to develop for Android, please contact the development team for the latest status and requirements.

## 📂 Project Structure

```
EvolvrApp/
├── Evolvr/             # Main application directory
│   ├── app/           # App router and screens
│   ├── components/    # Reusable components
│   ├── context/       # React context providers
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Third-party library configurations
│   ├── utils/         # Utility functions
│   ├── types/         # TypeScript type definitions
│   ├── styles/        # Global styles
│   ├── constants/     # App constants
│   ├── assets/        # Static assets
│   └── __tests__/     # Test files
└── README.md         # Project documentation
```


## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, please open an issue in the repository or contact the development team.
