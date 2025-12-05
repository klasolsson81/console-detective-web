# 🎬 Console Detective - Animations & Modern Noir UI Guide

## 📋 Innehållsförteckning
1. [Översikt](#översikt)
2. [Fas 1: Förberedelser](#fas-1-förberedelser)
3. [Fas 2: Skapa Assets](#fas-2-skapa-assets)
4. [Fas 3: Implementation](#fas-3-implementation)
5. [UI Design Principer](#ui-design-principer)
6. [Teknisk Referens](#teknisk-referens)

---

## 🎯 Översikt

### Mål
- Levande animationer (CSS + Lottie)
- Berättarröst med ElevenLabs TTS
- TV-nyhet-koncept för case introduction
- Modern noir-estetik med WOW-faktor
- Snabb prestanda (loading < 3 sekunder)

### Teknisk Stack
- **Animationer**: CSS + Lottie (JSON)
- **Ljud**: ElevenLabs TTS + ambient sounds
- **Bilder**: Genererade med Gemini/Midjourney/DALL-E
- **Framework**: React + Framer Motion

---

## 🚀 Fas 1: Förberedelser

### 1.1 Skaffa ElevenLabs API Key

**Steg:**
1. Gå till: https://elevenlabs.io/
2. Klicka "Sign Up" (eller "Get Started")
3. Välj plan:
   - **Free**: 10,000 tecken/månad (bra för test)
   - **Starter**: $5/månad - 30,000 tecken
   - **Creator**: $22/månad - 100,000 tecken
4. Gå till: https://elevenlabs.io/app/settings/api-keys
5. Klicka "Create API Key"
6. Kopiera nyckeln (ser ut som: `sk_...`)
7. Spara i Railway:
   - Railway → API Service → Variables
   - Lägg till: `ELEVENLABS_API_KEY = sk_...`

**Rekommenderad röst (svensk):**
- Gå till Voice Library
- Sök efter svenska röster
- Testa och notera Voice ID (behövs senare)
- Alternativ: Använd "Adam" (engelska) med bra intonation

---

### 1.2 Installera Nödvändiga Paket

**Backend (C#):**
```bash
cd server/ConsoleDetective.API
dotnet add package RestSharp
```

**Frontend (React):**
```bash
cd client
npm install framer-motion lottie-react @lottiefiles/react-lottie-player
npm install howler  # För ljudhantering
```

---

## 🎨 Fas 2: Skapa Assets

### 2.1 Dashboard Bakgrundsbild

**Använd Gemini, DALL-E 3, eller Midjourney:**

#### AI Prompt (kopiera exakt):
```
Create a cinematic noir detective office scene in a modern stylized art style:

COMPOSITION:
- Wide angle view of a 1940s detective office
- Wooden desk in foreground with vintage lamp (warm yellow light)
- Large window with venetian blinds casting dramatic shadows
- Old TV on a wooden cabinet (off, dark screen)
- Cork board/whiteboard on wall with pinned notes and red strings
- Fedora hat hanging on coat rack
- Whiskey bottle and glass on desk
- Rain droplets on window (night scene, city lights outside)

STYLE:
- Film noir aesthetic but with modern clean lines
- High contrast lighting (deep blacks, warm highlights)
- Muted color palette: browns, grays, amber lighting
- Slight grain/texture for authenticity
- Cinematic composition, slightly desaturated
- Professional game art quality

MOOD: Atmospheric, mysterious, professional, inviting

TECHNICAL: 1920x1080px, suitable as web background, dark overall tone
```

**Spara som:** `client/public/images/dashboard-office.jpg`

**Alternativ (om AI ger fel resultat):**
- Försök med: "1940s detective office noir game background cinematic"
- Eller använd Unsplash/Pexels: Sök "detective office" och redigera i Photoshop

---

### 2.2 Location Background Upgrades

**För varje plats, skapa en mer dramatisk version:**

#### Villa Prompt:
```
Cinematic noir crime scene of a luxury villa at night:
- Modern Scandinavian villa exterior
- Police tape crossing the entrance
- Flashing blue police lights creating dramatic shadows
- Foggy atmosphere, rain
- Dark and moody, high contrast
- Wide establishing shot
- Film noir aesthetic meets modern crime drama
- 1920x1080px, suitable as game background
```

**Spara som:** `client/public/images/locations/villa.jpg` (ersätt befintlig)

#### Hotell Prompt:
```
Noir crime scene hotel exterior at night:
- Art deco hotel entrance
- Neon sign flickering
- Police cars with flashing lights
- Rain-soaked street reflecting neon
- Foggy, atmospheric
- Cinematic noir style, high contrast
- 1920x1080px
```

#### Industrilokal Prompt:
```
Abandoned warehouse crime scene noir:
- Dark industrial building exterior
- Police lights, yellow crime tape
- Broken windows, dramatic lighting
- Fog/mist, rain puddles reflecting lights
- Film noir atmosphere, gritty
- 1920x1080px
```

**Upprepa för:** Herrgården, NBI, Centralbank, Stadshuset, Restaurang, Lägenheten, Strandpromenaden, Teknikaffären

---

### 2.3 TV News Frame Asset

**AI Prompt för TV-ram overlay:**
```
Vintage CRT TV frame overlay for noir game:
- Empty TV screen (transparent center)
- Thick plastic/wood bezel around edges
- Slight screen curvature effect
- Vintage knobs and dials on side
- Worn, aged appearance
- PNG with transparent center
- 1920x1080px
- Style: 1970s television set, noir aesthetic
```

**Spara som:** `client/public/images/tv-frame.png` (PNG med transparent center)

---

### 2.4 Lottie Animations

**Hämta gratis Lottie-animationer från:**

1. **LottieFiles.com** (sök efter):
   - "rain" → Regn-overlay för brottsplatser
   - "police lights" → Blinkande polisljus
   - "smoke" → Rök-effekter
   - "paper" → Papper som blåser
   - "neon flicker" → Flimrande ljus

**Ladda ner JSON-filer och spara i:** `client/public/animations/`

```
client/public/animations/
  ├─ rain.json
  ├─ police-lights.json
  ├─ smoke.json
  └─ neon-flicker.json
```

**Direktlänkar (exempel):**
- Rain: https://lottiefiles.com/animations/rain
- Police: https://lottiefiles.com/animations/police

---

### 2.5 Ambient Sounds

**Hämta gratis ljud från:**
- **Freesound.org** (Creative Commons)
- **Pixabay** (royalty-free)

**Sök efter:**
- "rain ambience" → För regniga scener
- "city night" → Stadsbrus
- "clock ticking" → Spänning
- "police siren distant" → Brottsplats
- "typewriter" → Retro känsla

**Konvertera till MP3 (max 300kb):**
```bash
ffmpeg -i input.wav -b:a 128k output.mp3
```

**Spara i:** `client/public/sounds/`

```
client/public/sounds/
  ├─ ambience/
  │   ├─ rain.mp3
  │   ├─ city-night.mp3
  │   └─ clock-ticking.mp3
  └─ effects/
      ├─ button-click.mp3
      └─ whoosh.mp3
```

---

## 💻 Fas 3: Implementation

### 3.1 Backend - ElevenLabs Integration

**När alla assets är klara, kör dessa kommandon:**

#### Kommando 1: Installera ElevenLabs Service
```
Öppna Claude Code och be:

"Implementera ElevenLabs TTS-integration i backend:
1. Skapa en ny service: Services/TextToSpeechService.cs
2. Använd ElevenLabs API (v1/text-to-speech/{voice_id})
3. Ta ELEVENLABS_API_KEY från configuration
4. Metod: GenerateSpeechAsync(string text, string voiceId)
5. Returnera byte[] (MP3-data)
6. Lägg till caching så samma text inte genereras två gånger
7. Registrera servicen i Program.cs
8. Lägg till endpoint: POST /api/speech/generate { text, voiceId }"
```

#### Kommando 2: Lägg till Speech i GameController
```
"Uppdatera GameController.StartSession():
1. Efter att case genererats, anropa TextToSpeechService
2. Generera audio för caseData.Description
3. Spara audio som base64 i svaret
4. Svaret ska innehålla: { sessionId, cases, narrationAudio: 'base64...' }"
```

---

### 3.2 Frontend - UI Components

#### Kommando 3: Skapa TV News Component
```
"Skapa ny komponent: client/src/components/TVNewsIntro.tsx

Funktionalitet:
- Tar emot: caseData, audioBase64
- Visar TV-ram overlay (tv-frame.png)
- Spelar upp berättarröst automatiskt
- Visar typewriter-effekt av description
- Animerar in med Framer Motion
- Background: location-bild med rain.json Lottie overlay
- När audio är klar: Fade ut och gå till case page

Stilar: Noir-tema, CRT-filter på texten, dramatisk"
```

#### Kommando 4: Uppdatera Dashboard
```
"Uppdatera Dashboard.tsx:
1. Lägg till bakgrundsbild: dashboard-office.jpg
2. Parallax-effekt när man scrollar
3. Fallen ska visas som 'case files' på whiteboard
4. Hover-effekt: File lyfts upp, spotlight
5. Lägg till ambient ljud: city-night.mp3 (låg volym, loop)
6. Använd Framer Motion för alla animations
7. Modernisera layouten: Grid med större cards
8. Lägg till 'TV' element som visar senaste nyheterna"
```

#### Kommando 5: Förbättra CasePage Animations
```
"Uppdatera CasePage.tsx:
1. Location-bild får rain.json overlay (om 'Mord')
2. Fade-in animation när sidan laddas
3. Ledtrådar animerar in en efter en (stagger)
4. Misstänkta hover: Subtle glow, lift-effekt
5. Solve-knappen: Pulserar subtilt
6. Background: Lägg till ambient sound baserat på location
7. Använd Framer Motion för alla transitions"
```

#### Kommando 6: Global UI Polish
```
"Förbättra global styling:
1. Lägg till glassmorphism på alla cards (backdrop-blur)
2. Uppdatera färgschema:
   - Primary: #D4AF37 (guld/amber)
   - Dark: #0A0A0A (nästan svart)
   - Accent: #8B4513 (vintage brown)
3. Alla knappar: Hover-effekt med sound (button-click.mp3)
4. Lägg till subtle vignette på alla sidor
5. Typsnitt: Använd 'Bebas Neue' för headers
6. Border-radius: Ändra från skarpa hörn till subtle curves (8px)
7. Lägg till shadow-layers för depth"
```

---

### 3.3 Audio Implementation

#### Kommando 7: Skapa Audio Manager
```
"Skapa client/src/utils/AudioManager.ts:
- Singleton klass som hanterar alla ljud
- Använd Howler.js library
- Metoder:
  * playAmbient(soundName, volume, loop)
  * playEffect(soundName)
  * stopAll()
  * fadeOut(duration)
- Preload viktiga sounds
- Volume control baserat på user preferences"
```

---

### 3.4 Lottie Animations

#### Kommando 8: Skapa Lottie Wrapper
```
"Skapa client/src/components/LottieOverlay.tsx:
- Wrapper för Lottie Player
- Props: animationName, opacity, speed
- Hämta JSON från /animations/{animationName}.json
- Position: Absolute, täcker hela parent
- Pointer-events: none (går igenom till content under)
- Exempel usage: <LottieOverlay animation='rain' opacity={0.3} />"
```

---

## 🎨 UI Design Principer

### Modern Noir Aesthetic

#### Färgpalett:
```css
/* Primära färger */
--noir-darkest: #0A0A0A;     /* Nästan svart */
--noir-dark: #1A1A1A;        /* Mörk bakgrund */
--noir-medium: #2A2A2A;      /* Cards */
--noir-light: #3A3A3A;       /* Borders */

/* Accent färger */
--gold-accent: #D4AF37;      /* Guld/amber - huvudaccent */
--brown-accent: #8B4513;     /* Vintage brown */
--red-danger: #8B0000;       /* Mörk röd för varningar */

/* Text */
--text-primary: #E5E5E5;     /* Ljusgrå */
--text-secondary: #A0A0A0;   /* Medium grå */
--text-muted: #707070;       /* Muted */
```

#### Typografi:
```css
/* Headers */
font-family: 'Bebas Neue', sans-serif;
font-weight: 700;
letter-spacing: 2px;
text-transform: uppercase;

/* Body */
font-family: 'Inter', sans-serif;
font-weight: 400;
line-height: 1.6;

/* Accents */
font-family: 'Courier New', monospace; /* För "typewriter" effekt */
```

#### Effekter:
```css
/* Glassmorphism cards */
background: rgba(26, 26, 26, 0.7);
backdrop-filter: blur(10px);
border: 1px solid rgba(212, 175, 55, 0.2);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

/* Hover glow */
box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
transform: translateY(-4px);
transition: all 0.3s ease;

/* Vignette overlay (hela sidan) */
box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.5);
```

#### Animation Timing:
```css
/* Snabba interactions */
transition: 0.2s ease-out;  /* Hover, clicks */

/* Medium transitions */
transition: 0.4s ease-in-out;  /* Page transitions */

/* Långsamma reveals */
transition: 0.8s ease;  /* Stora element fade-in */
```

---

## 🎬 Specifika Component Guidelines

### Dashboard
```
LAYOUT:
┌─────────────────────────────────────┐
│  [Background: Detective Office]     │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │ TV (News)    │  │ Whiteboard  │ │
│  │              │  │ with Cases  │ │
│  └──────────────┘  └─────────────┘ │
│                                     │
│  [Case Files Grid - 2x2]           │
│  ┌───────┐ ┌───────┐              │
│  │ Case1 │ │ Case2 │              │
│  └───────┘ └───────┘              │
│  ┌───────┐ ┌───────┐              │
│  │ Case3 │ │ Case4 │              │
│  └───────┘ └───────┘              │
└─────────────────────────────────────┘

ANIMATIONS:
- Parallax: Office background moves slower than content
- Case files: Stagger animation in (0.1s delay each)
- Hover: File lifts up, spotlight appears under
- Ambient: City night sounds, distant sirens
```

### Case Page
```
LAYOUT:
┌─────────────────────────────────────┐
│  [Background: Location + Rain]      │
│  ┌────────────────────────────────┐ │
│  │ TV News Intro (first visit)    │ │
│  │ - Auto-play narration          │ │
│  │ - Typewriter description       │ │
│  └────────────────────────────────┘ │
│                                     │
│  [Main Content fades in after]     │
│  - Clues with stagger animation    │
│  - Suspects with hover effects     │
│  - Solve button pulsing            │
└─────────────────────────────────────┘

ANIMATIONS:
- Entry: 1s fade from black
- Clues: Slide in from left, 0.2s stagger
- Suspects: Hover grows 1.05x, glow
- Lottie: Rain overlay 0.3 opacity
```

### Interrogation Page
```
EFFECTS:
- Dark spotlight on suspect image
- Chat messages: Typewriter effect
- Background: Subtle film grain
- Ambient: Clock ticking (low volume)
- Voice lines: Could play suspect voice (future)
```

---

## 🛠️ Teknisk Referens

### Lottie Usage Example:
```tsx
import { Player } from '@lottiefiles/react-lottie-player';

<Player
  autoplay
  loop
  src="/animations/rain.json"
  style={{
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.3,
    pointerEvents: 'none'
  }}
/>
```

### Howler Audio Example:
```typescript
import { Howl } from 'howler';

const ambientSound = new Howl({
  src: ['/sounds/ambience/rain.mp3'],
  loop: true,
  volume: 0.3
});

ambientSound.play();
```

### Framer Motion Example:
```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
>
  Content
</motion.div>
```

---

## 📝 Implementation Checklist

### Fas 1 (Assets)
- [ ] Skaffat ElevenLabs API key
- [ ] Genererat dashboard-office.jpg
- [ ] Genererat alla location backgrounds
- [ ] Genererat tv-frame.png
- [ ] Laddat ner Lottie animations (rain, police-lights, smoke)
- [ ] Laddat ner ambient sounds
- [ ] Installerat alla npm-paket

### Fas 2 (Backend)
- [ ] Implementerat TextToSpeechService
- [ ] Lagt till ElevenLabs API-anrop
- [ ] Lagt till caching av genererat ljud
- [ ] Uppdaterat GameController med narrationAudio
- [ ] Testat att audio genereras korrekt

### Fas 3 (Frontend - Core)
- [ ] Skapat TVNewsIntro component
- [ ] Skapat LottieOverlay component
- [ ] Skapat AudioManager utility
- [ ] Installerat och konfigurerat Howler.js
- [ ] Uppdaterat Dashboard med ny layout

### Fas 4 (Frontend - Polish)
- [ ] Implementerat glassmorphism styling
- [ ] Uppdaterat färgschema
- [ ] Lagt till hover-effekter överallt
- [ ] Implementerat Framer Motion animations
- [ ] Lagt till ambient sounds på alla sidor
- [ ] Testat prestanda (ska läsa < 3s)

### Fas 5 (Testing)
- [ ] Testat på olika skärmstorlekar
- [ ] Verifierat att ljud fungerar i alla browsers
- [ ] Kontrollerat att Lottie-animationer loopar korrekt
- [ ] Testat med långsamma nätverk
- [ ] Verifierat att allt cachas korrekt

---

## 🚀 Quick Start Commands

När alla assets är klara, kör dessa i ordning:

```bash
# 1. Installera paket
cd client && npm install framer-motion lottie-react @lottiefiles/react-lottie-player howler

# 2. Backend packages
cd ../server/ConsoleDetective.API && dotnet add package RestSharp

# 3. Starta utveckling
cd ../../client && npm run dev
```

Sedan öppna Claude Code och kör kommandona från "Fas 3: Implementation" i ordning.

---

## 💡 Tips & Best Practices

### Prestanda:
- **Lazy load** Lottie-animationer
- **Compress** alla bilder (WebP format)
- **Preload** kritiska assets
- **Cache** ElevenLabs audio i database

### UX:
- **Skip-knapp** på TV News intro (efter 3s)
- **Mute-knapp** för ambient sounds
- **Loading states** som är snygga (inte bara spinner)
- **Error handling** med user-friendly meddelanden

### Accessibility:
- **Alt text** på alla bilder
- **Keyboard navigation** överallt
- **Screen reader** support för viktigt content
- **Subtitle option** för audio (future)

---

## 📞 Support

Om något inte fungerar:
1. Kolla browser console för errors
2. Verifiera att alla filer ligger på rätt plats
3. Kontrollera att API keys är korrekt satta
4. Testa med en annan browser

**Claude Code kommando vid problem:**
```
"Debug: [beskriv problemet]
Kolla:
1. Console errors
2. Network requests
3. File paths
4. State management"
```

---

## 🎉 Resultat

När allt är implementerat får du:
- ✅ Cinematic TV news intro för varje fall
- ✅ Levande brottsplatser med animationer
- ✅ Professionell berättarröst
- ✅ Modern noir-estetik med WOW-faktor
- ✅ Snabb prestanda (< 3s loading)
- ✅ Immersive ljuddesign

**Lycka till! 🕵️‍♂️**
