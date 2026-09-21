import "./globals.css";

export const metadata = {
  title: "Maliarca — Gestiune Vopsire",
  description: "Stoc materiale si evidenta masinilor vopsite",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
