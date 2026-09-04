# Task 2.1.5 — Provision the managed instance, and reach it over TLS from outside the application

**Status:** Not started
**Story:** [2.1 Managed Postgres Provisioning & the Secrets Boundary](STORY.md)
**Depends on:** Task 2.1.1
**Amended:** 2026-09-04, after Tasks 2.1.1, 2.1.2 and 2.1.3 — see the three _Amended_ sections below

## Objective

Spend Task 2.1.1's decisions: create the server, the database and its networking, and prove a client can connect to it over TLS and execute a query. No application code is involved, so a failure here has one possible cause.

## Work

- **Create it with the decisions as written, and read the created resource back rather than trusting the command.** Task 1.11.3's practice is the model: every property that matters was re-read from the platform afterwards, and that is how the `HOST=0.0.0.0` requirement and the empty `secrets` array became facts rather than assumptions. Confirm tier, version, region, storage, backup retention and networking mode from the server as created
- **Do the networking half deliberately and record what it admits.** Whichever mode Task 2.1.1 chose, the firewall or the VNet configuration is the thing an attacker meets first, and "allow Azure services" — if that is the path — should be recorded as what it actually is. Also record what is _not_ enabled: public access from a developer's laptop is a rule somebody will want during Story 2.2 and it should be a decision rather than something that quietly stays on
- **Prove TLS rather than assume it.** Postgres will happily negotiate a plaintext connection if the server permits one, so the two things to establish are that the server **requires** encryption and that the client is verifying rather than merely encrypting — those are different, and the second is where a "TLS is on" claim usually turns out to be trust-on-first-use. Record which certificate authority the client validates against and whether anything has to ship with the application to do it, because that is a file in the image if the answer is yes
- **Answer what happens when TLS is not available**, which the story's scope names explicitly. Try it: a client configured to require it against a server that will not, and the reverse. The useful record is the shape of the failure — whether it is a clear refusal or a hang, because a hang at connection time inside a startup path is the same class of problem as the `fetch` that never returns
- **Take the figures somebody will otherwise guess.** Connection time from a laptop and, later, from the runner or the container; whether the server pauses, sleeps or throttles when idle on a Burstable tier; what the maximum connection count is, because that is the ceiling a pool size has to sit under and a B1MS's is small enough to matter
- **Create the database itself, and decide the name.** An empty database with a chosen name, no schema, no extensions unless Story 2.2's plan already needs one named at creation
- **Nothing in this repository connects to it in this task.** The client is `psql` or equivalent, run by hand. Application configuration pointing at it is Task 2.1.6's, and doing it here would merge the "does the server work" question with the "does the credential path work" question

## Done when

- The server and an empty database exist, with every creation property re-read from the platform and recorded
- The networking configuration is recorded in terms of what it admits, not just what it is called
- A client connects over TLS, executes a query, and the verification mode is known and stated
- The no-TLS case was attempted and its failure shape recorded
- The connection ceiling, idle behaviour and connection latency are measured
- No application code, no environment variable on the Container App, and no credential in this repository has changed

## Notes

This is the deploy half of the local/deployed split this story uses throughout, and it is deliberately narrow: the previous three tasks proved the application against a database it could see, and this one proves a database with no application in front of it. Task 2.1.6 is the only place both halves are unknown at once, which is why it comes after both.

## Amended after Task 2.1.1 (2026-09-04)

This is the task 2.1.1 was written to de-risk, so it inherits the most. Everything below is a fact 2.1.1 measured or a piece of work it found that had no owner.

### Two prerequisites, either of which fails the first create

- **`Microsoft.DBforPostgreSQL` is `NotRegistered` on this subscription**, read 2026-09-04. This is **Task 1.11.4's exact failure** — the subscription had never registered `Microsoft.Web` and the first Static Web App create failed — and **the same asymmetry reproduced**: `checkNameAvailability` returned `"nameAvailable": true` from the unregistered provider, so the reassuring call answers while the one that matters would not. `az provider register --namespace Microsoft.DBforPostgreSQL --wait` is this task's **first command**. 2.1.1 deliberately did not run it, because registering is a change to the subscription.
- **`psql` is not installed on the development machine**, checked 2026-09-04. The brief says "the client is `psql` or equivalent, run by hand"; installing it is a real step, and if it is declined then "or equivalent" has to become a named thing rather than an assumption.

### The creation arguments, and the three whose defaults are traps

**`psql-marketpulse-dev` was available when checked on 2026-09-04** — the name is globally unique across Azure, so re-check at creation rather than assume. Target FQDN `psql-marketpulse-dev.postgres.database.azure.com`, in `rg-marketpulse-dev`, **in East US 2**.

Three flags must be passed explicitly because their defaults are wrong or irreversible, and a default that cannot be changed later is a decision somebody did not notice making:

- **`--storage-size 32`.** The CLI's default is **128**, four times the free offer.
- **Storage type**, because it is irreversible and the default is silent.
- **`--geo-redundant-backup Disabled`**, because geo-redundancy is creation-only.

Also `--storage-auto-grow Disabled` (the default, chosen rather than inherited — its smallest step is a 2× jump to 64 GiB at `$7.36`/month that cannot be undone), `--backup-retention 7`, `--tier Burstable --sku-name Standard_B1ms`, `--version 18`, and **`--microsoft-entra-auth Enabled --password-auth Disabled` with no `--admin-user` and no `--admin-password` at all**.

### The Entra bootstrap, which is new work the original brief does not contain

With no admin user, "create the database and connect to it" is a different procedure from the one the brief assumes, and it is the part most likely to go wrong:

1. Set the server's Microsoft Entra administrator at creation (`--admin-object-id 8d92279d-ed7d-4127-9884-ba258857457c`, `--admin-type User`).
2. Get a token with `az account get-access-token --resource https://ossrdbms-aad.database.windows.net` and use it **as the password**, with the Entra user's name as the username.
3. **Connect as that administrator and confirm it works before depending on it.** The subscription owner is an **external (`#EXT#`) guest** in the default directory, and a guest principal as the sole database administrator is not the well-trodden path. If it does not work, the fallback is `az postgres flexible-server update --password-auth Enabled` — a **control-plane** operation needing no database access, so lock-out is recoverable — and the divergence is recorded in `HOSTING.md` with its reason.
4. Create the backend's role: `select * from pgaadauth_create_principal('marketpulse-backend', false, false);` — **run on the `postgres` database**, not on the application database, or it fails with "No function matches...".

The application's own connection is still Task 2.1.6's; what this task establishes is that the role exists and the administrator path works.

### Figures to take, one of which nothing else in the story will

- **The East US → East US 2 round trip**, which is the cost of the region 2.1.1 was forced into and which **nothing else measures**. Take it from the deployed backend's region rather than from a laptop in the UK, because that is the hop that matters.
- **The connection ceiling is a confirmation, not a discovery**: documented as **50 `max_connections`, 35 usable**, with 15 reserved. Confirm it on the created server, because Task 2.1.4 will already have sized a pool against the documented number.
- **Idle behaviour on a Burstable tier** is worth taking carefully: the tier is credit-based and can "become unreachable" under sustained load, and separately a **stopped** flexible server "automatically starts after seven days", so it cannot be parked indefinitely to save money.

### Three pieces of monitoring that 2.1.1 identified and left unowned — they belong here

- **A storage alert, which is what replaces autogrow.** With autogrow off, the failure it protects against is real: at 95% used **or fewer than 5 GiB free, whichever is more**, the server "automatically switches … to _read-only mode_" — and on a 32 GiB disk the binding clause is the 5 GiB one, so **usable capacity is ~27 GiB**. The documentation asks for an alert on `storage percent` at 80%.
- **A CPU-credits alert**, which the Burstable documentation asks for by name: "Monitor **CPU Credits Remaining** in Azure Monitor and set alerts for low credits."
- **A resource lock, or a written decision not to set one.** 2.1.1 confirmed **no lock exists** on the subscription or the resource group, and deleting a flexible server **deletes its backups irrecoverably** — "If you delete a server, all backups that belong to the server are also deleted and can't be recovered" — with the backup documentation recommending a lock by name.

### Two consequences of the networking decision to record as they are created

- **Every restore is bound to the mode**: "If you configure your source server with a _public access_ network, you can only restore to public access." The one-way door binds the recovery path, not just the running server.
- **Firewall changes are not immediate** — "can take up to five minutes to take effect" — which is a wait to plan for rather than a failure to debug, and rules must be IPv4 or they are rejected outright.

## Amended after Task 2.1.2 (2026-09-04)

### The `psql` prerequisite is answered, and the answer comes with a measured limit that lands on this task's hardest bullet

Task 2.1.1 recorded that **`psql` is not installed on the development machine**, and said that if installing it were declined then "or equivalent" would have to become a named thing rather than an assumption. **It is named now: the local database's own container.** `pnpm db exec postgres psql` is **psql 18.6**, the same major as the server this task creates, and DNS resolves inside the container (confirmed against an external hostname), so it can dial the managed server directly:

```sh
pnpm db exec postgres psql "host=psql-marketpulse-dev.postgres.database.azure.com ..."
```

No host install, and the client version matches the server version rather than being whatever a package manager offers.

**But it cannot verify a certificate as it stands, and this bears directly on the TLS bullet above.** Measured in the container rather than assumed: the `ca-certificates` package is **not installed**, `/etc/ssl/certs/` holds only `ssl-cert-snakeoil.pem`, `/usr/lib/ssl/cert.pem` is a **dangling symlink** to a `ca-certificates.crt` that does not exist, and libpq's default `~/.postgresql/root.crt` is absent. So out of the box this client can do `sslmode=require` — encrypt without verifying — and **cannot** do `verify-ca` or `verify-full`.

That is precisely the distinction this task's brief warns about: "the two things to establish are that the server **requires** encryption and that the client is verifying rather than merely encrypting … the second is where a 'TLS is on' claim usually turns out to be trust-on-first-use". **A `require`-only connection from this container would produce exactly that false claim.** So using the container as the client means either installing `ca-certificates` into it, or mounting a CA file, and whichever is chosen is a real step to record — including whether the file is one that would have to ship with the application, which the brief already asks about and which Task 2.1.6 inherits for the backend's own connection.

### Three things to match rather than re-decide

- **The database name is `marketpulse`.** Task 2.1.2 chose it for the local container. The brief says "create the database itself, and decide the name" — the decision is now to match, or to state the divergence, because a local `marketpulse` against a deployed something-else is a connection string that differs in one more place than it needs to.
- **`--version 18` has a local counterpart that nothing checks.** `LOCAL_DATABASE.version` in `scripts/local-database.mjs` is `18` and is recorded in both gap lists as an invariant with no check behind it. This task should **record the deployed minor** when it reads the created server back, so the two are at least comparable by hand; the local container is 18.6 today, and the one-liner is `docker compose exec postgres postgres --version` against `az postgres flexible-server show --query version`.
- **`no TLS offered` is what a correct local database reports**, so `pnpm ready`'s line is not a comparison against the managed server and should not be read as one.

## Amended after Task 2.1.3 (2026-09-04)

Small but concrete: this task now has a **named set of values to produce** rather than a
set of facts to record, because the configuration boundary that will consume them exists.

### What this task creates is now the right-hand side of seven declared variables

`CONFIG_VARIABLES` holds `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`,
`DATABASE_USER`, `DATABASE_AUTH`, `DATABASE_PASSWORD` and `DATABASE_SSL`. Three of them
are answered by what this task creates, and recording them in those terms is what makes
Task 2.1.6 a configuration change rather than a research exercise:

| Variable        | Produced by this task                                                          |
| --------------- | ------------------------------------------------------------------------------ |
| `DATABASE_HOST` | the server's FQDN, expected `psql-marketpulse-dev.postgres.database.azure.com` |
| `DATABASE_NAME` | the database this task creates — **match the local default, `marketpulse`**    |
| `DATABASE_USER` | the role `pgaadauth_create_principal` creates, i.e. `marketpulse-backend`      |

The other four are already decided: `DATABASE_PORT` is 5432, `DATABASE_AUTH` will be
`entra`, `DATABASE_PASSWORD` is **not set at all** deployed, and `DATABASE_SSL` is the
subject of the next section. **Record the three above verbatim when the server is read
back**, in the shape `HOSTING.md`'s account-facts table uses.

The database-name bullet is stronger than it was: it is no longer "match what Task 2.1.2
chose for a container", it is **match a documented default in the configuration
boundary**, and a divergence now means a deployed environment overriding a variable for
no reason.

### The TLS bullet lands on a shipped vocabulary, and one value is deliberately missing

`DATABASE_SSL` is `disable` | `require` | `verify-full` — libpq's own names, so this
task's client-side experiments and the application's setting speak the same language.
The brief's distinction between "the server **requires** encryption" and "the client is
**verifying** rather than merely encrypting" is exactly the gap between `require` and
`verify-full`, and it is now a value somebody can get wrong in one place instead of a
property somebody can claim.

**`verify-ca` is not in the set, and that is this task's to confirm or reverse.** It was
left out because `verify-full` is what a managed server with a stable FQDN wants and a
vocabulary should not carry a mode nobody has a use for. If the certificate this server
presents makes `verify-full` unworkable — a host-name mismatch is the usual cause —
then `verify-ca` is a one-line widening of the union in `config.ts` plus its
`.env.example` line, and it should be recorded there **with the certificate fact that
forced it** rather than added because a driver accepted it.

The container-as-client limit the previous amendment records is unchanged and still
decides how this task is done: that container can do `require` and **cannot** do
`verify-full`, so proving the mode the application will actually use means installing
`ca-certificates` into it or mounting a CA file.

### One stale name

The previous amendment refers to **`LOCAL_DATABASE.version`**. Task 2.1.3 moved every
other value in that script into the configuration boundary and left the version behind
as **`LOCAL_DATABASE_VERSION`** — a bare exported constant. The invariant it names is
unchanged: nothing compares it against the deployed `--version`, it is in both gap
lists, and the one-liner is still `docker compose exec postgres postgres --version`
against `az postgres flexible-server show --query version`. **Recording the deployed
minor when the server is read back is still this task's**, and it is now the only way
the two numbers can be compared at all.
