import React from 'react';
import { Helmet } from 'react-helmet-async';

interface JsonLdProps {
  data: Record<string, any>;
}

export const JsonLd = ({ data }: JsonLdProps) => {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(data)}
      </script>
    </Helmet>
  );
};