// Предмет разговора как обычный текст: React экранирует разметку, переносы строк сохраняются.
export function BookingSubject({ subject }: { subject?: string }) {
  if (!subject) return null;
  return <span className="break-words whitespace-pre-wrap">{subject}</span>;
}
