const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const jwt = require("jsonwebtoken");
const app = express();

app.use(express.json());

const path = require("path");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const bcrypt = require("bcrypt");

InitializeServerAndDb = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000);
    console.log(`Server is running at port 3000`);
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
  }
};
InitializeServerAndDb();

//API 1
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const Q1 = `SELECT * from user WHERE username = '${username}'`;
  const checkUser = await db.get(Q1);
  if (checkUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const checkPassword = await bcrypt.compare(password, checkUser.password);
    if (checkPassword) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "RRR");
      response.send({
        jwtToken: jwtToken,
      });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//Authorization
const Authentication = (request, response, next) => {
  const headerAuth = request.headers["authorization"];
  if (headerAuth === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    const token = headerAuth.split(" ")[1];
    jwt.verify(token, "RRR", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

//API2

app.get("/states", Authentication, async (request, response) => {
  const Q2 = `SELECT
  state_id AS stateId,
  state_name AS stateName,
  population
  FROM state;`;
  const statesList = await db.all(Q2);
  response.send(statesList);
});
module.exports = app;

//API3

app.get("/states/:stateId/", Authentication, async (request, response) => {
  const { stateId } = request.params;
  const Q3 = `SELECT
  state_id AS stateId,
  state_name AS stateName,
  population
  FROM state
  WHERE
  state_id=${stateId};`;
  const state = await db.get(Q3);
  response.send(state);
});

//API4

app.post("/districts/", Authentication, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const Q4 = `INSERT INTO district(district_name, state_id, cases, cured, active, deaths)
  VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths})
  ;`;
  await db.run(Q4);
  response.send("District Successfully Added");
});

//API5

app.get(
  "/districts/:districtId/",
  Authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const Q5 = `SELECT
  district_id AS districtId,
  district_name AS districtName,
  state_id AS stateId,
  cases,
  cured,
  active,
  deaths
  FROM district
  WHERE
  district_id=${districtId};`;
    const district = await db.get(Q5);
    response.send(district);
  }
);

//API6
app.delete(
  "/districts/:districtId/",
  Authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const Q6 = `DELETE FROM district WHERE
  district_id=${districtId};`;
    const district = await db.run(Q6);
    response.send("District Removed");
  }
);

//API7

app.put(
  "/districts/:districtId/",
  Authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;

    const Q7 = `UPDATE district
  SET
  district_name = '${districtName}',
  state_id = ${stateId},
  cases =${cases},
  cured=${cured},
  active=${active},
  deaths=${deaths}
  WHERE
  district_id=${districtId};`;

    await db.get(Q7);
    response.send("District Details Updated");
  }
);

//API8

app.get(
  "/states/:stateId/stats/",
  Authentication,
  async (request, response) => {
    const { stateId } = request.params;
    const Q8 = `SELECT
  sum(cases) AS totalCases,
  sum(cured) AS totalCured,
  sum(active) AS totalActive,
  sum(deaths) AS totalDeaths
  FROM state NATURAL JOIN district 
  WHERE
  state_id=${stateId};`;
    const stats = await db.get(Q8);
    response.send(stats);
  }
);

module.exports = app;
