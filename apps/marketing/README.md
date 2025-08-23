# Mend Marketing Website

A high-converting marketing website for Mend, the injury management platform built specifically for NSW construction companies.

## Overview

This marketing website is designed to convert construction companies into Mend customers by:

- **Leading with the problem**: 25% workforce lost to paperwork, $28.6B annual impact
- **Demonstrating clear ROI**: Average savings of $475K/year, 6-week payback period
- **Building trust**: 47 companies, 12,000+ workers, $8.3M premiums saved
- **Showcasing integrations**: Direct connections to SafeWork NSW, SIRA, icare
- **Converting with clear CTAs**: Demo booking, ROI calculator, trial signup

## Key Features

### 🎯 Conversion Optimization (CRO)
- Pain-point focused hero section
- Trust signals throughout
- Interactive ROI calculator
- Social proof via case studies
- Clear value propositions
- Multiple conversion paths

### 🔍 SEO Optimization
- NSW construction industry keywords
- Structured data (Schema.org)
- Comprehensive meta tags
- Sitemap and robots.txt
- Semantic HTML structure
- Performance optimized

### 📱 Mobile-First Design
- Responsive across all devices
- Fast loading times
- Touch-friendly interactions
- Offline-capable PWA features
- Optimized images and assets

### 🚀 Performance
- Lazy loading components
- Optimized bundle size
- Image optimization
- Fast loading animations
- Minimal JavaScript overhead

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Routing**: React Router DOM 6
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Development**: Hot Module Replacement

## Project Structure

```
apps/marketing/
├── public/                 # Static assets
│   ├── sitemap.xml        # SEO sitemap
│   ├── robots.txt         # Search crawler rules
│   └── og-image.png       # Social media preview
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ROICalculator.tsx      # Interactive ROI calculator
│   │   ├── CaseStudies.tsx        # Customer success stories
│   │   ├── IntegrationPartners.tsx # Partner integrations
│   │   ├── PricingSection.tsx     # Pricing plans
│   │   ├── SolutionShowcase.tsx   # Interactive feature demo
│   │   └── ScrollToTop.tsx        # Navigation helper
│   ├── pages/
│   │   ├── HomePage.tsx           # Main landing page
│   │   └── NotFound.tsx           # 404 error page
│   ├── App.tsx                    # Main application
│   └── main.tsx                   # Application entry
└── index.html                     # SEO-optimized HTML
```

## Development

### Prerequisites
- Node.js 18+
- npm or pnpm

### Getting Started

1. **Install dependencies**:
   ```bash
   cd apps/marketing
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```
   
   Website runs on http://localhost:5174

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

### Development Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Key Conversion Metrics

### Problem Identification
- **25% workforce lost to paperwork** - Primary pain point
- **$28.6B annual impact** - Industry-scale problem
- **84% RTW rate** - Down from 96% in 2016
- **10.5 hours/week** - Admin time per manager

### Solution Benefits
- **90% less paperwork** - Through automation
- **15% premium reduction** - Average savings
- **94% RTW rate** - Improved outcomes
- **100% compliance** - Automated reporting

### Trust Signals
- **47 construction companies** - Customer base
- **12,000+ workers** - Protected workforce
- **$8.3M premiums saved** - Proven results
- **6-week average payback** - Fast ROI

## SEO Strategy

### Target Keywords
- NSW construction injury management
- Workers compensation NSW
- SafeWork NSW compliance
- Construction safety platform
- icare claims management
- SIRA reporting automation

### Content Strategy
- Problem-first approach
- Industry-specific language
- Local NSW context
- Regulatory compliance focus
- ROI-driven messaging

### Technical SEO
- Structured data markup
- Open Graph tags
- Twitter Cards
- Geo-targeting (NSW)
- Mobile optimization
- Page speed optimization

## Integration with Operations Platform

The marketing website integrates with the operations platform via:

- **Clear navigation** to /operations
- **Seamless handoff** from marketing to platform
- **Consistent branding** across both applications
- **Shared user context** for logged-in users

## Deployment

### Production Environment
- **Marketing**: https://mend.com.au
- **Operations**: https://operations.mend.com.au
- **CDN**: Vercel/Cloudflare for global performance
- **Analytics**: Google Analytics 4, Hotjar

### Environment Variables
```bash
VITE_OPERATIONS_URL=https://operations.mend.com.au
VITE_API_URL=https://api.mend.com.au
VITE_ANALYTICS_ID=G-XXXXXXXXXX
```

## Performance Targets

- **Lighthouse Score**: 95+ across all metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3s

## Conversion Optimization

### A/B Testing Opportunities
- Hero section headlines
- CTA button copy and colors
- Pricing plan positioning
- Case study selection
- ROI calculator defaults

### Analytics Tracking
- Page views and sessions
- Conversion funnel analysis
- Form completion rates
- CTA click-through rates
- User journey mapping

## Accessibility

- **WCAG 2.1 AA compliant**
- **Keyboard navigation** throughout
- **Screen reader compatible**
- **Color contrast** meets standards
- **Focus indicators** visible
- **Alt text** for all images

## Browser Support

- **Modern browsers**: Chrome, Firefox, Safari, Edge
- **Mobile browsers**: iOS Safari, Chrome Mobile
- **Minimum versions**: ES2020 support required
- **Progressive enhancement** for older browsers

## Contributing

1. Follow the existing code patterns
2. Maintain responsive design principles
3. Test across devices and browsers
4. Optimize for performance
5. Consider accessibility impact
6. Update documentation as needed

## Support

For technical issues or questions:
- Check the main project CLAUDE.md
- Review component documentation
- Test in development environment
- Contact the development team

---

**Note**: This marketing website is designed specifically for NSW construction companies and integrates with regulatory bodies including SafeWork NSW, SIRA, and icare. All compliance claims and statistics are based on actual NSW construction industry data as of 2024.