const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const app = express()

app.use(express.json())

const dbPath = path.join(__dirname, 'covid19India.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.get('/', (request, response) => {
      console.log('hello')
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const convertStateDbObjToResponseObj = objState => {
  return {
    stateId: objState.state_id,
    stateName: objState.state_name,
    population: objState.population,
  }
}

const convertDistrictDbObjToResponseObj = objDistrict => {
  return {
    districtId: objDistrict.district_id,
    districtName: objDistrict.district_name,
    stateId: objDistrict.state_id,
    cases: objDistrict.cases,
    cured: objDistrict.cured,
    active: objDistrict.active,
    deaths: objDistrict.deaths,
  }
}

//API_1 : get covid states
app.get('/states/', async (request, response) => {
  const getStatesQuery = `
    SELECT * FROM state;
    `
  const stateArray = await db.all(getStatesQuery)
  response.send(
    stateArray.map(eachState => convertStateDbObjToResponseObj(eachState)),
  )
})

//API_2: get covid states by id
app.get('/states/:stateId', async (request, response) => {
  const {stateId} = request.params
  const getStatesQuery = `
    SELECT * FROM state WHERE state_id=${stateId};
    `
  const state = await db.get(getStatesQuery)
  response.send(convertStateDbObjToResponseObj(state))
})

//get covid districts
app.get('/districts/', async (request, response) => {
  const getDistrictsQuery = `
    SELECT * FROM district;
    `

  const districtArray = await db.all(getDistrictsQuery)
  response.send(
    districtArray.map(eachDistrict =>
      convertDistrictDbObjToResponseObj(eachDistrict),
    ),
  )
})

//API_4: get district based on the district ID
app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictQuery = `
    SELECT * FROM district WHERE district_id=${districtId};
    `
  const district = await db.get(getDistrictQuery)
  response.send(convertDistrictDbObjToResponseObj(district))
})

//API_3: Create a district in the district table
app.post('/districts/', async (request, response) => {
  const districtsDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtsDetails
  const postCovidQuery = `
  INSERT INTO district( district_name,
    state_id,
    cases,
    cured,
    active,
    deaths)
    VALUES('${districtName}',
    ${stateId},
    ${cases},
    ${cured},
    ${active},
    ${deaths})
    
  `
  await db.run(postCovidQuery)
  response.send('District Successfully Added')
})

//API_5: Deletes a district from the district table based on the district ID
app.delete('/districts/:districtId', async (request, response) => {
  const {districtId} = request.params
  const deleteDistrictQuery = `
  DELETE FROM district WHERE district_id=${districtId};
  `

  await db.run(deleteDistrictQuery)
  response.send('District Removed')
})

//API_6: Updates the details of a specific district based on the district ID
app.put('/districts/:districtId', async (request, response) => {
  const districtsDetails = request.body
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = districtsDetails
  const updateDistrictQuery = `
  UPDATE 
    district
  SET 
    district_name='${districtName}',
    state_id=${stateId},
    cases=${cases},
    cured=${cured},
    active=${active},
    deaths=${deaths}
  WHERE district_id=${districtId};
  `
  await db.run(updateDistrictQuery)
  response.send('District Details Updated')
})

//API_7: Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID
app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStatesStatsQuery = `
    SELECT 
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
     FROM district WHERE state_id=${stateId};
    `
  const stats = await db.get(getStatesStatsQuery)
  response.send({
    totalCases: stats['SUM(cases)'],
    totalCured: stats['SUM(cured)'],
    totalActive: stats['SUM(active)'],
    totalDeaths: stats['SUM(deaths)'],
  })
})

//API_8: Returns an object containing the state name of a district based on the district ID
app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getStateIdQuery = `
    SELECT state_id FROM district WHERE district_id=${districtId};
    `

  const stateId = await db.get(getStateIdQuery)
  const getStateNameQuery = `
  SELECT state_name FROM state WHERE state_id = ${stateId.state_id};
  `
  const stateNameList = await db.get(getStateNameQuery)
  response.send(stateNameList)
})

module.exports = app
