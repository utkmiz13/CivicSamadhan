/**
 * Global Application State
 */

function getStoredUser() {
  try {
    const raw = localStorage.getItem('civic_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export const appState = {
  currentUser: getStoredUser() || {
    id: 'USR-101',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    phone: '+91 98765 43210',
    role: 'citizen',
    points: 540,
    badge: 'Ward Hero 🥈'
  },
  
  issues: [],
  contractors: [],
  leaderboard: [],
  stats: null,
  activeFilter: 'all',

  // Claimed vouchers history
  claimedVouchers: [
    {
      title: 'Smart City Parking Pass (10 Hours)',
      code: 'CIVIC-PRK-8921',
      date: '2026-10-25',
      points: 150
    }
  ],

  // Integrated Government Civic Portals
  govPortals: [
    {
      id: 'cpgrams',
      name: 'CPGRAMS',
      title: 'Centralized Public Grievance Redress and Monitoring System',
      ministry: 'Department of Administrative Reforms & Public Grievances',
      category: 'Apex National Redressal',
      url: 'https://pgportal.gov.in',
      icon: 'fa-landmark-dome',
      badge: 'National Portal'
    },
    {
      id: 'swachhata',
      name: 'Swachhata Urban',
      title: 'Swachh Bharat Urban Civic Waste Management',
      ministry: 'Ministry of Housing and Urban Affairs (MoHUA)',
      category: 'Solid Waste & Sanitation',
      url: 'https://swachhbharaturban.gov.in',
      icon: 'fa-recycle',
      badge: 'MoHUA Official'
    },
    {
      id: 'nhai',
      name: 'NHAI Rajmargyatra',
      title: 'National Highways Road & Pothole Redressal Portal',
      ministry: 'Ministry of Road Transport and Highways (MoRTH)',
      category: 'Roads & Highways',
      url: 'https://nhai.gov.in',
      icon: 'fa-road',
      badge: 'MoRTH Portal'
    },
    {
      id: 'jaljeevan',
      name: 'Jal Jeevan & CPCB',
      title: 'Central Pollution Control & Clean Water Infrastructure',
      ministry: 'Ministry of Jal Shakti & Central Pollution Control Board',
      category: 'Water & Pipelines',
      url: 'https://cpcb.nic.in',
      icon: 'fa-faucet-drip',
      badge: 'Jal Shakti'
    },
    {
      id: 'discom',
      name: 'National Power Grid / Urja',
      title: 'Urban Electrical Grid & Public Lighting Redressal',
      ministry: 'Ministry of Power (DISCOM Redressal Portal)',
      category: 'Electrical & Lighting',
      url: 'https://www.urjamitra.com',
      icon: 'fa-bolt',
      badge: 'Power Portal'
    }
  ],

  // Rapid Demo Presets
  presets: {
    pothole: {
      key: 'pothole',
      title: 'Deep Asphalt Crater on Ring Road Near Metro Pillar 142',
      category: 'Potholes & Roads',
      imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
      lat: 28.6289,
      lng: 77.2065,
      address: 'Near Metro Pillar 142, Outer Ring Road, New Delhi',
      detected: 'Object: Asphalt Surface Damage (Pothole)',
      conf: '96.4%',
      sev: 'HIGH',
      points: 25
    },
    garbage: {
      key: 'garbage',
      title: 'Overflowing Municipal Dumpster Spilling into Vegetable Market',
      category: 'Sanitation & Waste',
      imageUrl: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&auto=format&fit=crop&q=80',
      lat: 28.4715,
      lng: 77.0524,
      address: 'Sector 14 Main Market, Block B, Gurugram',
      detected: 'Object: Bio-Hazardous Solid Waste Spillage',
      conf: '98.1%',
      sev: 'CRITICAL',
      points: 35
    },
    wire: {
      key: 'wire',
      title: 'Damaged Streetlight Pole with Exposed Overhead High-Voltage Cable',
      category: 'Electrical & Lighting',
      imageUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=800&auto=format&fit=crop&q=80',
      lat: 28.6750,
      lng: 77.2215,
      address: 'Ward 9, Near St. Xavier School, Civil Lines',
      detected: 'Object: Overhead High-Voltage Line Conduit',
      conf: '94.7%',
      sev: 'CRITICAL',
      points: 40
    },
    water: {
      key: 'water',
      title: 'Pressurized Clean Water Pipeline Burst Flooding Residential Lane',
      category: 'Water & Drainage',
      imageUrl: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800&auto=format&fit=crop&q=80',
      lat: 28.5680,
      lng: 77.2430,
      address: 'Jal Vihar Road, Near Water Tank No. 3',
      detected: 'Object: Municipal Pressurized Water Mains Rupture',
      conf: '95.2%',
      sev: 'HIGH',
      points: 30
    }
  }
};
