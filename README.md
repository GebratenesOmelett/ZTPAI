# Room Booking API

![CI](https://github.com/GebratenesOmelett/ZTPAI/actions/workflows/ci.yml/badge.svg)

## Uruchomienie

Trzeba mieć Dockera.

```
git clone https://github.com/GebratenesOmelett/ZTPAI.git
cd ZTPAI
cp .env.example .env
docker compose up --build
```

API działa na http://localhost:3000/api, Swagger na http://localhost:3000/api/docs.

Migracje robią się same. Żeby wrzucić przykładowe dane (w drugim terminalu):

```
docker compose exec api npx knex seed:run
```

Konta:

- admin@example.com / admin-password-123 (ADMIN)
- anna.nowak@example.com / user-password-123
- piotr.wisniewski@example.com / user-password-123
- katarzyna.zielinska@example.com / user-password-123

Seed czyści bazę przed wrzuceniem danych.

Zatrzymanie: `docker compose down` (z `-v` usuwa też dane).

## Bez Dockera

```
npm ci
docker compose up -d db
npx knex migrate:latest
npx knex seed:run
npm start
```

## Testy

Testy integracyjne używają osobnej bazy, trzeba ją raz utworzyć:

```
docker compose exec db createdb -U ztpai ztpai_test
```

```
npm test
npm run test:unit
npm run test:integration
```

Unit testy nie potrzebują bazy. Testy odpalają się też w GitHub Actions przy pushu i PR.
