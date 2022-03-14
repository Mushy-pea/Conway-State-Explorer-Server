import { PatternPackage } from './server';

function getRequest(url : string, filePath : string) : Promise<number> {
  const http = require("http");
  const fs = require("fs");
  const file = fs.createWriteStream(filePath);
  
  const pageRequest = new Promise<number>((resolve, reject) => {
    http.get(url, res => {
      res.pipe(file);

      res.on("end", () => {
        resolve(res.statusCode);
      });
  
      res.on("error", error => {
        console.error(error);
        reject(null);
      });
    });
  });    
  return pageRequest;
}

function postRequest(data : string, url : string) : Promise<number> {
  const http = require("http");
  const options = {
    hostname: "127.0.0.1",
    port: 8080,
    path: url,
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length
    }
  };
  let req;
  const postResolution = new Promise<number>((resolve, reject) => {
    req = http.request(options, res => {
      res.pipe(process.stdout);

      res.on("end", () => {
        resolve(res.statusCode);
      });

      res.on("error", error => {
        console.error(error);
        reject(null);
      });
    });
  });

  req.write(data);
  req.end();
  return postResolution;
}

function comparePatternPackage(result : PatternPackage, expectedResult : PatternPackage)
                              : string {
  if (result.name !== expectedResult.name) {return "result.name";}

  if (result.username !== expectedResult.username) {return "result.username";}

  if (result.comments !== expectedResult.comments) {return "result.comments";}

  if (result.patternObject.boardArraySize !== expectedResult.patternObject.boardArraySize) {
    return "result.patternObject.boardArraySize";
  }

  if (result.patternObject.liveCells.length !== expectedResult.patternObject.liveCells.length) {
    return "result.patternObject.liveCells.length";
  }
  result.patternObject.liveCells.forEach((cell, index) => {
    const expectedCell = expectedResult.patternObject.liveCells[index];
    if (cell.i !== expectedCell.i || cell.j !== expectedCell.j) {
      return `result.patternObject.liveCells[${index}]`;
    }
  });
  return "Pass";
}

function testGetPatternRecordFound(result : PatternPackage, expectedResult : PatternPackage)
                                  : boolean {
  const outcome = comparePatternPackage(result, expectedResult);
  if (outcome === "Pass") {
    console.log("testGetPatternRecordFound has passed");
    return true;
  }
  else {
    console.error(`testGetPatternRecordFound has failed on condition ${outcome}`);
    return false;
  }
}

function testGetPatternRecordNotFound(data : string) : boolean {
  if (data === "The requested patternId could not be found.") {
    console.log("testGetPatternRecordNotFound has passed");
    return true;
  }
  else {
    console.error(`testGetPatternRecordNotFound has failed on server response: ${data}`);
    return false;
  }
}

function testGetPatternInvalidId(data : string) : boolean {
  if (data === "The requested patternId could not be found.") {
    console.log("testGetPatternInvalidId has passed");
    return true;
  }
  else {
    console.error(`testGetPatternInvalidId has failed on server response: ${data}`);
    return false;
  }
}

function testGetCatalogueEmptySearchString(data : string) : boolean {
  const result = JSON.parse(data);
  let matches = 0;
  result.forEach(value => {
    if (value.Pattern_id === 938 && value.Name === "Champagne glass") {matches++;}
  });

  if (result.length !== 700) {
    console.log("testGetCatalogueEmptySearchString has failed on condition result.length");
    return false;
  }
  else if (matches !== 1) {
    console.log("testGetCatalogueEmptySearchString has failed on condition result.matches");
    return false;
  }
  else {
    console.log("testGetCatalogueEmptySearchString has passed.");
    return true;
  }
}

function testGetCatalogueWithSearchString(data : string) : boolean {
  const result = JSON.parse(data);
  let matches = 0;
  result.forEach(value => {
    if (value.Pattern_id === 314 && value.Name === "10-engine Cordership") {matches++;}
  });

  if (result.length !== 1) {
    console.log("testGetCatalogueWithSearchString has failed on condition result.length");
    return false;
  }
  else if (matches !== 1) {
    console.log("testGetCatalogueWithSearchString has failed on condition result.matches");
    return false;
  }
  else {
    console.log("testGetCatalogueWithSearchString has passed.");
    return true;
  }
}

function testGetCatalogueEmptyResult(data : string) : boolean {
  const result = JSON.parse(data);
  if (result.length === 0) {
    console.log("testGetCatalogueEmptyResult has passed");
    return true;
  }
  else {
    console.log("testGetCatalogueEmptyResult has failed on condition result.length");
    return false;
  }
}

function testAddPatternValidObject(result : PatternPackage, expectedResult : PatternPackage)
                                  : boolean {
  const outcome = comparePatternPackage(result, expectedResult);
  if (outcome === "Pass") {
    console.log("testAddPatternValidObject has passed.");
    return true;
  }
  else {
    console.error(`testAddPatternValidObject has failed on condition ${outcome}`);
    return false;
  }
}

async function main() : Promise<void> {
  let passes = 0, failures = 0;
  const fs = require("fs");
  let maxPatternId;
  try {
    maxPatternId = parseInt(fs.readFileSync("./max_pattern_id.txt", "utf8"));
  }
  catch(error) {
    console.error(`Error opening max_pattern_id.txt: ${error}`);
  }
  
  // This test checks if a get_pattern request with a valid patternId that exists in the database
  // is correctly handled by the server.
  try {
    console.log("");
    const test1_url = "http://localhost:8080/get_pattern?patternId=20";
    const test1_filePath = "./get_pattern_test1.txt";
    const statusCode = await getRequest(test1_url, test1_filePath);
    if (statusCode !== 200) {
      console.error(`testGetPatternRecordFound failed with incorrect status code: ${statusCode}`);
      failures++;
    }
    else {
      const expectedPackage = {
        name: "94P27.1",
        username: "Steven",
        comments: `Name: 94P27.1\r\nAuthor: Jason Summers\r\nThe smallest known period 27 oscillator as of April 2009. Found in August 2005.\r\nwww.conwaylife.com/wiki/index.php?title=94P27.1\r\n`,
        patternObject: {
          boardArraySize: 17,
          liveCells: [
            {"i":-16,"j":-11},{"i":-16,"j":-10},{"i":-15,"j":-11},{"i":-15,"j":-10},{"i":-14,"j":1},
            {"i":-13,"j":-13},{"i":-13,"j":-12},{"i":-13,"j":-11},{"i":-13,"j":-10},{"i":-13,"j":-9},
            {"i":-13,"j":-8},{"i":-13,"j":-1},{"i":-13,"j":2},{"i":-12,"j":-14},{"i":-12,"j":-8},
            {"i":-12,"j":3},{"i":-11,"j":-13},{"i":-11,"j":-9},{"i":-11,"j":-2},{"i":-11,"j":3},
            {"i":-11,"j":8},{"i":-11,"j":9},{"i":-10,"j":-16},{"i":-10,"j":-15},{"i":-10,"j":-14},
            {"i":-10,"j":4},{"i":-10,"j":8},{"i":-10,"j":10},{"i":-9,"j":-16},{"i":-9,"j":-13},
            {"i":-9,"j":-12},{"i":-9,"j":-11},{"i":-9,"j":-10},{"i":-9,"j":-9},{"i":-9,"j":-1},
            {"i":-9,"j":3},{"i":-9,"j":10},{"i":-9,"j":13},{"i":-9,"j":14},{"i":-8,"j":-13},
            {"i":-8,"j":-9},{"i":-8,"j":1},{"i":-8,"j":2},{"i":-8,"j":9},{"i":-8,"j":10},
            {"i":-8,"j":12},{"i":-8,"j":14},{"i":-7,"j":-15},{"i":-7,"j":-13},{"i":-7,"j":-11},
            {"i":-7,"j":-10},{"i":-7,"j":-3},{"i":-7,"j":-2},{"i":-7,"j":8},{"i":-7,"j":12},
            {"i":-6,"j":-15},{"i":-6,"j":-14},{"i":-6,"j":-11},{"i":-6,"j":-4},{"i":-6,"j":0},
            {"i":-6,"j":8},{"i":-6,"j":9},{"i":-6,"j":10},{"i":-6,"j":11},{"i":-6,"j":12},
            {"i":-6,"j":15},{"i":-5,"j":-11},{"i":-5,"j":-9},{"i":-5,"j":-5},{"i":-5,"j":13},
            {"i":-5,"j":14},{"i":-5,"j":15},{"i":-4,"j":-10},{"i":-4,"j":-9},{"i":-4,"j":-4},
            {"i":-4,"j":1},{"i":-4,"j":8},{"i":-4,"j":12},{"i":-3,"j":-4},{"i":-3,"j":7},
            {"i":-3,"j":13},{"i":-2,"j":-3},{"i":-2,"j":0},{"i":-2,"j":7},{"i":-2,"j":8},
            {"i":-2,"j":9},{"i":-2,"j":10},{"i":-2,"j":11},{"i":-2,"j":12},{"i":-1,"j":-2},
            {"i":0,"j":9},{"i":0,"j":10},{"i":1,"j":9},{"i":1,"j":10}
          ]
        }
      };
      const actualPackage = JSON.parse(fs.readFileSync(test1_filePath, "utf8"));
      const result = testGetPatternRecordFound(actualPackage, expectedPackage);
      if (result) {passes++;}
      else {failures++;}
    }
  }
  catch(error) {
    console.error(`testGetPatternRecordFound failed with a generic error: ${error}`);
    failures++;
  }

  // This test checks if a get_pattern request with a valid patternId that doesn't exist in the
  // database is correctly handled by the server.
  try {
    console.log("");
    const test2_url = "http://localhost:8080/get_pattern?patternId=67";
    const test2_filePath = "./get_pattern_test2.txt";
    const statusCode = await getRequest(test2_url, test2_filePath);
    if (statusCode !== 404) {
      console.error(`testGetPatternRecordNotFound failed with incorrect \
                     status code: ${statusCode}`);
      failures++;
    }
    else {
      const data = fs.readFileSync(test2_filePath, "utf8");
      const result = testGetPatternRecordNotFound(data);
      if (result) {passes++;}
      else {failures++;}
    }
  }
  catch(error) {
    console.error(`testGetPatternRecordNotFound failed with a generic error: ${error}`);
    failures++;
  }

  // This test checks if a get_pattern request with an invalid (non - numeric) patternId is
  // correctly handled by the server.
  try {
    console.log("");
    const test3_url = "http://localhost:8080/get_pattern?patternId=grrr";
    const test3_filePath = "./get_pattern_test3.txt";
    const statusCode = await getRequest(test3_url, test3_filePath);
    if (statusCode !== 404) {
      console.error(`testGetPatternInvalidId failed with incorrect status code: ${statusCode}`);
      failures++;
    }
    else {
      const data = fs.readFileSync(test3_filePath, "utf8");
      const result = testGetPatternInvalidId(data);
      if (result) {passes++;}
      else {failures++;}
    }
  }
  catch(error) {
    console.error(`testGetPatternInvalidId failed with a generic error: ${error}`);
    failures++;
  }

  // This test checks if a get_catalogue request with an empty searchString is correctly
  // handled by the server.
  try {
    console.log("");
    const test1_url = "http://localhost:8080/get_catalogue?searchString=";
    const test1_filePath = "./get_catalogue_test1.txt";
    const statusCode = await getRequest(test1_url, test1_filePath);
    if (statusCode !== 200) {
      console.error(`testGetCatalogueEmptySearchString failed with incorrect \
                     status code: ${statusCode}`);
      failures++;
    }
    else {
      const data = fs.readFileSync(test1_filePath, "utf8");
      const result = testGetCatalogueEmptySearchString(data);
      if (result) {passes++;}
      else {failures++;}
    }
  }
  catch(error) {
    console.error(`testGetCatalogueEmptySearchString failed with a generic error: ${error}`);
    failures++;
  }

  // This test checks if a get_catalogue request with a specific non - empty searchString
  // is correctly handled by the server.
  try {
    console.log("");
    const test2_url = "http://localhost:8080/get_catalogue?searchString=10-engine\ Cordership";
    const test2_filePath = "./get_catalogue_test2.txt";
    const statusCode = await getRequest(test2_url, test2_filePath);
    if (statusCode !== 200) {
      console.error(`testGetCatalogueWithSearchString failed with incorrect \
                     status code: ${statusCode}`);
      failures++;
    }
    else {
      const data = fs.readFileSync(test2_filePath, "utf8");
      const result = testGetCatalogueWithSearchString(data);
      if (result) {passes++;}
      else {failures++;}
    }
  }
  catch(error) {
    console.error(`testGetCatalogueWithSearchString failed with a generic error: ${error}`);
    failures++;
  }

  // This test checks if a get_catalogue request with a searchString that should return no
  // results is correctly handled by the server.
  try {
    console.log("");
    const test3_url = "http://localhost:8080/get_catalogue?searchString=Extra";
    const test3_filePath = "./get_catalogue_test3.txt";
    const statusCode = await getRequest(test3_url, test3_filePath);
    if (statusCode !== 200) {
      console.error(`testGetCatalogueEmptyResult has failed with incorrect \
                     status code: ${statusCode}`);
      failures++;
    }
    else {
      const data = fs.readFileSync(test3_filePath, "utf8");
      const result = testGetCatalogueEmptyResult(data);
      if (result) {passes++;}
      else {failures++;}
    }
  }
  catch(error) {
    console.error(`testGetCatalogueEmptyResult failed with a generic error: ${error}`);
    failures++;
  }

  // This test checks if an add_pattern request with a valid PatternPackage object is correctly
  // handled by the server.
  try {
    console.log("");
    const test1_url = "/add_pattern";
    const patternPackage = {
      name: "Test pattern",
      username: "Steven",
      comments: "A pattern used to test the add_pattern API endpoint of the server.",
      patternObject: {
        boardArraySize: 3,
        liveCells: [{i: -1, j: -1}, {i: 0, j: 0}, {i: 0, j: 1}, {i: 1, j: -1}, {i: 1, j: 0}]
      }
    };
    const data = JSON.stringify(patternPackage);
    const statusCode = await postRequest(data, test1_url);
    if (statusCode !== 202) {
      console.error(`testAddPatternValidObject failed with incorrect status code ${statusCode}`);
      failures++;
    }
    else {
      await getRequest(`http://localhost:8080/get_pattern?patternId=${maxPatternId + 1}`,
                       "add_pattern_test1.txt");
      const actualPackage = JSON.parse(fs.readFileSync("add_pattern_test1.txt", "utf8"));
      const result = testAddPatternValidObject(actualPackage, patternPackage);
      if (result) {
        passes++;
        fs.writeFileSync("./max_pattern_id.txt", `${maxPatternId + 1}`);
      }
      else {failures++;}
    }
  }
  catch(error) {
    console.error(`testAddPatternValidObject failed with a generic error: ${error}`);
    failures++;
  }

  // This test checks if an add_pattern request with a invalid PatternPackage object is correctly
  // handled by the server.
  try {
    console.log("");
    const test2_url = "/add_pattern";
    const patternPackage = {
      name: "Test pattern",
      username: "Steven",
      comments: "A pattern used to test the add_pattern API endpoint of the server.",
      patternObject: {
        boardArraySize: 3,
        liveCells: [{i: -1, j: -1}, {i: 0, j: 0}, {i: "blah", j: 1}, {i: 1, j: -1}, {i: 1, j: 0}]
      }
    };
    const data = JSON.stringify(patternPackage);
    const statusCode = await postRequest(data, test2_url);
    if (statusCode !== 406) {
      console.error(`testAddPatternInvalidObject failed with incorrect status code ${statusCode}`);
      failures++;
    }
    else {
      console.log("testAddPatternInvalidObject has passed.");
      passes++;
    }
  }
  catch(error) {
    console.error(`testAddPatternInvalidObject failed with a generic error: ${error}`);
    failures++;
  }

  // This test checks if a delete_pattern request with a valid combination of patternId and username
  // is correctly handled by the server.
  try {
    console.log("");
    const test1_url = "/delete_pattern";
    const test2_url = `http://localhost:8080/get_pattern?patternId=${maxPatternId + 1}`;
    const deleteRequest = {
      patternId: maxPatternId + 1,
      username: "Steven"
    };
    const data = JSON.stringify(deleteRequest);
    const statusCode = await postRequest(data, test1_url);
    if (statusCode !== 202) {
      console.error(`testDeletePatternValidRequest failed with incorrect \
                     status code ${statusCode}`);
      failures++;
    }
    else {
      const statusCode = await getRequest(test2_url, "delete_pattern_test1.txt");
      if (statusCode !== 404) {
        console.error(`testDeletePatternValidRequest has failed with incorrect \
                       status code ${statusCode}`);
        failures++;
      }
      else {
        console.log("testDeletePatternValidRequest has passed.");
        passes++;
      }
    }
  }
  catch(error) {
    console.error(`testDeletePatternValidRequest has failed with a generic error: ${error}`);
  }

  // This test checks if a delete_pattern request with an invalid combination of patternId
  // and username is correctly handled by the server.
  try {
    console.log("");
    const test3_url = "/delete_pattern";
    const deleteRequest = {
      patternId: 1816,
      username: "blah"
    };
    const data = JSON.stringify(deleteRequest);
    const statusCode = await postRequest(data, test3_url);
    if (statusCode !== 406) {
      console.error(`testDeletePatternInvalidRequest failed with incorrect \
                     statusCode ${statusCode}`);
      failures++;
    }
    else {
      console.log("testDeletePatternInvalidRequest has passed.");
      passes++;
    }
  }
  catch(error) {
    console.error(`testDeletePatternInvalidRequest has failed with a generic error: ${error}`);
  }

  console.log(`Test results -> Passed: ${passes} Failed: ${failures}`);
}

main();
