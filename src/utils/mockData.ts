
export interface Attendee {
  id: string;
  ticketID: string;
  nombre: string;
  email: string;
  empresa: string;
  ingresos: {
    hora: string;
    dispositivo: string;
  }[];
  status: 'valid' | 'used';
}

// Generate mock attendees
export const mockAttendees: Attendee[] = [
  {
    id: '1',
    ticketID: 'CLIENT-3A9B-2024',
    nombre: 'Ana Pérez',
    email: 'ana.perez@empresa.com',
    empresa: 'Acme Corp',
    ingresos: [
      {
        hora: '2024-05-15T18:30:00Z',
        dispositivo: 'Terminal-1'
      }
    ],
    status: 'used'
  },
  {
    id: '2',
    ticketID: 'CLIENT-7C2D-2024',
    nombre: 'Carlos Rodríguez',
    email: 'carlos.rodriguez@empresa.com',
    empresa: 'Tech Solutions',
    ingresos: [],
    status: 'valid'
  },
  {
    id: '3',
    ticketID: 'CLIENT-1F5G-2024',
    nombre: 'María Gómez',
    email: 'maria@empresa.com',
    empresa: 'Innovación SA',
    ingresos: [],
    status: 'valid'
  },
  {
    id: '4',
    ticketID: 'CLIENT-8H3J-2024',
    nombre: 'Juan Martínez',
    email: 'juan.martinez@empresa.com',
    empresa: 'Global Services',
    ingresos: [
      {
        hora: '2024-05-15T19:15:00Z',
        dispositivo: 'Terminal-2'
      }
    ],
    status: 'used'
  },
  {
    id: '5',
    ticketID: 'CLIENT-5K9L-2024',
    nombre: 'Sofia Torres',
    email: 'sofia.torres@empresa.com',
    empresa: 'Desarrollo Digital',
    ingresos: [],
    status: 'valid'
  }
];

// Function to get mock QR codes for display
export const getMockQRCodes = () => {
  return mockAttendees
    .filter(attendee => attendee.status === 'valid')
    .map(attendee => attendee.ticketID);
};

// Authentication functions
export const mockLogin = (email: string): Promise<{ success: boolean; message: string }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (email && email.includes('@')) {
        resolve({ success: true, message: 'Magic link sent! For demo purposes, you will be logged in automatically.' });
      } else {
        resolve({ success: false, message: 'Please enter a valid email address.' });
      }
    }, 1000);
  });
};
