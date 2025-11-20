# Santa AI Video Call Application

A React-based web application that allows users to have video conversations with an AI-powered Santa Claus. The app features a retro-inspired UI with draggable windows, a Flappy Bird-style game, and real-time video calling capabilities.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Components](#components)
- [Custom Hooks](#custom-hooks)
- [Utilities](#utilities)
- [Key Features](#key-features)
- [Development Guide](#development-guide)
- [Environment Variables](#environment-variables)

## Overview

This application provides an interactive experience where users can:
- View a countdown to Christmas
- Answer a video call from Santa
- Complete a "hair check" (camera/mic setup)
- Have a real-time video conversation with AI Santa
- Play a Flappy Bird-style game with an elf character

The UI is designed with a retro, pixelated aesthetic reminiscent of early computer interfaces, with draggable windows and a desktop-like experience.

## Tech Stack

- **React 19.2.0** - UI framework
- **Vite 7.2.2** - Build tool and dev server
- **@daily-co/daily-react** - Video calling infrastructure
- **@tavus/cvi-ui** - Tavus Conversational Video Interface components
- **Jotai** - State management
- **CSS Modules** - Scoped styling

## Project Structure

```
src/
├── App.jsx                    # Main application component
├── App.css                    # Global app styles
├── main.jsx                   # Application entry point
├── index.css                  # Global CSS (fonts, resets)
│
├── components/                 # React components
│   ├── Background/            # Background video and overlays
│   ├── CallControls/          # Answer call button and controls
│   ├── CallEndedScreen/       # Post-call screen
│   ├── ConnectingScreen/     # Loading state for connection
│   ├── FlappySanta/           # Flappy Bird game component
│   ├── FlappyWindow/          # Window wrapper for game
│   ├── Footer/                # Footer with countdown
│   ├── Header/                # Top header bar
│   ├── HeroText/              # "meet ai Santa" hero text
│   ├── LoadingScreen/         # Initial loading screen
│   ├── VideoCallWindow/       # Main Santa video call window
│   ├── WindowIcon/            # Window icon buttons
│   └── cvi/                   # Tavus CVI components
│       ├── components/        # CVI UI components
│       └── hooks/             # CVI-specific hooks
│
├── hooks/                     # Custom React hooks
│   ├── useAssetPreloader.js  # Preloads videos/images
│   ├── useCountdown.js        # Christmas countdown timer
│   ├── useTavusConversation.js # Tavus API integration
│   └── useWindowPosition.js   # Window positioning logic
│
└── utils/                     # Utility functions
    ├── assetPaths.js          # Centralized asset paths
    └── windowUtils.js         # Window positioning helpers
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   VITE_TAVUS_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser to the URL shown in the terminal (usually `http://localhost:5173`)

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Architecture

### Component Hierarchy

```
App.jsx
├── LoadingScreen (conditional)
├── Background
├── Header
├── HeroText
├── Footer
├── main-content
│   ├── WindowIcon (Santa)
│   └── WindowIcon (Flappy Elf)
├── VideoCallWindow
│   ├── CallControls (before answering)
│   ├── HairCheck (after answering)
│   ├── Conversation (during call)
│   └── CallEndedScreen (after call)
└── FlappyWindow
    └── FlappySanta
```

### State Flow

1. **Initial Load**: `useAssetPreloader` loads all assets, shows loading screen
2. **Main Screen**: User sees hero text, countdown, and window icons
3. **Answer Call**: User clicks "ANSWER HIS CALL" → `isAnswered` becomes `true`
4. **Hair Check**: Camera/mic setup → `isHairCheckComplete` becomes `true`
5. **Conversation**: `useTavusConversation` generates URL → Conversation component joins call
6. **Call End**: User leaves → `isCallEnded` becomes `true` → Shows end screen

## Components

### Core Components

#### `App.jsx`
The main orchestrator component. Manages high-level state:
- Window minimize/maximize states
- Call flow state (answered, hair check, conversation, ended)
- Conversation URL state
- Window refs for positioning

**Key State:**
- `isMinimized` / `isFlappyMinimized` - Window visibility
- `isAnswered` - User has answered the call
- `isHairCheckComplete` - Camera/mic setup complete
- `isCallEnded` - Call has ended
- `conversationUrl` - Tavus conversation URL

#### `VideoCallWindow`
The main Santa video call window. Handles:
- Window positioning and dragging
- Different states: calling, hair check, conversation, ended
- Responsive sizing (desktop vs mobile)

**Props:**
- `isMinimized` - Whether window is minimized
- `isAnswered` - Whether user answered
- `isHairCheckComplete` - Whether hair check is done
- `conversationUrl` - Tavus conversation URL
- `windowRef` - Ref for positioning

#### `FlappyWindow`
Window wrapper for the Flappy Santa game. Similar structure to VideoCallWindow but simpler.

#### `CallControls`
The "ANSWER HIS CALL" button and calling text. Shows intro video, then loop video with animated text.

#### `HairCheck` (in `cvi/components/hair-check`)
Camera and microphone setup screen. Uses Daily.co for video preview and device selection.

#### `Conversation` (in `cvi/components/conversation`)
The actual video call interface. Handles:
- Main video feed (Santa)
- Self-view preview
- Audio/video controls
- Naughty/Nice indicator
- Call controls

### UI Components

#### `Background`
Renders the background video, gradient overlay, and animated snow pattern.

#### `Header`
Top header bar with music icon.

#### `HeroText`
The "meet ai Santa" hero text at the top of the page.

#### `Footer`
Bottom footer with Tavus logo and Christmas countdown timer.

#### `WindowIcon`
Reusable icon component for opening windows (Santa and Flappy Elf).

#### `LoadingScreen`
Initial loading screen shown while assets preload.

#### `CallEndedScreen`
Post-call screen showing "Santa is now a PAL!" message.

#### `ConnectingScreen`
Loading state shown while connecting to Tavus conversation.

## Custom Hooks

### `useAssetPreloader`
Preloads all videos and images before showing the main app.

**Returns:** `isLoading` (boolean)

**How it works:**
- Creates video elements and waits for `canplaythrough` event
- Preloads images
- Ensures minimum 1 second loading time
- Uses asset paths from `utils/assetPaths.js`

**Usage:**
```jsx
const isLoading = useAssetPreloader()
if (isLoading) return <LoadingScreen />
```

### `useCountdown`
Calculates and updates time until Christmas.

**Returns:** `{ days, hours, minutes, seconds }`

**How it works:**
- Calculates time until December 25th
- Updates every second
- Handles year rollover if Christmas has passed

**Usage:**
```jsx
const timeUntilChristmas = useCountdown()
// { days: 45, hours: 12, minutes: 30, seconds: 15 }
```

### `useWindowPosition`
Manages window positioning, dragging, and responsive sizing.

**Parameters:**
- `isLoading` - Don't position until loaded
- `isMinimized` - Window is minimized
- `isAnswered` - User has answered (affects mobile sizing)
- `windowRef` - Ref to window element

**Returns:**
- `position` - `{ x, y }` coordinates
- `windowSize` - `{ width, height }` for mobile
- `isDragging` - Whether window is being dragged
- `handleMouseDown` - Handler for drag start

**How it works:**
- Desktop: Centers window in viewport
- Mobile (before answer): Positions between hero text and icons
- Mobile (after answer): Fullscreen
- Handles window resize events
- Tracks manual dragging to prevent auto-repositioning

**Usage:**
```jsx
const { position, windowSize, handleMouseDown } = useWindowPosition({
  isLoading,
  isMinimized,
  isAnswered,
  windowRef
})
```

### `useTavusConversation`
Generates Tavus conversation URL when hair check is complete.

**Parameters:**
- `isHairCheckComplete` - Triggers URL generation

**Returns:** `conversationUrl` (string or null)

**How it works:**
- Calls Tavus API when `isHairCheckComplete` becomes `true`
- Uses API key from environment variables
- Creates conversation with persona ID `p3bb4745d4f9`
- Resets URL when `isHairCheckComplete` becomes `false`

**Usage:**
```jsx
const conversationUrl = useTavusConversation(isHairCheckComplete)
```

## Utilities

### `utils/assetPaths.js`
Centralized asset path constants. Makes it easy to update asset paths in one place.

**Exports:**
- `ASSET_PATHS` - Object with all asset paths organized by type
- `getAllVideoPaths()` - Returns array of all video paths
- `getAllImagePaths()` - Returns array of all image paths

**Usage:**
```jsx
import { ASSET_PATHS } from '../utils/assetPaths'
<img src={ASSET_PATHS.images.santa} />
```

### `utils/windowUtils.js`
Helper functions for window positioning calculations.

**Functions:**
- `calculateDesktopPosition()` - Centers window on desktop
- `calculateMobilePosition()` - Positions window on mobile between text and icons
- `calculateMinimizedPosition()` - Positions minimized window (right side)
- `isMobile()` - Checks if viewport is mobile size
- `getDesktopWindowDimensions()` - Calculates desktop window size
- `getMobileWindowDimensions()` - Calculates mobile window size

**Usage:**
```jsx
import { calculateDesktopPosition, isMobile } from '../utils/windowUtils'
```

## Key Features

### 1. Asset Preloading
All videos and images are preloaded before the app shows. This prevents loading delays during the experience.

### 2. Responsive Window Positioning
Windows automatically position themselves:
- **Desktop**: Centered in viewport
- **Mobile (before answer)**: Between hero text and footer icons
- **Mobile (after answer)**: Fullscreen

### 3. Draggable Windows
Both Santa and Flappy Elf windows can be dragged around. The app tracks manual dragging to prevent auto-repositioning from interfering.

### 4. Video Call Flow
1. User sees Santa calling (intro video → loop video)
2. User clicks "ANSWER HIS CALL"
3. Hair check screen (camera/mic setup)
4. Tavus conversation URL is generated
5. Video call begins
6. Call ends → end screen

### 5. Flappy Santa Game
A Flappy Bird-style game where you control an elf character, avoiding trees and ornaments.

### 6. Christmas Countdown
Real-time countdown to Christmas that updates every second.

## Development Guide

### Adding a New Component

1. Create a new folder in `src/components/`
2. Create `ComponentName.jsx` and `ComponentName.module.css`
3. Import and use in `App.jsx` or parent component

**Example:**
```jsx
// components/NewComponent/NewComponent.jsx
import styles from './NewComponent.module.css'

export const NewComponent = ({ prop1, prop2 }) => {
  return (
    <div className={styles.container}>
      {/* Component content */}
    </div>
  )
}
```

### Adding a New Hook

1. Create file in `src/hooks/`
2. Follow React hooks naming convention (`use` prefix)
3. Export the hook

**Example:**
```jsx
// hooks/useNewHook.js
import { useState, useEffect } from 'react'

export const useNewHook = (dependency) => {
  const [state, setState] = useState(null)
  
  useEffect(() => {
    // Hook logic
  }, [dependency])
  
  return state
}
```

### Styling Guidelines

- Use CSS Modules for component-specific styles
- Global styles go in `App.css` or `index.css`
- Follow the retro/pixelated aesthetic:
  - `image-rendering: pixelated`
  - No border-radius (use `border-radius: 0`)
  - Use the project fonts: 'FK Raster Grotesk Compact' and 'Perfectly Nineties'

### Common Tasks

#### Changing Window Size
Edit `VideoCallWindow.module.css`:
```css
.videoCallWindow {
  max-width: 750px; /* Change this */
  aspect-ratio: 16 / 10; /* Or this */
}
```

#### Adding a New Asset
1. Add file to `public/` directory
2. Add path to `utils/assetPaths.js`:
```js
export const ASSET_PATHS = {
  images: {
    newImage: '/new-image.png'
  }
}
```

#### Modifying the Countdown
The countdown logic is in `hooks/useCountdown.js`. To change the target date, modify the `getTimeUntilChristmas` function.

#### Changing API Endpoint
Edit `hooks/useTavusConversation.js`:
```js
const response = await fetch('https://tavusapi.com/v2/conversations', {
  // Change URL here
})
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_TAVUS_API_KEY=your_tavus_api_key_here
```

The app will fall back to a hardcoded key if the environment variable is not set (for development only).

## File Naming Conventions

- **Components**: PascalCase (e.g., `VideoCallWindow.jsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useCountdown.js`)
- **Utilities**: camelCase (e.g., `assetPaths.js`)
- **CSS Modules**: camelCase matching component name (e.g., `VideoCallWindow.module.css`)

## CSS Architecture

- **Global styles**: `index.css` (fonts, resets), `App.css` (app-level styles)
- **Component styles**: CSS Modules (scoped to component)
- **Responsive**: Media queries in component CSS files
- **Retro styling**: Pixelated rendering, no border-radius, specific fonts

## Key Dependencies Explained

### @daily-co/daily-react
Provides video calling infrastructure. Used for:
- Camera/microphone access
- Video preview in hair check
- Video call interface

### @tavus/cvi-ui
Tavus Conversational Video Interface components. Provides pre-built UI for video conversations.

### Jotai
Lightweight state management. Used by CVI components for shared state.

## Troubleshooting

### Window not positioning correctly
- Check that `windowRef` is properly passed
- Verify `useWindowPosition` hook is receiving correct props
- Check browser console for errors

### Video not loading
- Verify asset paths in `utils/assetPaths.js`
- Check that files exist in `public/` directory
- Check browser network tab for 404 errors

### Tavus API not working
- Verify `VITE_TAVUS_API_KEY` is set in `.env`
- Check browser console for API errors
- Verify API key is valid

### Styles not applying
- Ensure CSS Module is imported correctly
- Check that class names match between JSX and CSS
- Verify CSS Module syntax: `styles.className`

## Code Organization Principles

1. **Single Responsibility**: Each component/hook has one clear purpose
2. **Reusability**: Common logic extracted to hooks/utilities
3. **Separation of Concerns**: UI components, business logic, and utilities are separated
4. **CSS Modules**: Scoped styles prevent conflicts
5. **Component Composition**: Build complex UIs from simple components

## Next Steps for Junior Developers

1. **Start with `App.jsx`**: Understand the main flow
2. **Explore components**: Look at simple ones first (Header, Footer)
3. **Study hooks**: Understand how `useWindowPosition` works
4. **Experiment**: Try changing colors, text, or adding small features
5. **Read the code**: Each component is well-commented

## Additional Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vite.dev)
- [Daily.co Documentation](https://docs.daily.co)
- [Tavus Documentation](https://docs.tavus.io)
- [CSS Modules](https://github.com/css-modules/css-modules)

---

**Note**: This is a production application. Be careful when making changes and test thoroughly before deploying.
