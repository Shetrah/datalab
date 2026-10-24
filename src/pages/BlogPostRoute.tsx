import {  } from 'lucide-react';
import { Link,useLocation } from 'react-router-dom';
import BlogPost from './BlogPost';

export default function BlogPostRoute(){const loc=useLocation();const id=loc.pathname.split('/').pop()||'1';return <BlogPost id={id}/>}
