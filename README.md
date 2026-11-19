# Room Booking API

REST API do rezerwacji sal w budynkach: Express 5, Zod, Knex, PostgreSQL 16, JWT.

## Uruchomienie od zera (Docker)

Wymagany jest tylko Docker z Docker Compose v2.

```bash
git clone https://github.com/GebratenesOmelett/ZTPAI.git
cd ZTPAI
cp .env.example .env
docker compose up --build
```

Po starcie:

- API: http://localhost:3000/api
- Swagger UI: http://localhost:3000/api/docs

Migracje wykonują się automatycznie przy starcie kontenera `api`. Dane przykładowe i konto ADMIN tworzy seed (w drugim terminalu):

```bash
docker compose exec api npx knex seed:run
```

| Konto | Hasło | Rola |
|---|---|---|
| admin@example.com | admin-password-123 | ADMIN |
| anna.nowak@example.com | user-password-123 | USER |
| piotr.wisniewski@example.com | user-password-123 | USER |
| katarzyna.zielinska@example.com | user-password-123 | USER |

Seed czyści wszystkie tabele. Wartości w `.env.example` są przykładowe: przed wdrożeniem ustaw własne `POSTGRES_PASSWORD` i `JWT_SECRET` (min. 32 znaki).

Zatrzymanie: `docker compose down` (dane zostają w volume), `docker compose down -v` (razem z danymi).

## Uruchomienie bez Dockera dla API

```bash
npm ci
docker compose up -d db
npx knex migrate:latest
npx knex seed:run
npm start
```

## Testy

Testy integracyjne używają osobnej bazy `<POSTGRES_DB>_test` (nigdy deweloperskiej). Jednorazowo utwórz ją w kontenerze bazy:

```bash
docker compose exec db sh -c 'createdb -U "$POSTGRES_USER" "${POSTGRES_DB}_test"'
```

```bash
npm test                  # unit + integration
npm run test:unit         # bez bazy danych
npm run test:integration  # Supertest + PostgreSQL
```

Adres bazy testowej można podać wprost zmienną `TEST_DATABASE_URL`.
