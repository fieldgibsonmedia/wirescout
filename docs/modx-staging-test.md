# MODX staging test

Proves that Wirescout can post a draft to a MODX magazine through the connector, as the journalist's own MODX account, with no change to the magazine. Background and verdicts: `docs/modx-integration-research.md`.

Local only. It never touches a live magazine.

## What it checks

`src/publish/modx-staging-test.js` runs these steps against a staging MODX and prints PASS or FAIL for each:

1. Login to the manager context (`security/login`) returns a session cookie and a token.
2. The cookie without the token is refused (401). A wrong token is refused (401).
3. The article section can be read with cookie and token (`resource/get`).
4. `resource/create` makes an **unpublished** draft in the article section, with the article template.
5. `resource/get` returns it with the right title, parent, template and `published = 0`.
6. `resource/publish` is allowed or refused according to the account's permissions (both are valid results). If allowed, `resource/unpublish` puts it back.
7. The draft is moved to the recycle bin (`resource/delete`), unless `KEEP_DRAFT=1`.
8. `security/logout` works, and the old cookie and token are refused afterwards.

All 11 checks passing means the mechanism works and the implementation plan (`docs/post-to-modx-plan.md`) can go ahead.

## The four magazines

All four run MODX Revolution 2.8 with the same layout, and each has a local Docker copy in `~/Development` with a copy of its production database. Each site's `Administrator` group has an `Editor` role whose policy grants `frames`, `new_document`, `publish_document`, `unpublish_document` and `delete_document`: the rights a journalist's account has.

| Magazine | Repo folder | Local host | MODX | Article section | Article template | Login limit |
| --- | --- | --- | --- | --- | --- | --- |
| Corporate Disclosures | `corporate-disclosures` | `http://cd.test` | 2.8.3 | News, id 19 | article, id 3 | 50 attempts, 60 min block |
| Environmental Finance | `environmental-finance.com` (MODX in `environmental-finance.com/htdocs`) | `http://ef.test` | 2.8.1 | News, id 8 | article, id 3 | 50 attempts, 60 min block |
| Insurance Asset Risk | `insuranceassetrisk.com` (MODX in `insuranceassetrisk.com/htdocs`) | `http://iar.test` | 2.8.1 | News, id 9 | article, id 4 | 50 attempts, 60 min block |
| InsuranceERM | `insuranceerm.com` (MODX in `insuranceerm.com/htdocs`) | `http://ierm.test` | 2.8.1 | News, id 48 | article, id 8 | 20 attempts, 60 min block |

The `.test` host names resolve through the local traefik (`/etc/hosts` has them). InsuranceERM's compose file has a second database on port 3309 that clashes with Environmental Finance's; start it with `docker compose up -d ierm-web ierm-php mysql`.

The article section above is where the test created its draft. Where real drafts go is decided in `docs/post-to-modx-plan.md` (In Brief on three sites, News on Corporate Disclosures); production ids must be read again on each live site before use.

## The staging MODX (corporate-disclosures, the first one tested)

The `corporate-disclosures` repo (`~/Development/corporate-disclosures`) has a Docker setup for the site: nginx behind the local traefik at `http://cd.test` (`127.0.0.1 cd.test` is in `/etc/hosts`), PHP 7.4, MariaDB with a copy of the production database (`cd_modx`).

Facts read from that database on 2026-11-02 (ids, no personal data):

| Fact | Value |
| --- | --- |
| MODX version | Revolution 2.8.3-pl |
| Article template | `article`, id 3 |
| Article section | `News`, id 19 (3,562 articles; `Top stories` is 20, `Opinion` is 21) |
| Template variables on the article template | channels, authors, companies, people, countries, images and ad fields; none is required to save |
| Manager user group | `Administrator` (the only manager group; the rest are reader groups), with roles Super User, Content Manager and Editor |
| Login limits | 50 failed attempts, then blocked 60 minutes |
| Session cookie | no domain set (works on localhost), 7 days with "remember me" |

The database copy holds real users. The test uses a dedicated test account only; never a real person's account.

## Run it

1. Start the site: in `~/Development/corporate-disclosures`, `docker compose up -d`. Check http://cd.test loads.
2. Create the test editor account once (Ken's ok first: it adds one user to the local database copy). From the corporate-disclosures folder:

    ```bash
    docker compose exec -e TEST_PASSWORD cd-php php -r '
    require "/var/www/corporatedisclosures.org/config.core.php";
    require MODX_CORE_PATH . "model/modx/modx.class.php";
    $modx = new modX(); $modx->initialize("mgr");
    $user = $modx->newObject("modUser");
    $user->set("username", "wirescout-test");
    $user->set("password", getenv("TEST_PASSWORD")); // hashed by MODX on set
    $user->set("active", 1);
    $profile = $modx->newObject("modUserProfile");
    $profile->set("fullname", "Wirescout staging test");
    $profile->set("email", "wirescout-test@example.com");
    $user->addOne($profile);
    echo $user->save() && $user->joinGroup("Administrator", "Editor") ? "created" : "FAILED", PHP_EOL;'
    ```

    Set `TEST_PASSWORD` in the shell first (`export TEST_PASSWORD=...`); it is never written anywhere. The account joins the site's only manager group (`Administrator`) with its `Editor` role, which maps to the `Editor` policy: the same rights a journalist's account would have. On a real magazine the journalist's own account is used instead. For the other three sites the same command works from their repo folder, with the PHP service name (`ef-php`, `iar-php`, `ierm-php`) and `config.core.php` under `<site>/htdocs/`.

3. Run the test from the wirescout folder:

    ```bash
    MODX_HOST=http://cd.test MODX_USERNAME=wirescout-test MODX_PASSWORD="$TEST_PASSWORD" \
    MODX_PARENT_ID=19 MODX_TEMPLATE_ID=3 node src/publish/modx-staging-test.js
    ```

4. Read the output: 11 lines of PASS or FAIL, then a count. The script never prints the password, the cookie or the token.

## Afterwards

- The draft is soft-deleted. To purge it: in the MODX manager (http://cd.test/manager/, the test account), right-click the recycle bin icon → Empty recycle bin.
- To remove the test account: Manage → Users → `wirescout-test` → Delete.
- `docker compose stop` in the corporate-disclosures folder stops the site.

## Finding to carry into the implementation

Send `X-Requested-With: XMLHttpRequest` on every connector call, and treat a JSON body with `success: false` and `code: 401` as a refusal too. Without the header MODX still refuses (the processor never runs), but the HTTP status stays 200.

## Results

| Date | Who | Result | Notes |
| --- | --- | --- | --- |
| 2026-11-02 | Ken (test account `wirescout-test`, Editor role) | **11 of 11 passed** | Local corporate-disclosures copy, MODX 2.8.3. Drafts 4541 and 4542 created under `News`, published, unpublished and binned. First run showed 9 of 11: MODX reports a refusal as HTTP 200 with `code: 401` in the JSON unless the request carries `X-Requested-With: XMLHttpRequest`, as the manager does. The script now sends that header and accepts both forms. |
| 2026-11-02 | Ken (test account `wirescout-test`, Editor role) | **11 of 11 passed** | Local environmental-finance.com copy, MODX 2.8.1, `http://ef.test`, section News (8), template article (3). Draft 92896 binned. |
| 2026-11-02 | Ken (test account `wirescout-test`, Editor role) | **11 of 11 passed** | Local insuranceassetrisk.com copy, MODX 2.8.1, `http://iar.test`, section News (9), template article (4). Draft 39920 binned. |
| 2026-11-02 | Ken (test account `wirescout-test`, Editor role) | **11 of 11 passed** | Local insuranceerm.com copy, MODX 2.8.1, `http://ierm.test`, section News (48), template article (8). Draft 74231 binned. |
