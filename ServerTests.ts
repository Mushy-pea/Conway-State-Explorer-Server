function testAddPattern() {
  const http = require("http");
  const data = JSON.stringify({
    name: "Test pattern",
    username: "Steven",
    comments: "A pattern used to test the add_pattern API endpoint of the server, which happens to be a glider",
    patternObject: {
      boardArraySize: 3,
      liveCells: [{i: -1, j: -1}, {i: 0, j: 0}, {i: 0, j: 1}, {i: 1, j: -1}, {i: 1, j: 0}]
    }
  });

  const options = {
    hostname: "127.0.0.1",
    port: 8080,
    path: "/add_pattern",
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length
    }
  };

  const req = http.request(options, res => {
    console.log(`response status: ${res.statusCode}`);
  });

  try {
    req.write(data);
    req.end();
  }
  catch(error) {
    console.error(error);
    req.end();
  }
}

testAddPattern();
