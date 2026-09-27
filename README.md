# Group manager

[![AWS ECR](https://img.shields.io/badge/AWS%20ECR-group--manager-blue)](https://gallery.ecr.aws/jtekt-corporation/group-manager)

As a graph database, Neo4j is a great choice to manage highly relational data. On the other side, a great number of applications feature at least some form of user management system. With Neo4j, those users can be store as nodes and connected to other items via relationships. A typical example would be a blog, where both articles and users are individual nodes while authorships are represented by a relationship.

When dealing with a large number of users, it can become convenient to arrange those in groups. Here, groups too can be represented as nodes and the membership of a user by a relationship. However, building group management logic from scratch for every application would be tedious.

![Example graph](docs/6149cfd89a075fff8259b929.png)

This microservice, named Group manager, proposes a solution to this problem by offering just the generic logic to handle groups and their relationships, making it easy to integrate in a microservice architecture, alongside other services managing Neo4j records.

The application is built using Node.js and the Express framework.

An example of application relying on Group manager is [申請マネージャ](https://github.com/jtekt/web-based-approval-system), A web based approval system for application forms and other documents

For more information, please visit the project page [here](https://articles.maximemoreillon.com/articles/398)

## API

The current API is `/v3`. `/v1` and `/v2` (also served at `/`) are kept for legacy clients. All routes except `/`, `/health` and `/docs` require authentication (see below).

### Groups

| Endpoint              | Method | query/body | Description                                                          |
| --------------------- | ------ | ---------- | -------------------------------------------------------------------- |
| /v3/groups/           | GET    | see below  | Returns list of groups                                               |
| /v3/groups/           | POST   | name       | Creates a group                                                      |
| /v3/groups/{group_id} | GET    | -          | Returns information about the group corresponding to the provided ID |
| /v3/groups/{group_id} | PATCH  | properties | Updates properties of a group                                        |
| /v3/groups/{group_id} | DELETE | deep       | Deletes a group; with `deep`, also deletes its subgroups             |

#### GET /v3/groups query parameters

| Parameter   | Description                                                              |
| ----------- | ------------------------------------------------------------------------ |
| batch_size  | Number of results per page (default: `DEFAULT_BATCH_SIZE`, 100)          |
| start_index | Index of the first result (default: 0)                                   |
| shallow     | If set, only returns top-level groups (groups with no parent)            |
| direct      | If set, only returns direct subgroups (not transitive ones)              |
| official    | If set, only returns official groups                                      |
| nonofficial | If set, only returns non-official groups                                  |
| search      | Case-insensitive substring match on group name                           |
| name        | Exact match filter on name                                               |
| hidden      | Exact match filter on hidden flag                                        |
| restricted  | Exact match filter on restricted flag                                    |
| avatar_src  | Exact match filter on avatar_src                                         |

### Subgroups

| Endpoint                                   | Method | query/body | Description                                                          |
| ------------------------------------------ | ------ | ---------- | -------------------------------------------------------------------- |
| /v3/groups/{group_id}/groups               | GET    | see above  | Returns the groups belonging to the group with the given ID          |
| /v3/groups/{group_id}/parent_groups        | GET    | -          | Returns the groups to which the group with the given ID belongs      |
| /v3/groups/{group_id}/groups               | POST   | group_id   | Puts the group with ID group_id into the group                       |
| /v3/groups/{group_id}/groups/{subgroup_id} | POST   | -          | Puts a group into another                                            |
| /v3/groups/{group_id}/groups/{subgroup_id} | DELETE | -          | Removes a subgroup from a group                                      |

### Members

| Endpoint                                | Method | query/body        | Description                                                                      |
| --------------------------------------- | ------ | ----------------- | -------------------------------------------------------------------------------- |
| /v3/groups/none/members                 | GET    | -                 | Returns users without a group                                                    |
| /v3/groups/{group_id}/members           | GET    | -                 | Returns the users belonging to the group with the given ID                       |
| /v3/groups/{group_id}/members           | POST   | user_id, user_ids | Adds one or more users to the group; use 'self' as user_id to join               |
| /v3/groups/{group_id}/members/{user_id} | DELETE | -                 | Removes a user from the group; use 'self' as user_id to leave                   |
| /v3/members/{member_id}                 | GET    | -                 | Gets a member                                                                    |
| /v3/members/groups                      | GET    | user_ids          | Gets the groups of multiple users identified by their respective IDs             |
| /v3/members/{member_id}/groups          | GET    | -                 | Gets the groups of a member; use 'self' as member_id to get one's own groups    |

### Administrators

| Endpoint                                                | Method | query/body | Description                                                                                |
| ------------------------------------------------------- | ------ | ---------- | ------------------------------------------------------------------------------------------ |
| /v3/groups/{group_id}/administrators                    | GET    | -          | Returns the administrators of the group with the given ID                                  |
| /v3/groups/{group_id}/administrators                    | POST   | user_id, user_ids | Adds one or more administrators to the group                                        |
| /v3/groups/{group_id}/administrators/{administrator_id} | DELETE | -          | Removes an administrator from the group                                                    |
| /v3/administrators/{administrator_id}/groups            | GET    | -          | Gets the groups administrated by a user; use 'self' for one's own groups                   |

### Pagination

To limit the size of responses, groups, members and administrators are provided in a paginated manner. The page size and index of the first item on the page can be defined using the query parameters 'batch_size' and 'start_index' respectively.

`members` and `users` are interchangeable in all routes (e.g. `/v3/groups/{group_id}/users`).

### Authentication

Requests are authenticated with one of the following, each enabled when its variable is set (at least one is required):

- an API key in the `X-API-Key` header, validated by the API key manager (`API_KEY_MANAGER_URL`)
- an OIDC access token (a JWT with a `kid` header), verified against `OIDC_JWKS_URI`
- a legacy JWT from the user manager, checked against `IDENTIFICATION_URL`

### Service

| Endpoint      | Method | Description                                                    |
| ------------- | ------ | -------------------------------------------------------------- |
| /             | GET    | Application info: version, DB connection and setup status      |
| /health/live  | GET    | Liveness probe: the process responds                           |
| /health/ready | GET    | Readiness probe: 503 until the DB is set up and reachable      |
| /docs         | GET    | Swagger UI                                                     |

## Environment variables

| Variable             | Description                                                                                          | Default      |
| -------------------- | ---------------------------------------------------------------------------------------------------- | ------------ |
| APP_PORT             | Port the app listens on                                                                              | 80           |
| NEO4J_URL            | URL of the Neo4j database                                                                            | bolt://neo4j |
| NEO4J_USERNAME       | Username for the Neo4j database                                                                      | neo4j        |
| NEO4J_PASSWORD       | Password for the Neo4j database                                                                      |              |
| IDENTIFICATION_URL   | URL of the user identification endpoint for legacy JWTs, e.g. `http://employee-manager/v3/users/self` |              |
| OIDC_JWKS_URI        | JWKS URI of the OIDC provider                                                                        |              |
| API_KEY_MANAGER_URL  | URL of the API key manager                                                                           |              |
| AUTH_USER_ID_FIELDS  | Comma-separated fields of the authenticated user that identify them, besides `_id`; the first one is also used for API keys | |
| DB_USER_ID_FIELDS    | Comma-separated properties of a Neo4j user that can match those identifiers, besides `_id`           |              |
| DEFAULT_BATCH_SIZE   | Default page size                                                                                    | 100          |
| CORS_ALLOWED_ORIGINS | Comma-separated allowed CORS origins; all origins are allowed when unset                             |              |

The version shown at `/` comes from `APP_VERSION`, set at build time from the git tag (`--build-arg APP_VERSION`).
