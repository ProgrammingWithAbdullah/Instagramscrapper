import "./globals.css";

export const metadata = {
  title: "Instagram Scrapper",
  description: "Local dashboard for tracking public Instagram accounts via Business Discovery.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
