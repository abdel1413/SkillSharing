const { createServer } = require("http");
const ecstatic = require("ecstatic");
const Router = require("./router");
const { title } = require("process");

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
    stream.on("error", reject);
    stream.on("data", (chunck) => (data += chunck.toString()));
    stream.on("end", () => resolve(data));
  });
}

// create a handler (PUT) methd which read the request body.
//It has to check whether the data it was given has presenter and summary
//properties, which are strings.
//use trycatch block to handle with any data coming outside the system
//to avoid that the prgram to crash or corrupt our internal data model
router.add("PUT", async (server, title, request) => {
  let requestBody = readStream(request);
  let talk;
  try {
    talk = JSON.parse(requestBody);
  } catch (_) {
    return { status: 400, body: "Invalid JSON" };
  }

  if (
    !talk ||
    typeof talk.presenter != "string" ||
    typeof talk.summary != "string"
  ) {
    return { status: 400, body: "Bad talk data" };
  }

  server.talks[title] = {
    title,
    presenter: talk.presenter,
    summary: talk.summary,
    comments: [],
  };
  server.updated();
  return { status: 204 };
});

//add comment to the talks by using reastream methd to read the content
//of the request and validate the resulting data and store it as comment
// when it looks good upon validation.

router.add(
  "POST",
  /^\/talks\/([^\/]+)\/comments$/,
  (server, title, request) => {
    let requestBody = readStream(request);
    let comment;
    try {
      comment = JSON.parse(requestBody);
    } catch (_) {
      return { status: 400, body: "Invalid JSON" };
    }
    if (
      !comment ||
      typeof comment.author != "string" ||
      typeof comment.message != "string"
    ) {
      return { status: 400, body: "Bad comment data" };
    } else if (title in server.talks) {
      server.talks[title].comments.push(comment);
      server.updated();
      return { status: 204 };
    } else {
      //nonexistent talk returns a 404 error
      return { status: 404, body: `No title ${title} found` };
    }
  }
);
