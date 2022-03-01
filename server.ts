import { resetBoardArray, BoardCell, boardCell, getCellState, setCellState, cellUpdaterFunctions1 }
from './GameLogicTypes';

function deserialisePattern(pattern : string)
         : {gameBoard: BoardCell[], min : number, max : number} {
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

function reserialisePattern(gameBoardObject : {gameBoard: BoardCell[], min : number, max : number})
         : string {
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
  return JSON.stringify(patternObject);
}

function servePattern() {
  const fs = require("fs");
  let password = "";
  try {
    password = fs.readFileSync("./db_password.txt");
  }
  catch(error) {
    console.error(`db_password.txt could not be opened.`);
    return null;
  }

  const mysql = require("mysql");
  const connection = mysql.createConnection({
    host: "localhost",
    user: "Steven",
    password: password,
    database: "gol_pattern_catalogue"
  });

  connection.connect(error => {
    if (error) {
      console.error(error);
    }
    else {
      console.log("Successfully connected to the database.");
    }
  });

  const sql = `SELECT Pattern FROM pattern_catalogue
               WHERE Pattern_id = 20`;
  let queryResult;
  connection.query(sql, (error, result) => {
    if (error) {
      console.error(error);
    }
    else {
      queryResult = result[0].Pattern;
      console.log(`queryResult:\n${queryResult}`);
      const gameBoard = deserialisePattern(queryResult);
      const patternObject = reserialisePattern(gameBoard);
      console.log(patternObject);
    }
  });

  connection.end(error => {
    if (error) {
      console.error(error);
    }
    else {
      console.log("The database connection has been closed.");
    }
  });
}

servePattern();
