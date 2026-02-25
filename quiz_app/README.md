# 🎮 quiz_app — Live Quiz (Jour 3)

## Arborescence snake_case

```
quiz_app/
├── package.json
├── packages/
│   └── shared_types/
│       ├── package.json
│       └── src/
│           └── index.ts
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
├── host_app/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── app.tsx
│       └── app.css
└── player_app/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── app.tsx
        └── app.css
```

---

## Commandes Windows PowerShell (une par une)

### Terminal 1 — Installation + Serveur

```
npm install
```
```
cd server
```
```
npx ts-node src/index.ts
```

### Terminal 2 — Host (cliquer + pour nouveau terminal)

```
cd host_app
```
```
npm run dev
```
→ http://localhost:5173

### Terminal 3 — Players (cliquer + pour nouveau terminal)

```
cd player_app
```
```
npm run dev
```
→ http://localhost:5174
