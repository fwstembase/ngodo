# 🎨 Panduan Animasi PinjamAja

## Deskripsi
Aplikasi PinjamAja sekarang dilengkapi dengan animasi yang keren, smooth, dan ringan (lightweight) yang meningkatkan user experience tanpa mengurangi performa.

## 🎯 Filosofi Animasi

### Prinsip Desain:
1. **Smooth & Fast** - Semua animasi menggunakan cubic-bezier(0.4, 0.0, 0.2, 1) untuk feel yang natural
2. **Lightweight** - Durasi pendek (0.2s - 0.5s) untuk performa optimal
3. **Purposeful** - Setiap animasi memiliki tujuan: feedback, guidance, atau delight
4. **Consistent** - Style yang konsisten di seluruh aplikasi

---

## 📋 Daftar Animasi yang Tersedia

### 1. **Entrance Animations** (Animasi Masuk)

#### `animate-fade-in`
Fade in yang simple dan elegant
- **Durasi:** 0.25s
- **Penggunaan:** Background pages, containers
- **CSS:** `animation: fadeIn 0.25s cubic-bezier(0.4, 0.0, 0.2, 1)`

```jsx
<div className="animate-fade-in">
  Content here
</div>
```

#### `animate-slide-fade-in`
Slide dari kiri dengan fade
- **Durasi:** 0.4s  
- **Penggunaan:** Headings, important text
- **Effect:** translateX(-20px) + fade

```jsx
<h1 className="animate-slide-fade-in">
  Welcome!
</h1>
```

#### `animate-fade-in-up`
Fade in dengan slide dari bawah
- **Durasi:** 0.4s
- **Penggunaan:** Cards, content sections
- **Effect:** translateY(30px) + fade

```jsx
<Card className="animate-fade-in-up">
  Card content
</Card>
```

#### `animate-fade-in-down`
Fade in dengan slide dari atas
- **Durasi:** 0.4s
- **Penggunaan:** Dropdown menus, notifications

#### `animate-zoom-in`
Scale up dengan fade
- **Durasi:** 0.3s
- **Penggunaan:** Modal, featured items
- **Effect:** scale(0.9) → scale(1)

```jsx
<Card className="animate-zoom-in">
  Featured item
</Card>
```

#### `animate-bounce-in`
Bounce effect untuk entrance
- **Durasi:** 0.5s
- **Penggunaan:** Badges, status indicators
- **Effect:** scale(0.3) → scale(1.05) → scale(0.9) → scale(1)

```jsx
<Badge className="animate-bounce-in">
  New!
</Badge>
```

#### `animate-flip-in`
3D flip effect
- **Durasi:** 0.5s
- **Penggunaan:** Card reveals, special items
- **Effect:** perspective + rotateY

---

### 2. **Hover Effects** (Efek Hover)

#### `hover-lift`
Naik dengan shadow
- **Effect:** translateY(-4px) + shadow enhancement
- **Penggunaan:** Cards, buttons

```jsx
<Card className="hover-lift">
  Hover me!
</Card>
```

#### `hover-scale`
Scale up sedikit
- **Effect:** scale(1.02)
- **Penggunaan:** Buttons, clickable items

```jsx
<Button className="hover-scale">
  Click me
</Button>
```

#### `hover-grow`
Scale up lebih besar
- **Effect:** scale(1.05)
- **Penggunaan:** Icons, small buttons

```jsx
<Button className="hover-grow">
  ↗
</Button>
```

#### `hover-brighten`
Increase brightness
- **Effect:** filter: brightness(1.1)
- **Penggunaan:** Images

```jsx
<img className="hover-brighten" />
```

#### `hover-tilt`
3D tilt effect
- **Effect:** perspective + rotateX + rotateY
- **Penggunaan:** Featured cards

```jsx
<Card className="hover-tilt">
  Special card
</Card>
```

#### `hover-shadow-lg`
Large shadow on hover
- **Penggunaan:** Premium cards

---

### 3. **Continuous Animations** (Animasi Berkelanjutan)

#### `animate-pulse`
Gentle pulsing
- **Durasi:** 2s infinite
- **Penggunaan:** Loading states, attention grabbers

```jsx
<Heart className="animate-pulse" />
```

#### `animate-float`
Floating up and down
- **Durasi:** 3s infinite
- **Penggunaan:** Icons, decorative elements
- **Effect:** translateY(0) ↔ translateY(-8px)

```jsx
<Heart className="animate-float" />
```

#### `icon-bounce`
Subtle bounce for icons
- **Durasi:** 2s infinite
- **Effect:** translateY(0) ↔ translateY(-5px)

```jsx
<DollarSign className="icon-bounce" />
```

#### `animate-glow`
Pulsing glow effect
- **Durasi:** 2s infinite
- **Penggunaan:** Special buttons, active states

```jsx
<Button className="animate-glow">
  Active
</Button>
```

#### `animate-gradient`
Animated gradient background
- **Durasi:** 3s infinite
- **Penggunaan:** Hero sections, special backgrounds

---

### 4. **Stagger Animations** (Animasi Berurutan)

#### `stagger-item`
Sequential fade in untuk list items
- **Delay:** 0.1s per item (up to 10 items)
- **Penggunaan:** Menu items, list items

```jsx
{items.map((item, index) => (
  <div key={index} className="stagger-item">
    {item.name}
  </div>
))}
```

#### `stagger-fast`
Quick sequential animation
- **Delay:** 0.05s per item (up to 8 items)
- **Penggunaan:** Quick lists, fast reveals

```jsx
{items.map((item, index) => (
  <div key={index} className="stagger-fast">
    {item.name}
  </div>
))}
```

#### `card-entrance`
Delayed entrance untuk cards
- **Delay:** 0.15s default
- **Custom delay:** Use inline style

```jsx
<Card 
  className="card-entrance" 
  style={{ animationDelay: '0.2s' }}
>
  Content
</Card>
```

---

### 5. **Special Effects**

#### `animate-swing`
Swinging motion
- **Durasi:** 1s
- **Penggunaan:** Notifications, bells

```jsx
<Bell className="animate-swing" />
```

#### `animate-gentle-shake`
Subtle shake for attention
- **Durasi:** 0.5s
- **Penggunaan:** Error states, validation

```jsx
<Input className="animate-gentle-shake" />
```

#### `btn-ripple`
Ripple effect on button click
- **Trigger:** On active/click
- **Penggunaan:** All buttons

```jsx
<Button className="btn-ripple">
  Click me
</Button>
```

---

## 🎬 Penggunaan per Halaman

### Beranda (Landing)
```jsx
// Hero section dengan animasi
<section className="animate-fade-in">
  <h1 className="animate-slide-fade-in">PinjamAja</h1>
  <Button className="hover-lift btn-ripple">
    Mulai Pinjam Meminjam
  </Button>
</section>

// Stats dengan hover effect
<div className="card-entrance hover:scale-110">
  <div>1000+</div>
  <div>Barang Tersedia</div>
</div>
```

### Item Detail
```jsx
<div className="animate-fade-in">
  <Button className="animate-slide-fade-in hover-grow">
    ← Kembali
  </Button>
  
  <Card className="animate-zoom-in hover-shadow-lg">
    <img className="hover-brighten" />
    <h1 className="animate-fade-in-up">Title</h1>
    <Badge className="animate-bounce-in">Tersedia</Badge>
    <DollarSign className="icon-bounce" />
  </Card>
</div>
```

### Wishlist
```jsx
<div className="animate-fade-in">
  <h1 className="animate-slide-fade-in">
    <Heart className="animate-pulse" />
    Wishlist Saya
  </h1>
  
  {/* Empty state */}
  <Heart className="animate-float" />
  
  {/* Items */}
  {items.map((item, i) => (
    <Card className="stagger-fast hover-lift">
      <img className="hover-brighten" />
      <Button className="hover-grow btn-ripple">
        Hapus
      </Button>
    </Card>
  ))}
</div>
```

### Profil
```jsx
<div className="animate-fade-in">
  <h1 className="animate-slide-fade-in">
    <User />
    Profil Saya
  </h1>
  
  <Card className="animate-zoom-in hover-shadow-lg">
    <div className="animate-bounce-in">
      {username.charAt(0)}
    </div>
    
    <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      Username
    </div>
    
    <Button className="hover-grow btn-ripple animate-fade-in-up">
      Edit Profil
    </Button>
  </Card>
</div>
```

### Chat
```jsx
<motion.div 
  initial={{ opacity: 0, x: 100 }}
  animate={{ opacity: 1, x: 0 }}
>
  <Button className="hover-grow">←</Button>
  
  <div className="animate-slide-fade-in">
    <h2>{otherUserName}</h2>
  </div>
  
  <Card className="animate-zoom-in hover-lift">
    <img className="hover-brighten" />
  </Card>
</motion.div>
```

---

## ⚡ Performance Tips

### 1. **Use CSS Animations over JS**
CSS animations are GPU-accelerated and more performant.

### 2. **Keep Durations Short**
- Entrance: 0.2s - 0.4s
- Hover: 0.15s - 0.3s
- Continuous: 2s - 3s

### 3. **Limit Continuous Animations**
Only use infinite animations sparingly (icons, loading states).

### 4. **Use will-change Sparingly**
Only when absolutely necessary for complex animations.

### 5. **Test on Mobile**
Ensure animations run smoothly on lower-end devices.

---

## 🎨 Customization

### Custom Animation Delay
```jsx
<div 
  className="animate-fade-in-up" 
  style={{ animationDelay: '0.3s' }}
>
  Delayed content
</div>
```

### Custom Duration
```jsx
<div 
  className="hover-lift" 
  style={{ transition: 'all 0.5s ease' }}
>
  Slower hover
</div>
```

### Combining Animations
```jsx
<Card className="animate-zoom-in hover-lift hover-shadow-lg transition-all-smooth">
  Multiple effects!
</Card>
```

---

## 🚀 Best Practices

### DO ✅
- Use animations to guide user attention
- Keep animations smooth and fast
- Test on different devices
- Use stagger for lists
- Apply hover effects to interactive elements

### DON'T ❌
- Overuse animations (can be distracting)
- Make animations too slow (> 0.5s for entrance)
- Animate everything (be selective)
- Forget about accessibility (respect prefers-reduced-motion)
- Use heavy animations on large lists

---

## 🔧 Debugging

### Check Animation
Open DevTools → Elements → Computed → Animation

### Slow Motion Mode
```js
// In browser console
document.documentElement.style.setProperty('--animation-speed', '0.1');
```

### Disable All Animations
```css
* {
  animation: none !important;
  transition: none !important;
}
```

---

## 📊 Animation Performance Metrics

### Ideal FPS: 60 FPS
### Animation Budget: < 16ms per frame
### Max Simultaneous: 3-5 animations

---

## 🎯 Animation Decision Tree

```
Is this element important?
├─ Yes → Use entrance animation (fade-in-up, zoom-in)
└─ No → Use simple fade-in or none

Is this element interactive?
├─ Yes → Add hover effect (hover-lift, hover-grow)
└─ No → No hover needed

Is this a list?
├─ Yes → Use stagger animation
└─ No → Use single animation

Is this critical info?
├─ Yes → Use attention animation (pulse, glow)
└─ No → Use subtle animation
```

---

## 🌟 Signature Animations

Animasi khas PinjamAja yang membedakan dari kompetitor:

1. **Smooth Fade-In-Up** - Entrance yang elegant
2. **Bounce-In Badges** - Status yang playful
3. **Icon Bounce** - Micro-interaction yang delightful
4. **Hover Lift** - Card interaction yang premium
5. **Stagger Fast** - List reveal yang snappy

---

**Last Updated:** 2025-01-19
**Version:** 1.0
**Status:** ✅ Production Ready

Made with ❤️ by the PinjamAja Team
