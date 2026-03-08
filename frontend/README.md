# Remitly Frontend — AI-Powered Stablecoin Remittance 💸

This is the Expo (React Native) mobile application for Remitly, using a clean 3-layer Service Architecture with Class-Based patterns.

## 🏗️ Service Architecture

The frontend follows a strict 3-layer architecture to ensure concerns are separated and the codebase is easy to maintain.

### Layer 1: Types (`src/types/`)
All API and WebSocket message shapes are strictly defined in `api.ts`.
- **Zero `any` types**: TypeScript strict mode is enforced throughout.
- **Discriminated Unions**: Used for WebSocket messages to allow safe type narrowing.

### Layer 2: Services (`src/services/`)
Singleton classes that handle all external communication.
- **`BaseService`**: Abstract base with an `axios` instance.
  - **Async Token Interceptor**: Automatically attaches the `remitly_token` from `AsyncStorage`.
  - **Auto-Logout**: Automatically clears the token and redirects to `/login` on `401 Unauthorized`.
- **`AuthService`**: Handles registration, login, and token persistence.
- **`UserService`**: Handles balance and profile fetching.
- **`RecipientService`**: Full CRUD for contact management.
- **`TransactionService`**: Paginated transaction history.
- **`ChatService`**: Manages the global React Native WebSocket for AI-powered chat.
  - **Retry Logic**: Includes exponential backoff for connection stability.
  - **Listener Pattern**: Components can subscribe/unsubscribe to messages and errors.

### Layer 3: Custom Hooks (`hooks/`)
The bridge between UI and Services.
- **Rule**: Components **NEVER** import services directly. They only use hooks.
- **Stable References**: Actions are wrapped in `useCallback` to prevent unnecessary re-renders.
- **Auto-Fetching**: Hooks like `useBalance` and `useRecipients` handle data loading on mount.
- **Memory Safety**: `useChat` automatically cleans up WebSocket listeners and connections on unmount.

## 🚀 Get Started

1. **Install Dependencies**
   ```bash
   npm install
   npx expo install axios @react-native-async-storage/async-storage
   ```

2. **Configure Environment**
   Create a `.env.local` file in the `frontend` root:
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:4000
   EXPO_PUBLIC_WS_URL=ws://localhost:4000/main_caller
   ```

3. **Start Developing**
   ```bash
   npx expo start
   ```

## 🛠️ Tech Stack
- **Framework**: React Native + Expo (Expo Router)
- **Language**: TypeScript (Strict Mode)
- **HTTP**: Axios
- **Storage**: @react-native-async-storage/async-storage
- **Real-time**: Native WebSocket API

---
*Built with React Native ⚛️ and Expo 🚀*
