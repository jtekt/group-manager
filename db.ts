import neo4j from "neo4j-driver";

export const {
  NEO4J_URL = "bolt://neo4j",
  NEO4J_USERNAME = "neo4j",
  NEO4J_PASSWORD = "",
} = process.env;

const auth = neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD);

const options = {
  v1: {},
  v2: { disableLosslessIntegers: true },
};

export const drivers = {
  v1: neo4j.driver(NEO4J_URL, auth, options.v1),
  v2: neo4j.driver(NEO4J_URL, auth, options.v2),
};

// Set once the DB setup (IDs, constraints) has completed
let initialized = false;

// Live check: whether Neo4J can be reached right now
export const get_connection_status = async () => {
  try {
    await drivers.v2.verifyConnectivity();
    return true;
  } catch {
    return false;
  }
};

const set_ids = async () => {
  const id_setting_query = `
    MATCH (g:Group)
    WHERE g._id IS NULL
    SET g._id = toString(id(g))
    RETURN COUNT(g) as count
    `;

  const session = drivers.v2.session();

  try {
    const { records } = await session.run(id_setting_query);
    const count = records[0].get("count");
    console.log(`[Neo4J] Formatted new ID for ${count} groups`);
  } finally {
    session.close();
  }
};

const create_constraints = async () => {
  const session = drivers.v2.session();

  try {
    await session.run(
      `CREATE CONSTRAINT IF NOT EXISTS FOR (g:Group) REQUIRE g._id IS UNIQUE`,
    );
    console.log(`[Neo4J] Created constraints`);
  } finally {
    session.close();
  }
};

export const close = async () => {
  await Promise.all([drivers.v1.close(), drivers.v2.close()]);
  console.log("[Neo4J] Connections closed");
};

// Retries until the setup succeeds, so a DB that is not up yet never crashes the app
export const init = async () => {
  try {
    console.log("[Neo4J] Initializing DB...");
    await set_ids();
    await create_constraints();
    initialized = true;
    console.log("[Neo4J] DB initialized");
  } catch (error) {
    console.error("[Neo4J] DB initialization failed, retrying in 10s", error);
    setTimeout(init, 10000);
  }
};

export const get_initialized = () => initialized;
