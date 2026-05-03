// components/SEO.tsx
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  noindex?: boolean;
}

export const SEO = ({ 
  title, 
  description, 
  canonical, 
  image, 
  noindex 
}: SEOProps) => {
  const siteTitle = "GreenyDoc | AI диагностика растений";
  const fullTitle = title ? `${title} | GreenyDoc` : siteTitle;
  const defaultDescription = "AI диагностика болезней растений по фотографии. Определите заболевание и получите рекомендации по лечению.";
  const defaultImage = "https://greenydoc.com/og-image.jpg";

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDescription} />
      
      {canonical && <link rel="canonical" href={canonical} />}
      
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:image" content={image || defaultImage} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || defaultDescription} />
      <meta name="twitter:image" content={image || defaultImage} />
    </Helmet>
  );
};