import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { BRAND, email, phone, serviceData, servicesHref } from './content/siteContent';
import { Header, Footer, WhatsApp, CookieConsent, ScrollTop } from './components/BrandLayout';
import Home from './pages/Home';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import WhoWeServe from './pages/WhoWeServe';
import CaseStudies from './pages/CaseStudies';
import About from './pages/About';
import Team from './pages/Team';
import Pricing from './pages/Pricing';
import Blog from './pages/Blog';
import BlogPostRoute from './pages/BlogPostRoute';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import TrackProject from './pages/TrackProject';
import Legal from './pages/Legal';
import NotFound from './pages/NotFound';
import Admin from './pages/Admin';

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const pageTitle = location.pathname === '/'
    ? BRAND
    : `${location.pathname.split('/').filter(Boolean).map((part) => part.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())).join(' · ')} | ${BRAND}`;

  useEffect(() => {
    document.title = pageTitle;
    const descriptions: Record<string, string> = {
      '/': 'Research design, data analysis, visualisation, monitoring and evaluation, and publishing support in Kenya.',
      '/services': 'Explore Datalab Research Consulting services for academic researchers and organisations.',
      '/contact': 'Discuss your research or data consulting project with Datalab Research Consulting.',
    };
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', descriptions[location.pathname] || 'Practical research consulting, data analysis and actionable insights from Datalab Research Consulting.');
  }, [location.pathname, pageTitle]);

  if (isAdmin) return <Routes><Route path="/admin" element={<Admin />} /></Routes>;

  return <>
    <ScrollTop />
    <Header />
    <main key={location.pathname} className="page-transition"><Routes>
      <Route path="/" element={<Home />} />
      <Route path="/services" element={<Services />} />
      {serviceData.map((service) => <Route key={service.slug} path={servicesHref(service.slug)} element={<ServiceDetail slug={service.slug} />} />)}
      <Route path="/who-we-serve" element={<WhoWeServe />} />
      <Route path="/case-studies" element={<CaseStudies />} />
      <Route path="/about" element={<About />} />
      <Route path="/team" element={<Team />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:id" element={<BlogPostRoute />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/track" element={<TrackProject />} />
      <Route path="/privacy-policy" element={<Legal kind="privacy-policy" />} />
      <Route path="/terms-and-conditions" element={<Legal kind="terms-and-conditions" />} />
      <Route path="/confidentiality-policy" element={<Legal kind="confidentiality-policy" />} />
      <Route path="*" element={<NotFound />} />
    </Routes></main>
    <Footer /><WhatsApp /><CookieConsent />
    <script type="application/ld+json">{JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Organization', name: BRAND,
      url: window.location.origin,
      description: 'Research design, data analysis, visualisation, monitoring and evaluation, and scholarly publishing support.',
      email, telephone: phone, sameAs: ['https://www.facebook.com/Datalabresearchconsulting'],
    })}</script>
  </>;
}
