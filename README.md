# Health Score System

A comprehensive React web application for managing customer health scores in a POS SaaS company. This system is designed for the Head of Customer Success and Hardware teams to track, monitor, and take action on merchant health metrics.

## Features

### 🎯 Metrics Management
- Configure custom health score metrics with weights
- Support for manual entry and file upload data sources
- Real-time weight validation (ensures total equals 100%)
- Add, edit, and delete metrics dynamically

### 📊 Field Configuration
- Customize data fields for merchant profiles
- Flexible field management system
- Support for various data types and formats

### 🚦 Scorecard & Actions
- Define score ranges with color-coded status levels
- Configure automated actions for each score range
- Green (90-100): No action needed
- Yellow (70-89): Follow-up call required
- Red (0-69): Urgent escalation needed

### 👥 Merchant Profiles
- View comprehensive merchant health dashboard
- Visual score indicators with progress bars
- Status-based color coding
- Export capabilities for reporting
- CSV upload functionality for bulk data import

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Build Tool**: Vite
- **State Management**: React Hooks (useState)

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd health-score-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## Usage

### Setting Up Metrics
1. Navigate to the "Metrics Management" tab
2. Add or modify health score metrics
3. Assign appropriate weights (must total 100%)
4. Choose input type (manual entry or file upload)

### Configuring Score Ranges
1. Go to "Scorecard & Actions" tab
2. Define score ranges and corresponding actions
3. Set up automated workflows for each status level

### Managing Merchant Data
1. Use the "Merchant Profiles" tab to view current health scores
2. Upload CSV files for bulk data import
3. Monitor status distribution with the dashboard overview
4. Export reports for stakeholder communication

## Project Structure

```
src/
├── components/ui/          # shadcn/ui components
├── lib/                    # Utility functions
├── HealthScoreApp.tsx      # Main application component
├── App.tsx                 # Root component
├── main.tsx               # Application entry point
└── index.css              # Global styles
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software for internal company use.

## Support

For technical support or feature requests, please contact the development team.
