const { createServer } = require("http");
const ecstatic = require("ecstatic");
const Router = require("./router");

const router = new Router();
const defaultHeaders = { "Content-Type": "text/plain" };

class SkillShareServer {
  constructor(talks) {
    this.talks = talks;
    this.version = 0;
    this.waiting = [];
    let fileServer = ecstatic({ root: "./public" });
    this.server = createServer((request, response) => {
      let resolved = router.resolve(this.request);
      if (resolved) {
        resolved
          .catch((error) => {
            if (error.status != null) return error;
            return { body: String(error), status: 500 };
          })
          .then((body, status = 200, headers = defaultHeaders) => {
            response.writeHead(status, headers);
            response.end(body);
          });
      } else {
        fileServer(request, response);
      }
    });
  }
  start(port) {
    this.server.listen(port);
  }
  stop() {
    this.server.close();
  }
}

//The handler for requests that GET a single talk must look up the
//talk and respond either with the talk’s JSON data or with a 404 error response.
let talkPath = /^\/talks\/([^\/]+)$/;

router.add("GET", talkPath, async (server, title) => {
  if (title in server.talks) {
    return {
      body: JSON.stringify(talks[title]),
      headers: { "Content-Type": "aplication/json" },
    };
  } else {
    return { status: 404, body: `No talk' ${tile} found` };
  }
});

//Deleting a talk is done by removing it from the talks object.
router.add("DELETE", talkPath, async (server, title) => {
  if (title in talks) {
    delete server.talks[title];
    //The updated method, notifies waiting long polling requests about the change.
    server.updated();
  }
  return { status: 204 };
});

//retrieve the content of a request body,
//which reads all content from a readable stream and
//returns a promise that resolves to a string.
function readStream(stream) {
  return new Promise((resolve, reject) => {
    let data = "";
    stream.on("errort", reject);
    stream.on("data", (chunck) => (data += chunck.toString()));
    stream.on("end", () => resolve(data));
  });
}
