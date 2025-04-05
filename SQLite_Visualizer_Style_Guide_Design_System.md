# SQLite Visualizer Style Guide & Design System

## 1. Introduction

This style guide and design system outlines the visual and interactive elements of the SQLite Visualizer application. It serves as a reference to ensure consistency in design implementation across the entire application.

### 1.1 Purpose

This document provides guidelines for:
- Visual design elements (colors, typography, spacing)
- Component styling and behavior
- Data visualization standards
- Interactive patterns
- Responsive design considerations

### 1.2 Design Philosophy

The SQLite Visualizer adheres to the following design principles:
- **Clarity**: Present data in a clean, uncluttered manner
- **Efficiency**: Optimize for quick understanding and interaction
- **Consistency**: Maintain uniform patterns throughout the application
- **Accessibility**: Ensure usability for all team members regardless of technical expertise

## 2. Color System

### 2.1 Primary Colors

| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Primary | `#2563EB` | `blue-600` | Primary actions, active states, links |
| Primary Dark | `#1E40AF` | `blue-800` | Hover states, emphasis |
| Primary Light | `#DBEAFE` | `blue-100` | Backgrounds, highlighting |

### 2.2 Neutral Colors

| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Background | `#FFFFFF` | `white` | Page background |
| Surface | `#F8FAFC` | `slate-50` | Card backgrounds, panels |
| Border | `#E2E8F0` | `slate-200` | Dividers, borders |
| Text Primary | `#0F172A` | `slate-900` | Primary text |
| Text Secondary | `#64748B` | `slate-500` | Secondary text, labels |
| Text Tertiary | `#94A3B8` | `slate-400` | Placeholders, disabled text |

### 2.3 Semantic Colors

| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Success | `#10B981` | `emerald-500` | Success states, positive values |
| Warning | `#F59E0B` | `amber-500` | Warning states, alerts |
| Error | `#EF4444` | `red-500` | Error states, negative values |
| Info | `#0EA5E9` | `sky-500` | Information, neutral alerts |

### 2.4 Chart Colors

A set of 10 distinct colors for data visualization, ensuring accessibility and clear differentiation:

| Name | Hex | Tailwind |
|------|-----|----------|
| Chart-1 | `#2563EB` | `blue-600` |
| Chart-2 | `#D946EF` | `fuchsia-500` |
| Chart-3 | `#F59E0B` | `amber-500` |
| Chart-4 | `#10B981` | `emerald-500` |
| Chart-5 | `#6366F1` | `indigo-500` |
| Chart-6 | `#EF4444` | `red-500` |
| Chart-7 | `#8B5CF6` | `violet-500` |
| Chart-8 | `#EC4899` | `pink-500` |
| Chart-9 | `#06B6D4` | `cyan-500` |
| Chart-10 | `#84CC16` | `lime-500` |

## 3. Typography

### 3.1 Font Family

**Primary Font**: Inter (Sans-serif)
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

Tailwind configuration:
```js
fontFamily: {
  sans: ['Inter', ...defaultTheme.fontFamily.sans],
}
```

### 3.2 Type Scale

| Name | Size | Line Height | Tailwind | Usage |
|------|------|-------------|----------|-------|
| Display | 30px | 36px | `text-3xl` | Page titles |
| Heading 1 | 24px | 32px | `text-2xl` | Section titles |
| Heading 2 | 20px | 28px | `text-xl` | Subsection titles |
| Heading 3 | 16px | 24px | `text-base` | Card titles, field labels |
| Body | 14px | 20px | `text-sm` | Primary body text |
| Caption | 12px | 16px | `text-xs` | Supporting text, metadata |
| Small | 10px | 14px | `text-[10px]` | Footnotes, legal |

### 3.3 Font Weights

| Weight | Tailwind | Usage |
|--------|----------|-------|
| Regular (400) | `font-normal` | Body text, general content |
| Medium (500) | `font-medium` | Emphasis, labels, headers |
| Semibold (600) | `font-semibold` | Headers, buttons, strong emphasis |

### 3.4 Text Colors

Follow the neutral colors system, with:
- `slate-900` for primary text
- `slate-500` for secondary text
- `slate-400` for tertiary/disabled text
- `blue-600` for interactive text elements

## 4. Spacing System

The spacing system follows Tailwind's default scale, with emphasis on these key values:

| Name | Value | Tailwind | Usage |
|------|-------|----------|-------|
| 2XS | 4px | `p-1` `m-1` | Minimal spacing, icons |
| XS | 8px | `p-2` `m-2` | Tight spacing, compact elements |
| S | 12px | `p-3` `m-3` | Default inner padding |
| M | 16px | `p-4` `m-4` | Standard spacing, section margins |
| L | 24px | `p-6` `m-6` | Generous spacing, section padding |
| XL | 32px | `p-8` `m-8` | Layout spacing, large gaps |
| 2XL | 48px | `p-12` `m-12` | Major section divisions |

## 5. Shadows & Elevation

| Name | Tailwind | Usage |
|------|----------|-------|
| None | `shadow-none` | Flat elements |
| Low | `shadow-sm` | Cards, subtle elevation |
| Medium | `shadow` | Dropdowns, popovers |
| High | `shadow-md` | Modals, floating elements |
| Focus | `ring-2 ring-blue-500 ring-opacity-50` | Interactive elements in focus state |

## 6. Border Radius

| Name | Value | Tailwind | Usage |
|------|-------|----------|-------|
| None | 0 | `rounded-none` | Tables, certain UI elements |
| Small | 4px | `rounded-sm` | Inputs, buttons, small elements |
| Medium | 6px | `rounded` | Cards, larger containers |
| Large | 8px | `rounded-md` | Modals, prominent elements |
| Full | 9999px | `rounded-full` | Pills, tags, circular buttons |

## 7. Component Styling

### 7.1 Buttons

#### Primary Button
```html
<button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 
               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 
               transition-colors font-medium text-sm">
  Button Text
</button>
```

#### Secondary Button
```html
<button class="px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded 
               hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 
               focus:ring-opacity-50 transition-colors font-medium text-sm">
  Button Text
</button>
```

#### Tertiary Button (Text)
```html
<button class="px-3 py-1.5 text-blue-600 rounded hover:bg-blue-50 
               focus:outline-none focus:ring-2 focus:ring-blue-500 
               focus:ring-opacity-50 transition-colors font-medium text-sm">
  Button Text
</button>
```

#### Icon Button
```html
<button class="p-2 text-slate-500 rounded hover:bg-slate-100 
               focus:outline-none focus:ring-2 focus:ring-blue-500 
               focus:ring-opacity-50 transition-colors">
  <svg><!-- Icon --></svg>
</button>
```

### 7.2 Input Fields

#### Text Input
```html
<div class="space-y-1">
  <label class="block text-sm font-medium text-slate-700">Label</label>
  <input type="text" 
         class="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm 
                text-slate-900 placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 
                focus:border-blue-500">
  <p class="text-xs text-slate-500">Helper text</p>
</div>
```

#### Select Dropdown
```html
<div class="space-y-1">
  <label class="block text-sm font-medium text-slate-700">Label</label>
  <select class="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm 
                 text-slate-900 bg-white
                 focus:outline-none focus:ring-2 focus:ring-blue-500 
                 focus:border-blue-500 appearance-none">
    <option>Option 1</option>
    <option>Option 2</option>
  </select>
</div>
```

#### Checkbox
```html
<div class="flex items-center">
  <input type="checkbox" 
         class="h-4 w-4 text-blue-600 border-slate-300 rounded 
                focus:ring-blue-500">
  <label class="ml-2 text-sm text-slate-700">
    Checkbox label
  </label>
</div>
```

### 7.3 Cards & Containers

#### Standard Card
```html
<div class="bg-white border border-slate-200 rounded p-4 
            shadow-sm">
  Card content
</div>
```

#### Interactive Card
```html
<div class="bg-white border border-slate-200 rounded p-4 
            shadow-sm hover:shadow transition-shadow">
  Interactive card content
</div>
```

#### Section Container
```html
<section class="bg-white border border-slate-200 rounded-md p-6">
  <h2 class="text-xl font-semibold text-slate-900 mb-4">Section Title</h2>
  <div>
    Section content
  </div>
</section>
```

### 7.4 Navigation Elements

#### Tab Bar
```html
<div class="border-b border-slate-200">
  <nav class="flex space-x-6">
    <a class="py-3 border-b-2 border-blue-600 font-medium text-sm text-blue-600">
      Active Tab
    </a>
    <a class="py-3 border-b-2 border-transparent font-medium text-sm text-slate-500 
              hover:text-slate-700 hover:border-slate-300">
      Inactive Tab
    </a>
  </nav>
</div>
```

#### Pagination
```html
<nav class="flex items-center justify-between py-3">
  <button class="px-3 py-1 border border-slate-300 rounded-sm text-sm text-slate-700
                 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
    Previous
  </button>
  <div class="flex space-x-1">
    <button class="px-3 py-1 border border-blue-600 rounded-sm text-sm 
                   bg-blue-50 text-blue-600 font-medium">1</button>
    <button class="px-3 py-1 border border-slate-300 rounded-sm text-sm 
                   text-slate-700 hover:bg-slate-50">2</button>
  </div>
  <button class="px-3 py-1 border border-slate-300 rounded-sm text-sm text-slate-700
                 hover:bg-slate-50">
    Next
  </button>
</nav>
```

### 7.5 Data Tables

#### Table Styling
```html
<div class="overflow-x-auto">
  <table class="min-w-full divide-y divide-slate-200">
    <thead>
      <tr class="bg-slate-50">
        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
          Column Header
        </th>
        <!-- More headers -->
      </tr>
    </thead>
    <tbody class="bg-white divide-y divide-slate-200">
      <tr class="hover:bg-slate-50">
        <td class="px-4 py-3 text-sm text-slate-900">
          Cell content
        </td>
        <!-- More cells -->
      </tr>
      <!-- More rows -->
    </tbody>
  </table>
</div>
```

### 7.6 Alert & Notification Styles

#### Info Alert
```html
<div class="p-4 rounded-md bg-blue-50 border border-blue-200">
  <div class="flex">
    <div class="flex-shrink-0 text-blue-400">
      <!-- Info icon -->
    </div>
    <div class="ml-3">
      <p class="text-sm text-blue-700">Information message</p>
    </div>
  </div>
</div>
```

#### Success Alert
```html
<div class="p-4 rounded-md bg-emerald-50 border border-emerald-200">
  <div class="flex">
    <div class="flex-shrink-0 text-emerald-400">
      <!-- Success icon -->
    </div>
    <div class="ml-3">
      <p class="text-sm text-emerald-700">Success message</p>
    </div>
  </div>
</div>
```

#### Warning Alert
```html
<div class="p-4 rounded-md bg-amber-50 border border-amber-200">
  <div class="flex">
    <div class="flex-shrink-0 text-amber-400">
      <!-- Warning icon -->
    </div>
    <div class="ml-3">
      <p class="text-sm text-amber-700">Warning message</p>
    </div>
  </div>
</div>
```

#### Error Alert
```html
<div class="p-4 rounded-md bg-red-50 border border-red-200">
  <div class="flex">
    <div class="flex-shrink-0 text-red-400">
      <!-- Error icon -->
    </div>
    <div class="ml-3">
      <p class="text-sm text-red-700">Error message</p>
    </div>
  </div>
</div>
```

## 8. Data Visualization Styling

### 8.1 Chart Containers

All charts should be contained within a consistent wrapper:

```html
<div class="p-4 bg-white border border-slate-200 rounded-md shadow-sm">
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-base font-medium text-slate-900">Chart Title</h3>
    <div class="flex space-x-2">
      <!-- Chart controls -->
    </div>
  </div>
  <div class="h-[300px]">
    <!-- Chart content -->
  </div>
</div>
```

### 8.2 Chart.js Configuration Defaults

```javascript
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#64748B'; // text-slate-500
Chart.defaults.borderColor = '#E2E8F0'; // text-slate-200
Chart.defaults.plugins.tooltip.backgroundColor = '#0F172A'; // slate-900
Chart.defaults.plugins.tooltip.titleColor = '#FFFFFF';
Chart.defaults.plugins.tooltip.bodyColor = '#FFFFFF';
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.cornerRadius = 4;
Chart.defaults.plugins.tooltip.titleFont = { weight: 'medium' };
```

### 8.3 Chart Type-Specific Styling

#### Bar Charts
```javascript
const barChartConfig = {
  datasets: [{
    backgroundColor: [
      '#2563EB', '#D946EF', '#F59E0B', '#10B981', '#6366F1',
      '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
    ],
    borderRadius: 4,
    maxBarThickness: 40
  }],
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 12,
        padding: 15
      }
    }
  }
};
```

#### Line Charts
```javascript
const lineChartConfig = {
  datasets: [{
    borderWidth: 2,
    tension: 0.2,
    pointRadius: 3,
    pointHoverRadius: 5
  }],
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 12,
        padding: 15
      }
    }
  }
};
```

#### Pie/Doughnut Charts
```javascript
const pieChartConfig = {
  datasets: [{
    backgroundColor: [
      '#2563EB', '#D946EF', '#F59E0B', '#10B981', '#6366F1',
      '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
    ],
    borderWidth: 2,
    borderColor: '#FFFFFF'
  }],
  plugins: {
    legend: {
      position: 'right',
      labels: {
        boxWidth: 12,
        padding: 15
      }
    }
  }
};
```

## 9. Responsive Design Guidelines

### 9.1 Breakpoints

Following Tailwind's default breakpoints:

| Name | Min Width | Tailwind |
|------|-----------|----------|
| SM | 640px | `sm:` |
| MD | 768px | `md:` |
| LG | 1024px | `lg:` |
| XL | 1280px | `xl:` |
| 2XL | 1536px | `2xl:` |

### 9.2 Layout Adjustments

#### Navigation
- Below `md`: Use collapsible sidebar with hamburger menu
- Above `md`: Keep sidebar visible

#### Tables
- Below `md`: Allow horizontal scrolling for tables
- All sizes: Use responsive text sizing

#### Charts
- Below `md`: Stack charts vertically
- Above `md`: Arrange charts in grid layout
- Below `sm`: Simplify chart legends or move to bottom
- Consider disabling certain chart interactions on touch devices

### 9.3 Component-Specific Guidelines

#### Cards
```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- Cards -->
</div>
```

#### Forms
```html
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <!-- Form fields -->
</div>
```

## 10. Motion & Animation Guidelines

### 10.1 Transition Defaults

```css
/* Duration */
.transition-duration-default: 150ms;
.transition-duration-long: 300ms;

/* Easing */
.transition-timing-default: cubic-bezier(0.4, 0, 0.2, 1);
.transition-timing-entrance: cubic-bezier(0, 0, 0.2, 1);
.transition-timing-exit: cubic-bezier(0.4, 0, 1, 1);
```

### 10.2 Common Transitions

#### Hover States
```css
.hover-transition {
  @apply transition-colors duration-150 ease-in-out;
}
```

#### Modals/Dialogs
```css
.modal-transition {
  @apply transition-opacity duration-300 ease-in-out;
}
```

#### Expanding Elements
```css
.expand-transition {
  @apply transition-all duration-300 ease-out;
}
```

### 10.3 Chart Animations

```javascript
const chartAnimationDefaults = {
  duration: 750,
  easing: 'easeOutQuart'
};
```

## 11. Accessibility Guidelines

### 11.1 Color Contrast

- All text must have a contrast ratio of at least 4.5:1 against its background
- All interactive elements must have a contrast ratio of at least 3:1
- Use the semantic colors consistently to indicate states

### 11.2 Focus States

All interactive elements must have visible focus states:
```css
.focus-visible:outline-none .focus-visible:ring-2 .focus-visible:ring-blue-500 .focus-visible:ring-opacity-50
```

### 11.3 Screen Reader Support

- All form inputs must have associated labels
- All images and icons must have appropriate alt text or aria-labels
- Use appropriate ARIA roles for custom interactive elements

## 12. Implementation Guidelines

### 12.1 Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Define color palette
        primary: {
          DEFAULT: '#2563EB', // blue-600
          dark: '#1E40AF',    // blue-800
          light: '#DBEAFE',   // blue-100
        },
        // Add other custom colors
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      // Other theme extensions
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

### 12.2 CSS Custom Properties

For values that Tailwind doesn't cover, use CSS custom properties:

```css
:root {
  --chart-height-sm: 200px;
  --chart-height-md: 300px;
  --chart-height-lg: 400px;
  
  --transition-duration-default: 150ms;
  --transition-duration-long: 300ms;
  
  --shadow-color: 215 25% 27%;
}
```

### 12.3 Using shadcn UI Components

When implementing shadcn UI components, follow these guidelines:

1. Use the shadcn UI CLI to add components:
   ```bash
   npx shadcn-ui@latest add button
   npx shadcn-ui@latest add card
   npx shadcn-ui@latest add table
   ```

2. Customize the component themes in the component CSS files to match this style guide

3. When using shadcn UI with Tailwind, prefer composition over direct customization:
   ```jsx
   <Button variant="default" className="px-6">
     Extended Button
   </Button>
   ```

## 13. Asset Guidelines

### 13.1 Icons

Use a consistent icon library (recommended: Lucide Icons or Heroicons)

- **Icon Sizes**:
  - Small: 16px (`w-4 h-4`)
  - Medium: 20px (`w-5 h-5`) - Default
  - Large: 24px (`w-6 h-6`)

- **Icon Colors**:
  - Use current color by default: `fill-current` or `stroke-current`
  - Follow text color system for context

### 13.2 Imagery & Illustrations

- Use illustrations that match the color system
- Keep illustrations minimal and functional rather than decorative
- Ensure all images are optimized for web

## 14. File Naming Conventions

- **Components**: PascalCase (e.g., `DataTable.tsx`, `ConnectionForm.tsx`)
- **Utilities**: camelCase (e.g., `formatNumber.ts`, `dateUtils.ts`)
- **CSS Modules**: kebab-case (e.g., `button-styles.module.css`)
- **Assets**: kebab-case (e.g., `database-icon.svg`, `chart-preview.png`)

---

This style guide serves as a living document and should be updated as design decisions evolve throughout the development process. All team members should adhere to these guidelines to ensure a consistent, high-quality user experience.
