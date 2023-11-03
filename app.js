const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "covid19India.db");

const app = express();
app.use(express.json());
let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertDbObjectToResponseObjectState = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDbObjectToResponseObjectDistrict = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

const convertDbObjectToResponseObjectStateStatistics = (dbObject) => {
  return {
    totalCases: dbObject.cases,
    totalCured: dbObject.cured,
    totalActive: dbObject.active,
    totalDeaths: dbObject.deaths,
  };
};
//
app.get("/states/", async (request, response) => {
  const getAllStatesQuery = `SELECT * FROM state`;
  const statesArray = await database.all(getAllStatesQuery);
  response.send(
    statesArray.map((eachState) =>
      convertDbObjectToResponseObjectState(eachState)
    )
  );
});

//
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `SELECT * FROM state WHERE state_id = ${stateId}`;
  const state = await database.get(getStateQuery);
  response.send(convertDbObjectToResponseObjectState(state));
});

//
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const createDistrictQuery = `
  INSERT INTO 
  district (district_name, state_id, cases, cured, active, deaths) 
    VALUES 
    ('${districtName}', '${stateId}', '${cases}', '${cured}', '${active}', '${deaths}');`;
  const district = await database.run(createDistrictQuery);
  response.send("District Successfully Added");
});

//
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `SELECT * FROM district 
    WHERE district_id = ${districtId}`;
  const district = await database.get(getDistrictQuery);
  response.send(convertDbObjectToResponseObjectDistrict(district));
});

//
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `DELETE FROM district 
    WHERE district_id = ${districtId}`;
  await database.run(deleteDistrictQuery);
  response.send("District Removed");
});

//
app.put("/districts/:districtId/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const { districtId } = request.params;
  const updateDistrictQuery = `UPDATE district 
    SET 
    district_name = '${districtName}',
    state_id = '${stateId}',
    cases = '${cases}',
    cured = '${cured}',
    active = '${active}',
    deaths = '${deaths}'
    WHERE district_id = ${districtId}`;
  await database.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatisticsQuery = `SELECT SUM(cases), SUM(cured), SUM(active), SUM(deaths) FROM district 
  WHERE state_id = ${stateId}
  `;
  const statistics = await database.get(getStatisticsQuery);
  response.send({
    totalCases: statistics["SUM(cases)"],
    totalCured: statistics["SUM(cured)"],
    totalActive: statistics["SUM(active)"],
    totalDeaths: statistics["SUM(deaths)"],
  });
});

//
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictIdQuery = `SELECT state_id FROM district 
  WHERE district_id = '${districtId}'`;
  const getDistrictIdQueryResponse = await database.get(getDistrictIdQuery);
  const getStateNameQuery = `
    SELECT state_name AS stateName FROM state
    WHERE  state_id = ${getDistrictIdQueryResponse.state_id};
    `; //With this we will get state_name as stateName using the state_id
  const getStateNameQueryResponse = await database.get(getStateNameQuery);
  response.send(getStateNameQueryResponse);
}); //sending the required response

module.exports = app;
