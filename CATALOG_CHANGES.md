# Catalog search, filters and pagination

## API contract

New read-only endpoint: GET /api/v1/books/catalog (also /api/v1/catalog).
Response retains data as an array and adds pagination and languages:

- pagination: page, pageSize, total, totalPages (zero when no matches).
- languages: original stored language strings of non-deleted books, without translating book content.
- data: non-deleted books with pdf excluded.

Query parameters:

| Key | Rule |
| --- | --- |
| q | Trimmed literal case-insensitive title/author search, up to 120 characters |
| language | Exact stored book language, up to 80 characters |
| type | physical or digital |
| minPrice / maxPrice | Non-negative decimal with up to 2 fractional digits, maximum 1,000,000; min <= max |
| sort | newest (default), price_asc, price_desc |
| page | Integer 1–10,000, default 1 |
| pageSize | Integer 1–48, default 12 |

Malformed/duplicate/unknown parameters return 400 CATALOG_PARAMETERS_INVALID. Storage failures return sanitized 503 CATALOG_UNAVAILABLE. Sorting includes _id as a tie-breaker; skip/limit paginate in MongoDB. Out-of-range valid pages return empty data and the actual total, not silent clamping. Counts/list/distinct are separate reads: concurrent catalog edits may change totals between requests; no snapshot consistency is promised. Regex is escaped; parameters never become raw MongoDB operators.

Compatibility: GET /get-all-books without parameters still returns the existing {status,data} full list for current consumers. With parameters it uses paginated catalog behavior and adds metadata. Legacy /search still returns an array, default cap 20 and [] for an empty query; it supports the same validated filters/sorting/pagination parameters. Both existing flat and /books-prefixed aliases remain. Recently added/popular lists, id and slug detail now exclude isDeleted=true as well as pdf. ID detail keeps the legacy {status,data:null} shape for a missing/deleted book; slug detail returns the existing 404.

No model fields, prices, currency, book language, writes or authentication logic were changed. Index creation/migration was not introduced. Real MongoDB execution plans, indexes, collection sizes and regex/deep-skip performance must be evaluated in isolated staging; legacy unpaginated consumers are deliberately preserved.

## Frontend

/all-books uses the new endpoint. Filter form applies values into query parameters; submitting filters resets page to 1. Previous/Next change only the page; reset removes catalog parameters and clears the draft even if URL was already empty. Browser refresh/back/forward read selection from URL instead of private storage. Unknown URL fields are rejected by the API; applying/resetting the form produces canonical supported parameters.

UI language changes preserve the current form component and unsent draft. Applied URL changes reinitialize it from URL. Existing useApiResource/readResource aborts obsolete GETs and ignores late responses; loading does not display old results. Localized retry, empty state, labels and pagination use en/de/qt/ru. Dates/content are not translated, currency remains EUR. Session and cart state are untouched. New qt wording needs native-speaker review.

## Verification and limits

Tests use fake Book queries, counts and distinct values; HTTP tests only bind loopback and preload CI guards. No real .env, database, mail or deployment was used. New checks cover invalid parameters, author/title and regex literals, combined filters, zero price bounds, stable ordering, page boundaries/totals, legacy response shapes, deleted/PDF exclusions, URL round-trip and labels in four locales. Existing late-response and session/cart tests are also run.

Actual browser back/forward, mobile visual rendering and live MongoDB performance are NOT verified here. Browser access remains restricted; this review did not bypass it. No full environment readiness is claimed.

Suggested commits:
1. Add validated catalog search filters and server pagination — backend service/routes/tests and compatibility mock.
2. Add URL-based catalog filters and localized pagination — frontend catalog components/page/tests, four dictionaries, shared codes and this instruction.

Verification result: backend 60 passed, 1 optional integration skipped; the CLI connection-attempt test was separately excluded. Frontend 24 passed. Frontend ESLint had zero errors/warnings; production build and backend syntax check passed. After the final error-sanitization change, the 5 catalog/access-control tests passed again. No commits were created.
