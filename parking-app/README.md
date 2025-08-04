# NYC Smart Parking Frontend

A modern Next.js 14 application for accessing NYC parking data, including parking signs, meter rates, and violation trends.

## Features

- 🗺️ **Interactive NYC Map** - Powered by Mapbox GL JS
- 🚫 **Parking Signs Search** - Find parking regulations around any location
- 🅿️ **Meter Rate Lookup** - Check parking meter rates and hours
- 📊 **Violation Trends** - Analyze parking violation patterns by borough
- 🌙 **Dark/Light Mode** - System-aware theme switching
- 📱 **Mobile Responsive** - Optimized for all device sizes
- ♿ **Accessible** - WCAG compliant design patterns
- 📥 **Export Data** - Download search results as CSV or JSON

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **Maps**: Mapbox GL JS + react-map-gl
- **State Management**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ and npm
- Mapbox account and API token
- NYC Smart Parking API backend running on localhost:5000

## Installation

1. **Clone and install dependencies**:
   ```bash
   cd parking-app
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env.local` file in the root directory:
   ```env
   # Required: Mapbox API Token
   NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
   
   # Optional: Backend API URL (defaults to localhost:5000)
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

3. **Get a Mapbox token**:
   - Sign up at [mapbox.com](https://www.mapbox.com/)
   - Create a new token with default scopes
   - Add the token to your `.env.local` file

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open the application**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Integration

This frontend connects to the NYC Smart Parking Flask API backend. Ensure the backend is running on `localhost:5000` with the following endpoints available:

- `GET /api/health` - Health check
- `GET /api/parking-signs` - Search parking signs
- `GET /api/meter-rate` - Get meter rates
- `GET /api/violation-trends` - Get violation trends
- `GET /api/debug/data-status` - Data status information

## Usage Guide

### Main Dashboard
- View NYC parking data overview
- Search by address or coordinates
- Quick access to all features

### Parking Signs Search
- Enter an address or coordinates
- Set search radius (up to 5km)
- Filter by borough or search terms
- Sort by distance or street name
- Export results as CSV or JSON

### Meter Rates
- Find nearest parking meters
- View rates, hours, and payment methods
- Check meter status and availability

### Violation Trends
- Analyze violations by borough and year
- View trend charts and statistics
- Compare data across time periods

## Development

### Project Structure
```
parking-app/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── parking-signs/   # Parking signs search page
│   │   ├── meter-rates/     # Meter rates page
│   │   ├── violation-trends/# Trends dashboard
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Homepage
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── map/             # Map components
│   │   ├── forms/           # Form components
│   │   └── charts/          # Chart components
│   ├── lib/                 # Utilities and configuration
│   │   ├── api.ts           # API client and functions
│   │   ├── types.ts         # TypeScript type definitions
│   │   └── utils.ts         # Utility functions
│   └── hooks/               # Custom React hooks
├── public/                  # Static assets
└── ...config files
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

### Key Features Implementation

#### Map Integration
- Uses Mapbox GL JS for interactive maps
- Custom markers for different data types
- Popup information on marker click
- Geolocation support

#### Data Fetching
- TanStack Query for caching and synchronization
- Automatic retries and error handling
- Background refetching for fresh data

#### Search Functionality
- Address geocoding with OpenStreetMap Nominatim
- Coordinate validation and NYC bounds checking
- Search history and bookmarks storage

#### Export Features
- CSV and JSON export formats
- Filtered data export
- Shareable URLs for locations

## Customization

### Theme Colors
The app uses a NYC-inspired color scheme defined in `globals.css`:
- Primary blues: #1e40af, #3b82f6, #60a5fa
- System-aware dark/light mode
- Custom CSS utilities for gradients

### Map Styling
- Default: Mapbox Streets style
- Customizable through Mapbox Studio
- Responsive markers and popups

### API Configuration
- Base URL configurable via environment
- Timeout and retry settings in `api.ts`
- Error handling with user-friendly messages

## Deployment

### Environment Variables
Set these in your deployment platform:
```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_production_mapbox_token
NEXT_PUBLIC_API_URL=your_production_api_url
```

### Build Optimization
- Automatic code splitting
- Image optimization
- Bundle analysis available with `npm run analyze`

## Troubleshooting

### Common Issues

1. **Map not loading**:
   - Check NEXT_PUBLIC_MAPBOX_TOKEN is set correctly
   - Verify token has required scopes
   - Check browser console for errors

2. **API connection errors**:
   - Ensure backend is running on specified port
   - Check CORS configuration in backend
   - Verify API endpoints are accessible

3. **Search not working**:
   - Check network connectivity
   - Verify coordinates are within NYC bounds
   - Try different search terms or locations

### Debug Mode
- React Query DevTools available in development
- Console logging for API requests/responses
- Error boundaries for graceful error handling

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for new features
3. Include error handling and loading states
4. Test responsiveness on mobile devices
5. Update this README for new features

## License

This project is part of the NYC Smart Parking system and is intended for educational and demonstration purposes.