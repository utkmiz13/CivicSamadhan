/**
 * Global Application State & Presets
 */

export const appState = {
  currentRole: 'citizen',
  issues: [],
  contractors: [],
  leaderboard: [],
  stats: null,
  activeFilter: 'all',
  
  // Citizen session details
  user: {
    id: 'USR-101',
    name: 'Aarav Sharma',
    points: 540,
    badge: 'Ward Hero 🥈'
  },

  // Rapid Demo Presets
  presets: {
    pothole: {
      key: 'pothole',
      title: 'Severe Asphalt Crater on Outer Ring Road Pillar 142',
      category: 'Potholes & Roads',
      imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
      lat: 28.6289,
      lng: 77.2065,
      address: 'Near Metro Pillar 142, Outer Ring Road, New Delhi',
      detected: 'Object: Asphalt Surface Pothole (~12cm depth)',
      conf: '96.4%',
      sev: 'HIGH'
    },
    garbage: {
      key: 'garbage',
      title: 'Municipal Solid Waste Overflow Near Community Market',
      category: 'Sanitation & Waste',
      imageUrl: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&auto=format&fit=crop&q=80',
      lat: 28.4715,
      lng: 77.0524,
      address: 'Sector 14 Main Market, Block B, Gurugram',
      detected: 'Object: Bio-Hazardous Waste Spillage',
      conf: '98.1%',
      sev: 'CRITICAL'
    },
    wire: {
      key: 'wire',
      title: 'Overhead Electrical Cable Hanging Near School Crosswalk',
      category: 'Electrical & Lighting',
      imageUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=800&auto=format&fit=crop&q=80',
      lat: 28.6750,
      lng: 77.2215,
      address: 'Ward 9, Near St. Xavier School, Civil Lines',
      detected: 'Object: Exposed High-Voltage Line Conduit',
      conf: '94.7%',
      sev: 'CRITICAL'
    },
    water: {
      key: 'water',
      title: 'High-Pressure Potable Water Line Breach Flooding Road',
      category: 'Water & Drainage',
      imageUrl: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800&auto=format&fit=crop&q=80',
      lat: 28.5680,
      lng: 77.2430,
      address: 'Jal Vihar Road, Near Water Tank No. 3',
      detected: 'Object: Municipal Clean Water Pipeline Rupture',
      conf: '95.2%',
      sev: 'HIGH'
    }
  }
};

