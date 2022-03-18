// This is the entry point for the application server.

import { resetBoardArray, BoardCell, boardCell, getCellState, setCellState, cellUpdaterFunctions1,
         PatternObject, PatternPackage, CatalogueReference } from './GameLogicTypes';

// This function takes a string representation of a game board pattern and returns an object
// containing this pattern as a square array of type BoardCell.  The object also contains the min
// and max bounds of the array as defined in the context of the accessor functions
// GameLogicTypes.getCellState and GameLogicTypes.setCellState.  See 20.cells for an example of
// the string representation used.
function deserialisePattern(pattern : string)
                           : {gameBoard : BoardCell[], min : number, max : number} {
  const patternLines = pattern.split("\n");
  let maxLineLength = 0;
  const columnLength = patternLines.length;
  patternLines.forEach(value => {
    if (value.length > maxLineLength) {maxLineLength = value.length}
  });
  let largestSide;
  if (columnLength > maxLineLength) {largestSide = columnLength}
  else {largestSide = maxLineLength}

  if (largestSide % 2 === 0) {largestSide++}
  const boardArraySize = (largestSide - 1) / 2 + 1;
  const max = boardArraySize - 1;
  const min = -max;
  const gameBoardObject = {
    gameBoard: [],
    min: min,
    max: max
  };
  gameBoardObject.gameBoard = Array(boardArraySize).fill(boardCell)
    .map(() => new Array(boardArraySize).fill(boardCell));
  resetBoardArray(gameBoardObject.gameBoard, boardCell, max, null);

  let i = min, j;
  patternLines.forEach(line => {
    j = min;
    for (let k = 0; k <= line.length - 1; k++) {
      if (line.charAt(k) === "O") {
        setCellState(gameBoardObject.gameBoard, true, null, cellUpdaterFunctions1, i, j);
      }
      j++;
    }
    i++;
  });
  return gameBoardObject;
}

// This function takes the object returned by deserialisePattern and returns a JSON string that
// represents the game board pattern.  This two stage representation change ensures the pattern
// will be auto centred around the coordinate system origin on the client side.
function reserialisePattern(gameBoardObject : {gameBoard : BoardCell[], min : number, max : number})
                           : PatternObject {
  const liveCells = [];
  for (let i = gameBoardObject.min; i <= gameBoardObject.max; i++) {
    for (let j = gameBoardObject.min; j <= gameBoardObject.max; j++) {
      if (getCellState(gameBoardObject.gameBoard, i, j).cellState === true) {
        liveCells.push({i: i, j: j})
      }
    }
  }
  const patternObject = {
    boardArraySize: gameBoardObject.max + 1,
    liveCells: liveCells
  };
  return patternObject;
}

// This function converts a new game board pattern received from the client into the string
// representation used in the database.
function convertPattern(newPattern : PatternObject) : string {
  const max = newPattern.boardArraySize - 1;
  const min = -max;
  const gameBoardObject = {
    gameBoard: [],
    min: min,
    max: max
  };
  gameBoardObject.gameBoard = Array(newPattern.boardArraySize).fill(boardCell)
    .map(() => new Array(newPattern.boardArraySize).fill(boardCell));
  resetBoardArray(gameBoardObject.gameBoard, boardCell, max, null);
  newPattern.liveCells.forEach(cell => {
    setCellState(gameBoardObject.gameBoard, true, 0, cellUpdaterFunctions1, cell.i, cell.j);
  });

  let patternString = "";
  for (let i = gameBoardObject.min; i <= gameBoardObject.max; i++) {
    for (let j = gameBoardObject.min; j <= gameBoardObject.max; j++) {
      if (getCellState(gameBoardObject.gameBoard, i, j).cellState === true) {
        patternString += "O";
      }
      else {
        patternString += ".";
      }
    }
    patternString += "\n";
  }
  return patternString.substring(0, patternString.length - 1);
}

function openDBConnection() : Promise<any> {
  const fs = require("fs");
  let config;
  try {
    config = JSON.parse(fs.readFileSync("./cloud_config.json"));
  }
  catch(error) {
    console.error(`The config file could not be opened.`);
    return null;
  }
  config.ssl = {
    ca: fs.readFileSync(`./keys/ca.pem`),
    cert: fs.readFileSync(`./keys/client-cert.pem`),
    key: fs.readFileSync(`./keys/client-key.pem`)
  };

  const mysql = require("mysql");
  const connection = mysql.createConnection(config);
  const connectPromise = new Promise<any>((resolve, reject) => {
    connection.connect(error => {
      if (error) {
        console.error(error);
        reject(error);
      }
      else {
        console.log("Successfully connected to the database.");
        resolve(connection);
      }
    });
  });
  return connectPromise;
}

function closeDBConnection(connection) : void {
  connection.end();
  console.log("The database connection has been closed.");
}

// This function queries the database by Pattern_id to retrieve a game board pattern and 
// associated metadata.
function getPatternQuery(connection, patternId : number) : Promise<PatternPackage> {
  const query = `SELECT Name, Username, Comments, Pattern FROM pattern_catalogue
                 WHERE Pattern_id = ${patternId}`;
  const queryResolution =
    new Promise<PatternPackage>((resolve, reject) => {
      connection.query(query, (error, queryResult) => {
        if (error) {
          console.error(error);
          reject(null);
        }
        else if (queryResult.length === 0) {
          console.error(`Pattern_id ${patternId} could not be found in the database.`);
          reject(null);
        }
        else {
          const {Name, Username, Comments, Pattern} = queryResult[0];
          const gameBoardObject = deserialisePattern(Pattern);
          const patternObject = reserialisePattern(gameBoardObject);
          resolve({
            name: Name,
            username: Username,
            comments: Comments,
            patternObject: patternObject
          });
        }
      });
  });
  return queryResolution;
}

// This function manages connecting to the database and attempting to retrieve the requested
// game board pattern from it (behind API endpoint get_pattern).
async function getPattern(patternId : number) : Promise<PatternPackage> {
  let queryResult, connection, success = true;
  try {
    connection = await openDBConnection();
    queryResult = await getPatternQuery(connection, patternId);
    closeDBConnection(connection);
  }
  catch(error) {
    closeDBConnection(connection);
    success = false;
  }
  const result = new Promise<PatternPackage>((resolve, reject) => {
    if (success) {
      console.log(`Record with Pattern_id: ${patternId} has been retrieved from the database.`);
      resolve(queryResult);
    }
    else {
      reject(null);
    }
  });
  return result;
}

// This function queries the database by Name for catalogue entries that match a search string
// or retrieves the whole catalogue.
function getCatalogueQuery(connection, searchString : string) : Promise<CatalogueReference[]> {
  const filter = /[A-Za-z0-9 _.-]*/;
  const safeSearchString = searchString.match(filter)[0];
  let query;
  if (searchString === "") {
    query = `SELECT Pattern_id, Name FROM pattern_catalogue
             ORDER BY Name`;
  }
  else {
    query = `SELECT Pattern_id, Name FROM pattern_catalogue
             WHERE SUBSTRING(Name, 1, ${safeSearchString.length}) = "${safeSearchString}"
             ORDER BY Name`;
  }
  const queryResolution = new Promise<CatalogueReference[]>((resolve, reject) => {
    connection.query(query, (error, queryResult) => {
      if (error) {
        console.error(error);
        reject(null);
      }
      else {
        resolve(queryResult);
      }
    });
  });
  return queryResolution;
}

// This function manages connecting to the database and attempting to retrieve a catalogue of
// available game board patterns from it (behind API endpoint get_catalogue).
async function getCatalogue(searchString : string) : Promise<CatalogueReference[]> {
  let queryResult, connection, success = true;
  try {
    connection = await openDBConnection();
    queryResult = await getCatalogueQuery(connection, searchString);
    closeDBConnection(connection);
  }
  catch(error) {
    closeDBConnection(connection);
    success = false;
  }
  const result = new Promise<CatalogueReference[]>((resolve, reject) => {
    if (success) {
      console.log(`A catalogue retrieval request has been serviced for search string:\
                   ${searchString}`);
      resolve(queryResult);
    }
    else {
      reject(null);
    }
  });
  return result;
}

// This function does a recursive runtime type check of the newPattern object to see if a
// malformed object has been received.
function checkForPatternPackage(newPattern : PatternPackage) : boolean {
  const t_name = typeof(newPattern.name);
  const t_username = typeof(newPattern.username);
  const t_comments = typeof(newPattern.comments);
  const t_patternObject_boardArraySize = typeof(newPattern.patternObject.boardArraySize);
  const t_patternObject_liveCells = typeof(newPattern.patternObject.liveCells);
  if (t_name !== "string" || t_username !== "string" || t_comments !== "string" ||
      t_patternObject_boardArraySize !== "number" || t_patternObject_liveCells !== "object") {
    return false;
  }

  let liveCellsCorrect = true;
  newPattern.patternObject.liveCells.forEach(value => {
    if (typeof(value.i) !== "number" || typeof(value.j) !== "number") {
      liveCellsCorrect = false;
    }
  });
  return liveCellsCorrect;
}

// This function queries the database in order to add a new game board pattern.
function addPatternQuery(connection, newPattern : PatternPackage) : Promise<boolean> {
  const filter = /[A-Za-z0-9 _.-]*/;
  const safeName = newPattern.name.match(filter)[0];
  const safeUsername = newPattern.username.match(filter)[0];
  const safeComments = newPattern.comments.match(filter)[0];
  const patternString = convertPattern(newPattern.patternObject);
  const query = `INSERT INTO pattern_catalogue (Name, Username, Comments, Pattern)
                 VALUES ("${safeName}", "${safeUsername}", "${safeComments}",
                 "${patternString}")`;
  const queryResolution = new Promise<boolean>((resolve, reject) => { 
    if (checkForPatternPackage(newPattern) === false) {
      reject(false);
    }
    else {
      connection.query(query, error => {
        if (error) {
          console.error(error);
          reject(false);
        }
        else {
          resolve(true);
        }
      });
    } 
  });
  return queryResolution;
}

// This function manages connecting to the database and adding a new game board pattern submitted by
// the client (behind API endpoint add_pattern).
async function addPattern(newPattern : PatternPackage) : Promise<boolean> {
  let connection, queryResult, success = true;
  try {
    connection = await openDBConnection();
    queryResult = await addPatternQuery(connection, newPattern);
    closeDBConnection(connection);
  }
  catch(error) {
    closeDBConnection(connection);
    success = false;
  }
  const result = new Promise<boolean>((resolve, reject) => {
    if (success) {
      console.log("A new pattern has been added to the database.");
      resolve(queryResult);
    }
    else {
      reject(false);
    }
  });
  return result;
}

// This function queries the database in order to delete a game board pattern.
function deletePatternQuery(connection, patternId : number, username : string) : Promise<number>{
  const filter = /[A-Za-z0-9 _.-]*/;
  const safeUsername = username.match(filter)[0];
  const query = `DELETE FROM pattern_catalogue
                 WHERE Pattern_id = ${patternId} AND Username = "${safeUsername}"`;
  const queryResolution = new Promise<number>((resolve, reject) => {
    connection.query(query, (error, queryResult) => {
      if (error) {
        console.error(error);
        reject(0);
      }
      else {
        resolve(queryResult.affectedRows);
      }
    });
  });
  return queryResolution;
}

// This function manages connecting to the database and deleting a catalogue record at the
// request of an authorised user (behind API endpoint delete_pattern).
async function deletePattern(patternId : number, username : string) : Promise<boolean> {
  let connection, queryResult, success = true;
  try {
    connection = await openDBConnection();
    queryResult = await deletePatternQuery(connection, patternId, username);
    closeDBConnection(connection);
  }
  catch(error) {
    closeDBConnection(connection);
    success = false;
  }
  const result = new Promise<boolean>((resolve, reject) => {
    if (success && queryResult === 1) {
      console.log(`The database record with patternId: ${patternId} has been deleted`);
      resolve(true);
    }
    else {
      reject(false);
    }
  });
  return result;
}

function main() : void {
  const express = require("express");
  const app = express();
  const PORT = process.env.PORT || 80;
  app.use(express.json());

  app.get("/get_pattern", async function(req, res) {
    console.log("");
    const patternId = parseInt(req.query.patternId);
    if (patternId !== patternId) {
      console.error("get_pattern request received with non - numeric patternId query field.");
      res.status(404).send("The requested patternId could not be found.").end();
      return;
    }
    try {
      const result = await getPattern(patternId);
      res.status(200).send(result).end();
    }
    catch(error) {
      res.status(404).send("The requested patternId could not be found.").end();
    }   
  });

  app.get("/get_catalogue", async function(req, res) {
    console.log("");
    const searchString = req.query.searchString;
    try {
      const result = await getCatalogue(searchString);
      res.status(200).send(result).end();
    }
    catch(error) {
      res.status(404).send("There was a problem retrieving the pattern catalogue data.").end();
    }
  });

  app.post("/add_pattern", async function(req, res) {
    console.log("");
    try {
      await addPattern(req.body);
      res.status(202).send("A new pattern has been added to the database.").end();
    }
    catch(error) {
      res.status(406).send(`The add_pattern operation encountered the following error: ${error}\n`)
        .end();
    }
  });

  app.post("/delete_pattern", async function(req, res) {
    console.log("");
    const {patternId, username} = req.body;
    if (patternId !== patternId) {
      console.error("delete_pattern request received with non - numeric patternId query field.");
      res.status(406)
        .send("delete_pattern request received with non - numeric patternId query field.\n").end();
      return;
    }
    try {
      await deletePattern(patternId, username);
      res.status(202).send(`The record with Pattern_id ${patternId} has been deleted.\n`).end();
    }
    catch(error) {
      res.status(406)
        .send(`The delete_pattern operation encountered the following error: ${error}\n`).end();
    }
  });

  app.listen(PORT, () => {
    console.log(`Server waiting on port ${PORT}.`);
  });
}

main();

export {PatternPackage};

