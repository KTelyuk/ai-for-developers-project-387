import { Navigate, Route, Routes } from 'react-router';
import { SiteHeader } from '@/components/SiteHeader.tsx';
import { AdminBookingsPage } from '@/pages/AdminBookingsPage.tsx';
import { AdminEventTypesPage } from '@/pages/AdminEventTypesPage.tsx';
import { BookingPage } from '@/pages/BookingPage.tsx';
import { BookPage } from '@/pages/BookPage.tsx';
import { EditBookingPage } from '@/pages/EditBookingPage.tsx';
import { HomePage } from '@/pages/HomePage.tsx';
import { NotFoundPage } from '@/pages/NotFoundPage.tsx';

function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/book" element={<BookPage />} />
          <Route path="/bookings/:id" element={<BookingPage />} />
          <Route path="/bookings/:id/edit" element={<EditBookingPage />} />
          <Route path="/admin" element={<Navigate to="/admin/event-types" replace />} />
          <Route path="/admin/event-types" element={<AdminEventTypesPage />} />
          <Route path="/admin/bookings" element={<AdminBookingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
