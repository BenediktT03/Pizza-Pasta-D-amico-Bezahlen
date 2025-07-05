export const metadata = {
  title: 'EATECH - Foodtruck Revolution',
  description: 'Das ultimative Foodtruck Management System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ margin: 0, background: '#0A0A0A', color: '#fff' }}>
        {children}
      </body>
    </html>
  )
}
