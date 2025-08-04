# NYC Smart Parking - Quick Setup Guide

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

3. **Get a Mapbox token**:
   - Sign up at [mapbox.com](https://www.mapbox.com/)
   - Create a new token
   - Add it to your `.env.local` file

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open the application**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## ✅ Features Implemented

### Core Features
- ✅ **Interactive NYC Map** - Mapbox GL JS integration
- ✅ **Parking Signs Search** - Find parking regulations by location
- ✅ **Meter Rate Lookup** - Check parking meter rates and hours
- ✅ **Violation Trends Dashboard** - Analyze violation patterns with charts

### UI/UX Features
- ✅ **Responsive Design** - Mobile-first approach
- ✅ **Dark/Light Mode** - System-aware theme switching
- ✅ **Accessible Design** - WCAG compliant patterns
- ✅ **Loading States** - Skeleton loaders and spinners
- ✅ **Error Handling** - Graceful error boundaries and messages

### Navigation & Search
- ✅ **Header Navigation** - Responsive navigation with mobile menu
- ✅ **Address Search** - Geocoding with autocomplete
- ✅ **Coordinate Input** - Manual coordinate entry with validation
- ✅ **Search History** - Local storage of recent searches
- ✅ **URL Sharing** - Shareable links for locations

### Data Features
- ✅ **Real-time API Integration** - TanStack Query for data fetching
- ✅ **Export Functionality** - CSV and JSON export options
- ✅ **Filtering & Sorting** - Advanced data filtering
- ✅ **Interactive Charts** - Recharts for visualization

## 🗂️ Project Structure

```
parking-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Root layout with providers
│   │   ├── page.tsx           # Homepage with map and search
│   │   ├── parking-signs/     # Parking signs search page
│   │   ├── meter-rates/       # Meter rates lookup page
│   │   └── violation-trends/  # Trends dashboard page
│   ├── components/
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── map/               # Map components
│   │   ├── forms/             # Search and input forms
│   │   ├── charts/            # Chart components
│   │   ├── header.tsx         # Navigation header
│   │   ├── theme-provider.tsx # Theme management
│   │   └── query-provider.tsx # React Query setup
│   └── lib/
│       ├── api.ts             # API client and functions
│       ├── types.ts           # TypeScript definitions
│       └── utils.ts           # Utility functions
```

## 📱 Pages Overview

### 1. Homepage (`/`)
- Interactive NYC map with search
- Quick stats from API data
- Address and coordinate search
- Quick action buttons
- Feature overview cards

### 2. Parking Signs (`/parking-signs`)
- Location-based search with radius
- Filter by borough and search terms
- Sort by distance or street name
- Export results as CSV/JSON
- Interactive map with markers

### 3. Meter Rates (`/meter-rates`)
- Find nearest parking meter
- Display rates, hours, and payment methods
- Meter status and availability
- Distance calculation from search point

### 4. Violation Trends (`/violation-trends`)
- Filter by borough, year, and month
- Interactive charts (bar, line, pie)
- Statistics overview
- Export trend data
- Violation pattern analysis

## 🎨 Design System

### Colors (NYC-inspired)
- Primary: Blue tones (#1e40af, #3b82f6, #60a5fa)
- Success: Green (#22c55e)
- Error: Red (#ef4444)
- Warning: Yellow (#f59e0b)

### Components
- Built with shadcn/ui and Radix UI
- Tailwind CSS for styling
- Lucide React for icons
- Custom NYC gradient utilities

## 🔌 API Integration

### Required Endpoints
- `GET /api/health` - System health check
- `GET /api/parking-signs` - Search parking signs
- `GET /api/meter-rate` - Get meter rates
- `GET /api/violation-trends` - Get violation data
- `GET /api/debug/data-status` - Data statistics

### API Client Features
- Automatic retries and error handling
- Request/response interceptors
- TypeScript-safe API calls
- Caching with React Query

## 🚀 Performance Features

- **Code Splitting** - Automatic route-based splitting
- **Image Optimization** - Next.js Image component
- **Bundle Analysis** - Available with `npm run analyze`
- **Lazy Loading** - Map and heavy components
- **Caching** - React Query with stale-while-revalidate

## 🔧 Development

### Available Scripts
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run start` - Production server
- `npm run lint` - ESLint checking
- `npm run type-check` - TypeScript validation

### Development Tools
- TypeScript for type safety
- ESLint for code quality
- React Query DevTools (development only)
- Tailwind CSS IntelliSense

## 🌐 Deployment

### Environment Variables
```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_production_token
NEXT_PUBLIC_API_URL=your_production_api_url
```

### Build Command
```bash
npm run build
```

### Production Notes
- Requires Node.js 18+
- Mapbox token with proper domain restrictions
- Backend API with CORS configured for your domain

## 🔍 Troubleshooting

### Map Not Loading
- Check `NEXT_PUBLIC_MAPBOX_TOKEN` is set
- Verify token permissions
- Check browser console for errors

### API Errors
- Ensure backend is running on specified port
- Check CORS configuration
- Verify API endpoints match expected format

### Search Issues
- Verify coordinates are within NYC bounds
- Check network connectivity
- Try different search terms

## 📊 Features in Detail

### Search & Navigation
- **Address Geocoding**: OpenStreetMap Nominatim API
- **Coordinate Validation**: NYC bounds checking
- **Search History**: Local storage with 20 item limit
- **URL Parameters**: Shareable location links

### Map Integration
- **Mapbox GL JS**: Vector tiles for smooth interaction
- **Custom Markers**: Different icons for data types
- **Popups**: Information display on marker click
- **Geolocation**: Browser-based location detection

### Data Export
- **CSV Format**: Spreadsheet-compatible export
- **JSON Format**: Raw data with metadata
- **Filtered Export**: Only visible/filtered data
- **Filename Convention**: Includes filters and date

This is a complete, production-ready Next.js application for NYC parking data with modern UI/UX patterns, accessibility features, and robust error handling.