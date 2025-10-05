import 'antd/dist/reset.css';
import React from 'react';

export const metadata = {
  title: 'Project Fill API',
  description: 'API service for structured project intelligence filling'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
