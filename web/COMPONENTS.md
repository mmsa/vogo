# Vogo Component Reference

## Component Hierarchy

```
App
├── ThemeProvider
│   └── div (min-h-screen bg-zinc-50 dark:bg-zinc-950)
│       ├── AppHeader
│       │   ├── Logo (gradient pill)
│       │   ├── Navigation (Dashboard, Memberships, Benefits, Recommendations)
│       │   ├── Search Input
│       │   ├── ModeToggle (Sun/Moon)
│       │   └── User Avatar
│       │
│       └── AppShell
│           └── Routes
│               ├── Dashboard
│               ├── Memberships
│               ├── Benefits
│               └── Recommendations
```

---

## Base UI Components

### Button
**Path**: `src/components/ui/Button.tsx`

**Variants**: `primary` | `secondary` | `ghost` | `outline`
**Sizes**: `sm` | `md` | `lg`

```tsx
<Button variant="primary" size="md">Click me</Button>
```

### Card
**Path**: `src/components/ui/Card.tsx`

**Sub-components**: CardHeader, CardTitle, CardDescription, CardContent, CardFooter

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>Footer actions</CardFooter>
</Card>
```

### Badge
**Path**: `src/components/ui/Badge.tsx`

**Variants**: `default` | `success` | `warning` | `secondary`

```tsx
<Badge variant="success">Active</Badge>
```

### Input
**Path**: `src/components/ui/Input.tsx`

```tsx
<Input type="text" placeholder="Search..." />
```

### Dialog
**Path**: `src/components/ui/Dialog.tsx`

**Sub-components**: DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, DialogClose

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogClose onClose={() => setIsOpen(false)} />
  <DialogHeader>
    <DialogTitle>Title</DialogTitle>
    <DialogDescription>Description</DialogDescription>
  </DialogHeader>
  <DialogContent>Content</DialogContent>
  <DialogFooter>
    <Button>Action</Button>
  </DialogFooter>
</Dialog>
```

### Alert
**Path**: `src/components/ui/Alert.tsx`

**Variants**: `info` | `warning`
**Sub-components**: AlertTitle, AlertDescription

```tsx
<Alert variant="warning">
  <AlertTitle>Warning</AlertTitle>
  <AlertDescription>Description</AlertDescription>
</Alert>
```

### Accordion
**Path**: `src/components/ui/Accordion.tsx`

```tsx
<Accordion>
  <AccordionItem title="Section 1" description="5 items" defaultOpen>
    Content here
  </AccordionItem>
  <AccordionItem title="Section 2">
    More content
  </AccordionItem>
</Accordion>
```

### Switch
**Path**: `src/components/ui/Switch.tsx`

```tsx
<Switch checked={isChecked} onChange={setIsChecked} />
```

### Skeleton
**Path**: `src/components/ui/Skeleton.tsx`

```tsx
<Skeleton className="h-32 w-full" />
```

---

## Feature Components

### StatCard
**Path**: `src/components/StatCard.tsx`

```tsx
<StatCard
  icon={CreditCard}
  label="Active Memberships"
  value={5}
  iconColor="bg-primary/10 text-primary"
  delay={100}
/>
```

### SectionHeader
**Path**: `src/components/SectionHeader.tsx`

```tsx
<SectionHeader
  title="Memberships"
  description="Manage your memberships"
  action={<Button>Add New</Button>}
/>
```

### MembershipCard
**Path**: `src/components/MembershipCard.tsx`

```tsx
<MembershipCard
  membership={membership}
  isAdded={false}
  isChecking={false}
  onToggle={() => {}}
/>
```

### BenefitCard
**Path**: `src/components/BenefitCard.tsx`

```tsx
<BenefitCard benefit={benefit} />
```

### RecommendationCard
**Path**: `src/components/RecommendationCard.tsx`

```tsx
<RecommendationCard
  recommendation={recommendation}
  delay={100}
/>
```

---

## Layout Components

### AppHeader
**Path**: `src/components/AppHeader.tsx`

Sticky header with:
- Logo (gradient pill)
- Navigation with icons
- Search bar (desktop)
- Dark mode toggle
- User avatar

### AppShell
**Path**: `src/components/AppShell.tsx`

Max-width container with responsive padding

---

## Hooks

### useTheme
**Path**: `src/hooks/use-theme.tsx`

```tsx
const { theme, setTheme, actualTheme } = useTheme()

// theme: 'light' | 'dark' | 'system'
// actualTheme: 'light' | 'dark'
setTheme('dark') // or 'light' or 'system'
```

---

## Utilities

### cn (classnames)
**Path**: `src/lib/utils.ts`

Merges Tailwind classes intelligently

```tsx
cn('bg-red-500', 'bg-blue-500') // → 'bg-blue-500'
cn('px-4', className) // Merge with prop
```

### formatCurrency
```tsx
formatCurrency(100) // → '£100'
formatCurrency(1234) // → '£1,234'
```

### formatSavingRange
```tsx
formatSavingRange(50, 100) // → '£50 - £100'
formatSavingRange(50, 50) // → '£50'
formatSavingRange(50, undefined) // → 'From £50'
```

### truncate
```tsx
truncate('Long text...', 20) // → 'Long text...'
```

---

## Theme Configuration

### Colors
```javascript
primary: '#5B4BFB'  // Indigo
accent: '#22C55E'   // Green
zinc: '...'         // Gray scale
```

### Animations
```javascript
'fade-in'   // 0.5s ease-in-out
'slide-up'  // 0.5s ease-out
'scale-in'  // 0.3s ease-out
```

### Shadows
```javascript
'shadow-card'       // 0 8px 30px rgba(0,0,0,0.06)
'shadow-card-hover' // 0 12px 40px rgba(0,0,0,0.08)
```

---

## Page Components

### Dashboard
**Features**:
- Greeting (time-based)
- Stat cards (animated)
- Quick actions
- Recent recommendations
- Empty state

### Memberships
**Features**:
- Search bar
- Category filters
- Grid of membership cards
- Add modal with smart check
- Empty state

### Benefits
**Features**:
- Accordion by membership
- Benefit cards
- Sticky sidebar (XL+)
- Overview stats
- Empty state

### Recommendations
**Features**:
- Mode toggle (Rule/AI)
- Recommendation cards
- Relevant benefits (AI mode)
- Loading states
- Empty state

---

## Icons

Using **Lucide React**: https://lucide.dev/

Common icons:
- `CreditCard` - Memberships
- `Gift` - Benefits
- `Lightbulb` - Recommendations
- `LayoutDashboard` - Dashboard
- `Search` - Search
- `Plus` - Add
- `Sun` / `Moon` - Theme toggle
- `User` - Profile
- `Sparkles` - AI
- `ArrowUpRight` - External link
- `Info` - Information
- `AlertCircle` - Warning
- `Check` - Success
- `X` - Close
- `ChevronDown` - Accordion

---

## Animation Patterns

### Staggered Entrance
```tsx
{items.map((item, index) => (
  <div
    key={item.id}
    className="animate-fade-in"
    style={{ animationDelay: `${index * 50}ms` }}
  >
    {item.content}
  </div>
))}
```

### Hover Scale
```tsx
<Card className="hover:scale-105 transition-transform">
  Content
</Card>
```

### Loading State
```tsx
{loading ? (
  <Skeleton className="h-32" />
) : (
  <ActualContent />
)}
```

---

## Responsive Patterns

### Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => <Card key={item.id}>{item}</Card>)}
</div>
```

### Sticky Sidebar
```tsx
<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
  <div className="xl:col-span-2">Main content</div>
  <div className="sticky top-24">Sidebar</div>
</div>
```

### Flex Wrap
```tsx
<div className="flex flex-col sm:flex-row gap-4">
  <div className="flex-1">Item 1</div>
  <div className="flex-1">Item 2</div>
</div>
```

---

## Best Practices

1. **Use semantic HTML**: `<button>`, `<nav>`, `<header>`, `<main>`
2. **Add aria-labels**: For screen readers
3. **Include loading states**: Skeleton or spinner
4. **Provide empty states**: With helpful CTAs
5. **Use consistent spacing**: `space-y-6`, `gap-6`
6. **Add hover effects**: Scale, shadow, color change
7. **Include focus rings**: For keyboard navigation
8. **Support dark mode**: Use `dark:` prefix
9. **Make responsive**: Mobile-first approach
10. **Animate smoothly**: Use `transition-all` or CSS animations

---

## Quick Reference

**Import UI components**:
```tsx
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
```

**Import icons**:
```tsx
import { CreditCard, Gift, Lightbulb } from 'lucide-react'
```

**Import utilities**:
```tsx
import { cn } from '@/lib/utils'
import { api, CURRENT_USER_ID } from '@/lib/api'
```

**Use theme**:
```tsx
import { useTheme } from '@/hooks/use-theme'
const { theme, setTheme } = useTheme()
```

---

For more details, check:
- **SETUP.md** - Installation guide
- **UI_UPGRADE_SUMMARY.md** - Complete feature list

