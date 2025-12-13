# PWA React App Design Guidelines

## Design Approach
**Selected Framework: Material Design 3** - Optimal for Progressive Web Apps with its mobile-first philosophy, robust component system, and excellent offline state patterns.

## Core Design Principles
- **App-Native Feel**: Design should feel like a native mobile app, not a website
- **Offline-First Mindset**: Clear visual feedback for connection states
- **Progressive Enhancement**: Smooth degradation when offline
- **Touch-Optimized**: All interactive elements sized for mobile interaction (minimum 44px touch targets)

## Typography System
- **Primary Font**: Inter (Google Fonts)
- **Headings**: 
  - H1: text-4xl font-bold (36px)
  - H2: text-2xl font-semibold (24px)
  - H3: text-xl font-medium (20px)
- **Body**: text-base (16px) with leading-relaxed
- **Captions**: text-sm (14px)

## Spacing System
Use Tailwind units: **4, 8, 12, 16, 24** for consistent rhythm
- Component padding: p-4 to p-6
- Section spacing: py-12 to py-16
- Card gaps: gap-4
- Button padding: px-6 py-3

## Layout Structure

### Home Page
**Hero Section** (h-screen layout):
- Centered content with app icon/logo (w-24 h-24)
- App name (H1) + tagline (H2)
- Install button (prominent, elevated card with backdrop blur when over background)
- Feature indicators showing PWA capabilities (offline, fast, installable)

**Features Grid** (2 columns on desktop, 1 on mobile):
- Four key PWA benefits displayed as cards
- Each card: Icon (w-12 h-12) + Title + Description
- Cards elevated with subtle shadow (shadow-lg)
- Hover states with slight scale transform

**Status Section**:
- Connection status indicator (online/offline badge)
- Last updated timestamp
- Cache status information

### Offline Page
- Centered layout with illustration placeholder
- Clear messaging: "You're offline"
- Cached content availability notice
- Retry connection button

## Component Library

### Navigation
**Bottom App Bar** (mobile-first):
- Fixed bottom navigation with 3-4 primary actions
- Icon + label combination
- Active state with color fill and elevation

### Cards
- Rounded corners: rounded-xl
- Padding: p-6
- Shadow: shadow-lg with hover:shadow-xl
- Background: Semi-transparent with backdrop-blur when appropriate

### Buttons
**Primary CTA**: 
- Large touch target: px-8 py-4
- Rounded: rounded-full
- Elevated appearance
- Clear hierarchy (one primary per section)

**Secondary Actions**:
- Outlined style with rounded-lg
- Standard padding: px-6 py-3

### Install Prompt
Custom component mimicking native install banners:
- Sticky top positioning
- Slide-down animation on appearance
- Dismiss button (top-right)
- Clear "Add to Home Screen" action

### Status Badges
- Pill-shaped: rounded-full px-4 py-2
- Small text: text-sm
- Connection states: Green (online), Gray (offline)

## Images
**Hero Background**: Abstract gradient or subtle pattern (not a photograph) - serves as backdrop for centered content. The install button over this background should have backdrop-blur-sm and semi-transparent background.

**Feature Icons**: Use Material Icons CDN for consistency
- offline_bolt (Offline capable)
- smartphone (Installable)
- speed (Fast loading)
- sync (Background sync)

## Responsive Behavior
- Mobile-first approach (base styles for mobile)
- Breakpoint at md: for tablet adjustments
- Breakpoint at lg: for desktop enhancements
- Bottom navigation on mobile → Side navigation on desktop

## PWA-Specific Design Elements

### Installation States
- **Pre-install**: Prominent install button in hero
- **Installed**: Replace install button with welcome message
- **Update Available**: Non-intrusive notification badge

### Loading States
- Skeleton screens for initial load
- Progress indicators for data fetching
- Smooth transitions between states

### Offline Indicators
- Persistent top banner when offline (dismissible)
- Grayed-out unavailable features
- Clear "Cached" labels on available content

## Animation Guidelines
**Minimal and Purposeful**:
- Page transitions: Simple fade (duration-200)
- Install prompt: Slide from top (duration-300)
- Status changes: Gentle pulse animation
- No decorative animations

## Accessibility
- Minimum contrast ratio: 4.5:1
- Focus indicators on all interactive elements
- ARIA labels for icon-only buttons
- Screen reader announcements for status changes
- Touch targets: minimum 44x44px

This design creates a polished, modern PWA that feels native while remaining simple and functional. The emphasis is on clarity, accessibility, and demonstrating PWA capabilities through thoughtful UI patterns.