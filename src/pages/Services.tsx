import { ShieldCheck } from 'lucide-react';
import { PageIntro,ServiceCard } from '../components/BrandLayout';
import { serviceData } from '../content/siteContent';

export default function Services(){return <><PageIntro eyebrow="What we do" title="Research support for clearer decisions." lead="From the first research question to the final report, we help you build a sound approach, understand your data and communicate findings clearly."/><section className="section"><div className="container"><div className="service-grid">{serviceData.map(s=><ServiceCard key={s.slug} s={s}/>)}</div><div className="callout"><ShieldCheck/><div><h3>Ethical, transparent and collaborative</h3><p>We support your process and capability. We do not replace a researcher’s authorship or promise funding, publication or specific outcomes.</p></div></div></div></section></>}
